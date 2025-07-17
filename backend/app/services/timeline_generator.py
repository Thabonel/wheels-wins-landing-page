from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

from pydantic import BaseModel

from app.services.script_analysis.openai_script_analyzer import ScriptAnalysis
from app.services.content_matching.content_matcher import MediaMatch


@dataclass
class MediaFile:
    """Simple media file representation used for timeline assembly."""

    file_id: str
    duration: float
    path: Optional[str] = None


class AudioAdjustment(BaseModel):
    start: float
    end: float
    level: float


class TimelineClip(BaseModel):
    track_id: int
    media_id: str
    timeline_start: float
    media_start: float
    media_end: float
    duration: float


class Timeline(BaseModel):
    clips: List[TimelineClip] = []
    audio_ducking: List[AudioAdjustment] = []


class TimelineGenerator:
    """Generate editing timelines from script analysis and media matches."""

    def __init__(self) -> None:
        self._broll_index = 0

    def _get_track_for_type(self, segment_type: str) -> int:
        return {
            "vo": 1,
            "soundbite": 2,
            "broll": 3,
            "music": 4,
        }.get(segment_type, 0)

    def _add_broll_overlay(
        self,
        timeline: Timeline,
        current_time: float,
        duration: float,
        broll_matches: List[MediaMatch],
    ) -> None:
        if self._broll_index >= len(broll_matches):
            return
        match = broll_matches[self._broll_index]
        self._broll_index += 1
        clip = TimelineClip(
            track_id=self._get_track_for_type("broll"),
            media_id=match.media_file_id,
            timeline_start=current_time,
            media_start=match.start_time,
            media_end=match.end_time,
            duration=min(duration, match.end_time - match.start_time),
        )
        timeline.clips.append(clip)

    def _add_music_track(self, timeline: Timeline, start: float, end: float) -> None:
        clip = TimelineClip(
            track_id=self._get_track_for_type("music"),
            media_id="background_music",
            timeline_start=start,
            media_start=0.0,
            media_end=end,
            duration=end - start,
        )
        timeline.clips.append(clip)

    def generate_timeline(
        self,
        script: ScriptAnalysis,
        matches: List[MediaMatch],
        media_files: Dict[str, MediaFile],
    ) -> Timeline:
        timeline = Timeline()
        current_time = 0.0

        match_by_id = {m.segment_id: m for m in matches}
        broll_matches = [
            m for m in matches
            if script.segments[int(m.segment_id)].type == "broll"
        ]

        for idx, segment in enumerate(script.segments):
            match = match_by_id.get(str(idx))
            if match is not None:
                clip = TimelineClip(
                    track_id=self._get_track_for_type(segment.type),
                    media_id=match.media_file_id,
                    timeline_start=current_time,
                    media_start=match.start_time,
                    media_end=match.end_time,
                    duration=match.end_time - match.start_time,
                )
                timeline.clips.append(clip)

            if segment.type == "vo":
                self._add_broll_overlay(timeline, current_time, segment.duration, broll_matches)
                timeline.audio_ducking.append(
                    AudioAdjustment(
                        start=current_time,
                        end=current_time + segment.duration,
                        level=-12.0,
                    )
                )
            elif segment.type == "soundbite":
                timeline.audio_ducking.append(
                    AudioAdjustment(
                        start=current_time,
                        end=current_time + segment.duration,
                        level=-6.0,
                    )
                )

            current_time += segment.duration

        self._add_music_track(timeline, 0.0, current_time)
        return timeline
