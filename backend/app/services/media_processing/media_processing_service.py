import asyncio
import logging
import os
import uuid
from dataclasses import dataclass
from typing import Dict, Optional, Callable

from app.services.timeline_generator import Timeline

logger = logging.getLogger(__name__)


def _time_to_seconds(timestr: str) -> float:
    h, m, s = timestr.split(':')
    return int(h) * 3600 + int(m) * 60 + float(s)


@dataclass
class RenderJob:
    project_id: str
    timeline: Timeline
    media_files: Dict[str, str]
    future: asyncio.Future
    progress_cb: Optional[Callable[[int], None]] = None


class MediaProcessingService:
    """Assemble videos from timelines using FFmpeg with a queued renderer."""

    def __init__(self) -> None:
        self.queue: asyncio.Queue[Optional[RenderJob]] = asyncio.Queue()
        self._worker: Optional[asyncio.Task] = None

    async def start(self) -> None:
        if self._worker is None or self._worker.done():
            self._worker = asyncio.create_task(self._process_queue())

    async def stop(self) -> None:
        await self.queue.put(None)
        if self._worker:
            await self._worker
            self._worker = None

    async def enqueue_render(
        self,
        project_id: str,
        timeline: Timeline,
        media_files: Dict[str, str],
        progress_cb: Optional[Callable[[int], None]] = None,
    ) -> str:
        await self.start()
        future: asyncio.Future = asyncio.get_event_loop().create_future()
        await self.queue.put(RenderJob(project_id, timeline, media_files, future, progress_cb))
        return await future

    async def _process_queue(self) -> None:
        while True:
            job = await self.queue.get()
            if job is None:
                break
            try:
                result = await self.assemble_video(job.timeline, job.media_files, job.progress_cb)
                job.future.set_result(result)
            except Exception as exc:  # pragma: no cover - best effort
                logger.error(f"Rendering failed: {exc}")
                job.future.set_exception(exc)
            self.queue.task_done()

    async def assemble_video(
        self,
        timeline: Timeline,
        media_files: Dict[str, str],
        progress_cb: Optional[Callable[[int], None]] = None,
    ) -> str:
        """Render video using FFmpeg based on the provided timeline."""

        filter_complex = self._build_filter_graph(timeline)
        output_path = os.path.abspath(f"render_{uuid.uuid4().hex}.mp4")
        cmd = self._build_ffmpeg_command(timeline, filter_complex, media_files, output_path)
        logger.info("Starting FFmpeg render")
        process = await asyncio.create_subprocess_shell(
            cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        duration = self._timeline_duration(timeline)
        while True:
            line = await process.stderr.readline()
            if not line:
                break
            if progress_cb:
                percent = self._parse_progress(line.decode(), duration)
                if percent is not None:
                    progress_cb(percent)
        await process.wait()
        return output_path

    def _timeline_duration(self, timeline: Timeline) -> float:
        return max((c.timeline_start + c.duration for c in timeline.clips), default=0.0)

    def _parse_progress(self, line: str, total: float) -> Optional[int]:
        if 'time=' not in line:
            return None
        try:
            ts = line.split('time=')[1].split()[0]
            seconds = _time_to_seconds(ts)
            if total:
                return min(100, int(seconds / total * 100))
        except Exception:  # pragma: no cover - best effort
            return None
        return None

    def _build_filter_graph(self, timeline: Timeline) -> str:
        filters = []
        video_labels = []
        audio_labels = []
        for idx, clip in enumerate(timeline.clips):
            filters.append(
                f"[{idx}:v]trim=start={clip.media_start}:end={clip.media_end},setpts=PTS-STARTPTS+{clip.timeline_start}/TB[v{idx}]"
            )
            filters.append(
                f"[{idx}:a]atrim=start={clip.media_start}:end={clip.media_end},asetpts=PTS-STARTPTS[a{idx}]"
            )
            video_labels.append(f"[v{idx}]")
            audio_labels.append(f"[a{idx}]")

        filters.append(''.join(video_labels) + f"concat=n={len(video_labels)}:v=1:a=0[vout]")
        amix = f"{' '.join(audio_labels)}amix=inputs={len(audio_labels)}[mixed]"
        filters.append(amix)
        filters.append("[mixed]loudnorm=I=-23:TP=-2:LRA=7[mixednorm]")

        for i, adj in enumerate(timeline.audio_ducking):
            vol = 10 ** (adj.level / 20)
            filters.append(
                f"[mixednorm]volume=enable='between(t,{adj.start},{adj.end})':volume={vol}[mixednorm]"
            )

        filters.append("[vout][mixednorm]concat=n=1:v=1:a=1[outv][outa]")
        return ';'.join(filters)

    def _build_ffmpeg_command(
        self,
        timeline: Timeline,
        filter_complex: str,
        media_files: Dict[str, str],
        output_path: str,
    ) -> str:
        inputs = ' '.join(f"-i {media_files[c.media_id]}" for c in timeline.clips)
        return f"ffmpeg -y {inputs} -filter_complex \"{filter_complex}\" -map [outv] -map [outa] {output_path}"


media_processing_service = MediaProcessingService()
