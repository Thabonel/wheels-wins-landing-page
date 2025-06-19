#!/usr/bin/env python3
import asyncio
from app.core.orchestrator import orchestrator

async def main():
    # Test scraping action
    print("Requesting free campsites...")
    actions = await orchestrator.plan(
        "Find free campsites within 50km of Sydney", 
        {"user_id": "demo_user"}
    )
    print("Actions returned:")
    for act in actions:
        print(act)

if __name__ == "__main__":
    asyncio.run(main())
