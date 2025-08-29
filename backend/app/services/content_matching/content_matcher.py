from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List, Optional

from pydantic import BaseModel

from app.services.script_analysis.openai_script_analyzer import ScriptAnalysis


@dataclass
class MatchResult:
    file_id: str
    start_time: float
    end_time: float
    score: float


class MediaMatch(BaseModel):
    segment_id: str
    media_file_id: str
    start_time: float
    end_time: float
    confidence: float


class TranscribedSegment(BaseModel):
    text: str
    start: float
    end: float
    speaker: Optional[str] = None


class TranscribedMedia(BaseModel):
    file_id: str
    filename: Optional[str] = None
    segments: List[TranscribedSegment]


class ContentMatcher:
    """Match script segments to transcribed media."""

    @staticmethod
    def _normalize(text: str) -> str:
        return re.sub(r"\W+", " ", text).lower().strip()

    @staticmethod
    def _levenshtein(a: str, b: str) -> int:
        if a == b:
            return 0
        if not a:
            return len(b)
        if not b:
            return len(a)
        prev_row = list(range(len(b) + 1))
        for i, ca in enumerate(a, 1):
            row = [i]
            for j, cb in enumerate(b, 1):
                insertions = prev_row[j] + 1
                deletions = row[j - 1] + 1
                substitutions = prev_row[j - 1] + (ca != cb)
                row.append(min(insertions, deletions, substitutions))
            prev_row = row
        return prev_row[-1]

    def _similarity(self, a: str, b: str) -> float:
        a_norm = self._normalize(a)
        b_norm = self._normalize(b)
        dist = self._levenshtein(a_norm, b_norm)
        max_len = max(len(a_norm), len(b_norm)) or 1
        return 1 - dist / max_len

    def _find_best_quote_match(
        self,
        quote: str,
        media_files: List[TranscribedMedia],
        threshold: float = 0.85,
        speaker: Optional[str] = None,
    ) -> Optional[MatchResult]:
        best: Optional[MatchResult] = None
        best_score = threshold
        for media in media_files:
            for seg in media.segments:
                if speaker and seg.speaker and seg.speaker.lower() != speaker.lower():
                    continue
                score = self._similarity(quote, seg.text)
                if score >= best_score:
                    best = MatchResult(
                        file_id=media.file_id,
                        start_time=seg.start,
                        end_time=seg.end,
                        score=score,
                    )
                    best_score = score
        return best

    def _match_by_keywords(
        self,
        keywords: List[str],
        media_files: List[TranscribedMedia],
        segment_id: str,
    ) -> List[MediaMatch]:
        matches: List[MediaMatch] = []
        if not keywords:
            return matches
        for media in media_files:
            name = (media.filename or "").lower()
            hits = sum(1 for k in keywords if k.lower() in name)
            if hits:
                score = hits / len(keywords)
                matches.append(
                    MediaMatch(
                        segment_id=segment_id,
                        media_file_id=media.file_id,
                        start_time=0.0,
                        end_time=0.0,
                        confidence=score,
                    )
                )
        return matches

    async def match_content_to_script(
        self,
        script: ScriptAnalysis,
        media_files: List[TranscribedMedia],
    ) -> List[MediaMatch]:
        matches: List[MediaMatch] = []
        for idx, segment in enumerate(script.segments):
            seg_id = str(idx)
            if segment.type == "soundbite" and segment.quote:
                match = self._find_best_quote_match(
                    segment.quote,
                    media_files,
                    threshold=0.85,
                    speaker=segment.speaker,
                )
                if match:
                    matches.append(
                        MediaMatch(
                            segment_id=seg_id,
                            media_file_id=match.file_id,
                            start_time=match.start_time,
                            end_time=match.end_time,
                            confidence=match.score,
                        )
                    )
            elif segment.type == "broll":
                matches.extend(
                    self._match_by_keywords(
                        segment.keywords or [],
                        media_files,
                        seg_id,
                    )
                )
        return matches
