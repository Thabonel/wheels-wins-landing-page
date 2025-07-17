import pytest
from app.services.content_matching import ContentMatcher, TranscribedMedia, TranscribedSegment
from app.services.script_analysis.openai_script_analyzer import ScriptAnalysis, ScriptSegment


@pytest.mark.asyncio
async def test_match_soundbite():
    matcher = ContentMatcher()
    script = ScriptAnalysis(
        segments=[ScriptSegment(type="soundbite", speaker="John", quote="we will win", duration=3)],
        totalDuration=3,
    )
    media = [
        TranscribedMedia(
            file_id="f1",
            filename="john.mp4",
            segments=[TranscribedSegment(text="We will win", start=0.0, end=1.0, speaker="John")],
        )
    ]
    matches = await matcher.match_content_to_script(script, media)
    assert len(matches) == 1
    match = matches[0]
    assert match.segment_id == "0"
    assert match.media_file_id == "f1"
    assert match.start_time == 0.0


@pytest.mark.asyncio
async def test_match_broll_by_keywords():
    matcher = ContentMatcher()
    script = ScriptAnalysis(
        segments=[ScriptSegment(type="broll", keywords=["beach"], duration=4)],
        totalDuration=4,
    )
    media = [TranscribedMedia(file_id="b1", filename="sunny_beach.mp4", segments=[])]
    matches = await matcher.match_content_to_script(script, media)
    assert len(matches) == 1
    assert matches[0].media_file_id == "b1"

