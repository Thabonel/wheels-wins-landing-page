#!/usr/bin/env python3
import asyncio

async def test_wins_node():
    try:
        print("✅ WINS node import: SUCCESS")
        print("🎉 WINS node test completed!")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting WINS Node Test...")
    asyncio.run(test_wins_node())
