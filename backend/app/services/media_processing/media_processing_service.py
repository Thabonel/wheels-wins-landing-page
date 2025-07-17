import asyncio
import json
import logging
import os
import subprocess
import uuid
from dataclasses import dataclass
from typing import Dict, Optional, Callable, Any, List

from app.core.config import settings

from app.services.timeline_generator import Timeline

logger = logging.getLogger(__name__)


class ProjectStateManager:
    """Simple JSON-based project state persistence."""

    def __init__(self, path: str = "project_state.json") -> None:
        self.path = path

    def load(self) -> Dict[str, Any]:
        if os.path.exists(self.path):
            try:
                with open(self.path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                logger.warning("Failed to load project state; starting fresh")
        return {}

    def save(self, data: Dict[str, Any]) -> None:
        try:
            with open(self.path, "w", encoding="utf-8") as f:
                json.dump(data, f)
        except Exception as exc:  # pragma: no cover - best effort
            logger.error(f"Failed to save project state: {exc}")

    def override(self, data: Dict[str, Any]) -> None:
        """Manually override project state."""
        self.save(data)


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

    def __init__(self, max_workers: int = 1) -> None:
        self.queue: asyncio.Queue[Optional[RenderJob]] = asyncio.Queue()
        self.max_workers = max_workers
        self._workers: List[asyncio.Task] = []
        self.state = ProjectStateManager()
        self.project_state: Dict[str, Any] = self.state.load()

    def resume_last(self) -> Optional[Dict[str, Any]]:
        """Return last saved project state, if any."""
        return self.project_state or None

    def manual_override(self, data: Dict[str, Any]) -> None:
        """Manually override saved state."""
        self.state.override(data)
        self.project_state = data

    async def start(self) -> None:
        active = [w for w in self._workers if not w.done()]
        self._workers = active
        for _ in range(self.max_workers - len(self._workers)):
            self._workers.append(asyncio.create_task(self._process_queue()))

    async def stop(self) -> None:
        for _ in self._workers:
            await self.queue.put(None)
        for worker in self._workers:
            await worker
        self._workers = []

    async def enqueue_render(
        self,
        project_id: str,
        timeline: Timeline,
        media_files: Dict[str, str],
        progress_cb: Optional[Callable[[int], None]] = None,
    ) -> str:
        # Validate media files before queueing
        for media_id, path in media_files.items():
            if not os.path.exists(path):
                raise FileNotFoundError(f"Media file missing: {path}")
            if not self._validate_media_format(path):
                raise ValueError(f"Unsupported media format: {path}")

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
                result = await self.assemble_video(job.timeline, job.media_files, job.progress_cb, project_id=job.project_id)
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
        *,
        project_id: str = "default",
    ) -> str:
        """Render video using FFmpeg based on the provided timeline."""
        filter_complex = self._build_filter_graph(timeline)
        output_path = os.path.abspath(f"render_{uuid.uuid4().hex}.mp4")
        cmd = self._build_ffmpeg_command(timeline, filter_complex, media_files, output_path)

        logger.info("Starting FFmpeg render")
        self._save_progress(project_id, {"status": "started", "output": output_path})
        try:
            process = await asyncio.create_subprocess_shell(
                cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
        except FileNotFoundError as exc:
            self._save_progress(project_id, {"status": "error", "message": str(exc)})
            raise

        duration = self._timeline_duration(timeline)
        while True:
            line = await process.stderr.readline()
            if not line:
                break
            if progress_cb:
                percent = self._parse_progress(line.decode(), duration)
                if percent is not None:
                    progress_cb(percent)
                    self._save_progress(project_id, {"status": "processing", "progress": percent})
        await process.wait()
        if process.returncode != 0:
            self._save_progress(project_id, {"status": "failed"})
            stderr = await process.stderr.read()
            raise RuntimeError(f"FFmpeg failed: {stderr.decode()}")

        self._save_progress(project_id, {"status": "completed", "output": output_path})
        asyncio.create_task(self._cleanup_file(output_path))
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
        return (
            f"ffmpeg -v warning -stats -y {inputs} "
            f"-filter_complex \"{filter_complex}\" -map [outv] -map [outa] {output_path}"
        )

    def _validate_media_format(self, path: str) -> bool:
        allowed = {'.mp4', '.mov', '.mp3', '.wav'}
        ext = os.path.splitext(path)[1].lower()
        if ext not in allowed:
            return False
        try:
            result = subprocess.run(['ffprobe', '-v', 'error', path], capture_output=True)
            return result.returncode == 0
        except Exception:
            return False

    def _save_progress(self, project_id: str, data: Dict[str, Any]) -> None:
        self.project_state[project_id] = data
        self.state.save(self.project_state)

    async def _cleanup_file(self, path: str) -> None:
        """Remove temporary output files asynchronously."""
        try:
            await asyncio.sleep(300)
            if os.path.exists(path):
                os.remove(path)
        except Exception:
            logger.warning(f"Failed to delete temp file {path}")


media_processing_service = MediaProcessingService(
    max_workers=getattr(settings, "MAX_RENDER_WORKERS", 1)
)
