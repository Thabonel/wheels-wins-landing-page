import asyncio
import json
import subprocess
import sys
import time
from pathlib import Path

import pytest

# Ensure backend package is importable
backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

import os
os.environ.setdefault("SECRET_KEY", "test")
os.environ.setdefault("SUPABASE_KEY", "test")

from app.services.media_processing.media_processing_service import MediaProcessingService
from app.services.timeline_generator import Timeline, TimelineClip


@pytest.mark.asyncio
async def test_media_processing_e2e(tmp_path):
    # Generate two short sample videos with different audio and formats
    clip1 = tmp_path / "clip1.mp4"
    clip2 = tmp_path / "clip2.mov"

    cmd1 = [
        "ffmpeg",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "testsrc=size=3840x2160:rate=30:duration=1",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=1000:duration=1",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        str(clip1),
    ]
    subprocess.run(cmd1, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    cmd2 = [
        "ffmpeg",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "testsrc=size=3840x2160:rate=30:duration=1",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=500:duration=1",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        str(clip2),
    ]
    subprocess.run(cmd2, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    timeline = Timeline(
        clips=[
            TimelineClip(
                track_id=1,
                media_id="c1",
                timeline_start=0.0,
                media_start=0.0,
                media_end=1.0,
                duration=1.0,
            ),
            TimelineClip(
                track_id=1,
                media_id="c2",
                timeline_start=1.0,
                media_start=0.0,
                media_end=1.0,
                duration=1.0,
            ),
        ]
    )

    service = MediaProcessingService(max_workers=2)
    await service.start()

    start = time.time()
    output_path = await service.enqueue_render(
        "proj1",
        timeline,
        {"c1": str(clip1), "c2": str(clip2)},
    )
    duration = time.time() - start
    await service.stop()

    assert Path(output_path).exists()
    assert duration < 300

    # Verify basic video properties
    probe = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height",
            "-of",
            "json",
            output_path,
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    info = json.loads(probe.stdout)
    width = info["streams"][0]["width"]
    height = info["streams"][0]["height"]
    assert width == 3840
    assert height == 2160

    # Check integrated loudness is around -23 LUFS
    result = subprocess.run(
        [
            "ffmpeg",
            "-i",
            output_path,
            "-af",
            "ebur128=peak=true",
            "-f",
            "null",
            "-",
        ],
        capture_output=True,
        text=True,
    )
    loudness = None
    for line in result.stderr.splitlines():
        if "Integrated loudness" in line or line.strip().startswith("I:"):
            parts = line.split()
            for p in parts:
                if p.replace("-", "").replace(".", "").isdigit() and "LUFS" in line:
                    try:
                        loudness = float(p)
                        break
                    except ValueError:
                        continue
        if loudness is not None:
            break
    assert loudness is not None
    assert -24.5 <= loudness <= -21.5

    # Cleanup
    Path(output_path).unlink()
