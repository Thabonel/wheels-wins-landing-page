from __future__ import annotations

"""Command line interface for the video trip extraction pipeline."""

import argparse
import asyncio
import json
import logging
from pathlib import Path
from typing import Iterable, List, Dict, Any

from youtube_client import YouTubeAPIClient, SearchFilters
from trip_extractor import TripExtractor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

STATE_FILE = Path("video_processing_state.json")


def load_state() -> Dict[str, Any]:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except json.JSONDecodeError:
            logger.warning("State file corrupted; starting fresh")
    return {"processed": {}}


def save_state(state: Dict[str, Any]) -> None:
    STATE_FILE.write_text(json.dumps(state, indent=2))


async def process_video(
    yt: YouTubeAPIClient, extractor: TripExtractor, video_id: str
) -> bool:
    """Fetch transcript and extract trip data for a single video."""
    try:
        transcript = yt.get_transcript(video_id)
        if not transcript:
            logger.info("No transcript for %s", video_id)
            return False
        trip = await extractor.extract(transcript)
        logger.info(
            "Processed %s (confidence %.2f)", video_id, trip.confidence
        )
        return True
    except Exception as exc:  # pragma: no cover - network failures
        logger.error("Failed processing %s: %s", video_id, exc)
        return False


async def process_batch(api_key: str, videos: Iterable[str], resume: bool) -> Dict[str, Any]:
    yt = YouTubeAPIClient(api_key)
    extractor = TripExtractor()

    state = load_state() if resume else {"processed": {}}
    processed: Dict[str, bool] = state.get("processed", {})

    total = success = failure = 0
    for vid in videos:
        if vid in processed:
            logger.info("Skipping already processed %s", vid)
            continue
        total += 1
        ok = await process_video(yt, extractor, vid)
        processed[vid] = ok
        if ok:
            success += 1
        else:
            failure += 1
        state["processed"] = processed
        save_state(state)

    rate = success / total if total else 0
    report = {"total": total, "success": success, "failure": failure, "success_rate": rate}
    return report


def cmd_search(args: argparse.Namespace) -> None:
    yt = YouTubeAPIClient(args.api_key)
    filters = SearchFilters(channel_id=args.channel, duration=args.duration, region_code=args.region)
    videos = yt.search_rv_videos(
        keywords=args.keywords,
        channels=[args.channel] if args.channel else None,
        filters=filters,
        max_results=args.max_results,
    )
    print(json.dumps(videos, indent=2))


def cmd_process(args: argparse.Namespace) -> None:
    report = asyncio.run(process_batch(args.api_key, args.videos, args.resume))
    print(json.dumps(report, indent=2))


def cmd_run(args: argparse.Namespace) -> None:
    yt = YouTubeAPIClient(args.api_key)
    filters = SearchFilters(channel_id=args.channel, duration=args.duration, region_code=args.region)
    videos = yt.search_rv_videos(
        keywords=args.keywords,
        channels=[args.channel] if args.channel else None,
        filters=filters,
        max_results=args.max_results,
    )
    ids = [v["id"] for v in videos]
    report = asyncio.run(process_batch(args.api_key, ids, args.resume))
    print(json.dumps(report, indent=2))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Video trip extraction pipeline")
    sub = parser.add_subparsers(dest="command")

    p_search = sub.add_parser("search", help="Search YouTube for videos")
    p_search.add_argument("--api-key", required=True)
    p_search.add_argument("--keywords", nargs="*", default=["RV travel"])
    p_search.add_argument("--channel")
    p_search.add_argument("--region")
    p_search.add_argument("--duration", choices=["short", "medium", "long"])
    p_search.add_argument("--max-results", type=int, default=10)
    p_search.set_defaults(func=cmd_search)

    p_process = sub.add_parser("process", help="Process specific videos")
    p_process.add_argument("--api-key", required=True)
    p_process.add_argument("--resume", action="store_true")
    p_process.add_argument("videos", nargs="+")
    p_process.set_defaults(func=cmd_process)

    p_run = sub.add_parser("run", help="Search and process in one step")
    p_run.add_argument("--api-key", required=True)
    p_run.add_argument("--resume", action="store_true")
    p_run.add_argument("--keywords", nargs="*", default=["RV travel"])
    p_run.add_argument("--channel")
    p_run.add_argument("--region")
    p_run.add_argument("--duration", choices=["short", "medium", "long"])
    p_run.add_argument("--max-results", type=int, default=10)
    p_run.set_defaults(func=cmd_run)

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    if hasattr(args, "func"):
        args.func(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
