"""
Example Workflow: Data Filtering and Control Flow

This demonstrates how code execution enables efficient data processing
that would be impossible or very expensive with traditional MCP.

Traditional MCP Problem:
- Tool returns 10,000 rows to context
- Context bloat (50K+ tokens)
- Cannot filter data server-side

Code Execution Solution:
- Filter data in code before returning
- Only return relevant subset (500 tokens)
- Native loops and conditionals
"""

import asyncio
from typing import List, Dict, Any


async def traditional_mcp_data_workflow():
    """
    TRADITIONAL MCP: Data Processing Challenge

    Problem: Agent needs to find pending orders in a large spreadsheet.

    Token flow:
    1. Call get_sheet tool
    2. Tool returns ALL 10,000 rows to context (50,000 tokens!)
    3. Claude processes in context
    4. Claude realizes it needs to filter
    5. Generates response with filtered data

    TOTAL: ~55,000 tokens (mostly data bloat)
    """
    # Simulated: Tool returns 10,000 rows
    all_rows = [
        {"Order ID": f"ORD{i}", "Status": "pending" if i % 10 == 0 else "completed",
         "Amount": 100.0, "Customer": f"Customer{i}"}
        for i in range(10000)
    ]

    token_cost = {
        "tool_call": 100,
        "all_data_in_context": 50000,  # 10,000 rows × 5 tokens each
        "claude_filtering": 500,
        "filtered_result": 500
    }

    return {
        "approach": "Traditional MCP",
        "rows_loaded": 10000,
        "rows_needed": 100,
        "efficiency": "VERY LOW - Context bloat from unnecessary data",
        "token_cost": sum(token_cost.values()),
        "breakdown": token_cost
    }


async def code_execution_data_workflow():
    """
    CODE EXECUTION: Efficient Data Processing

    Solution: Filter data in Python code before returning to context.

    Agent generates this code:
    ```python
    from servers.google_drive import get_sheet

    # Get all rows
    all_rows = await get_sheet({'sheetId': 'abc123'})

    # Filter for pending orders (Python code, not in context!)
    pending = [row for row in all_rows if row["Status"] == "pending"]

    # Only return what's needed
    print(f"Found {len(pending)} pending orders")
    print(pending[:5])  # Show first 5 for review
    ```

    Token flow:
    1. Tool returns 10,000 rows to CODE (not context)
    2. Code filters to 100 pending orders
    3. Code prints summary + first 5 rows
    4. Only 500 tokens added to context

    TOTAL: ~2,100 tokens (98% reduction!)
    """
    # Simulated code execution
    code = """
from servers.google_drive import get_sheet

# Get all rows (happens in sandbox, not context)
all_rows = await get_sheet({'sheetId': 'abc123'})

# Filter in Python (efficient!)
pending = [row for row in all_rows if row["Status"] == "pending"]

# Return only summary + sample
print(f"Found {len(pending)} pending orders")
print("First 5 pending orders:")
for order in pending[:5]:
    print(f"  {order['Order ID']}: ${order['Amount']} - {order['Customer']}")
"""

    token_cost = {
        "tool_call": 100,
        "filtering_code": 500,
        "filtered_summary": 500,  # Only summary + 5 rows in context
        "total_data_processed": 0  # Data processed in sandbox, not context!
    }

    return {
        "approach": "Code Execution",
        "rows_loaded": 10000,
        "rows_in_context": 5,  # Only sample shown
        "efficiency": "HIGH - Data filtered before returning",
        "token_cost": sum(token_cost.values()),
        "breakdown": token_cost,
        "reduction_vs_traditional": "98.1%"
    }


async def control_flow_example():
    """
    CONTROL FLOW: Loops and Conditionals

    Traditional MCP: Cannot do loops/conditionals natively
    Code Execution: Full Python control flow

    Example: Wait for deployment notification
    """
    # Traditional MCP: Requires multiple back-and-forth calls
    traditional_code = """
    # Attempt 1
    messages = slack.get_channel_history(channel='C123')
    # No deployment message → Tell Claude
    # Claude: "Try again"

    # Attempt 2
    messages = slack.get_channel_history(channel='C123')
    # No deployment message → Tell Claude
    # Claude: "Try again"

    # ... many attempts, many context switches ...
    """

    # Code Execution: Native Python loops
    code_exec_code = """
from servers.slack import get_channel_history
import time

# Wait for deployment notification (loop in code, not context!)
found = False
while not found:
    messages = await get_channel_history({'channel': 'C123'})
    found = any('deployment complete' in m['text'] for m in messages)

    if not found:
        await asyncio.sleep(5)  # Wait 5 seconds

print("Deployment notification received!")
"""

    print("\n" + "=" * 60)
    print("CONTROL FLOW ADVANTAGE")
    print("=" * 60)

    print("\n### Traditional MCP ###")
    print("❌ Cannot do loops natively")
    print("❌ Each iteration = new API call + context update")
    print("❌ Token cost multiplies with iterations")
    print("Example: 10 attempts × 5000 tokens = 50,000 tokens")

    print("\n### Code Execution ###")
    print("✓ Native Python loops and conditionals")
    print("✓ Loop runs in sandbox (no context overhead)")
    print("✓ Only final result added to context")
    print("Example: 10 attempts × 100 tokens = 1,000 tokens total")

    print(f"\nToken savings: 98% reduction")


async def demonstrate_data_efficiency():
    """Main demonstration of data filtering advantages"""
    print("=" * 60)
    print("Data Filtering: Token Usage Comparison")
    print("=" * 60)

    traditional = await traditional_mcp_data_workflow()
    code_exec = await code_execution_data_workflow()

    print("\n### TRADITIONAL MCP ###")
    print(f"Rows loaded to context: {traditional['rows_loaded']:,}")
    print(f"Rows needed: {traditional['rows_needed']}")
    print(f"Total tokens: {traditional['token_cost']:,}")
    print(f"Efficiency: {traditional['efficiency']}")

    print("\n### CODE EXECUTION ###")
    print(f"Rows processed: {code_exec['rows_loaded']:,}")
    print(f"Rows in context: {code_exec['rows_in_context']}")
    print(f"Total tokens: {code_exec['token_cost']:,}")
    print(f"Efficiency: {code_exec['efficiency']}")
    print(f"Reduction: {code_exec['reduction_vs_traditional']}")

    print("\n" + "=" * 60)
    print("KEY INSIGHT")
    print("=" * 60)
    print("Code execution enables:")
    print("  ✓ Server-side data filtering (keep data out of context)")
    print("  ✓ Native loops and conditionals (no context overhead)")
    print("  ✓ Complex multi-step workflows (one code block vs many API calls)")
    print("  ✓ 98%+ token reduction for data-intensive tasks")

    await control_flow_example()


if __name__ == "__main__":
    asyncio.run(demonstrate_data_efficiency())
