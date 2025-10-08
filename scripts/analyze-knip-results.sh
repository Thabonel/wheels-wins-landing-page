#!/bin/bash
# Knip Analysis Helper Script

echo "=== Knip Dead Code Analysis Summary ==="
echo ""
echo "Generated: $(date)"
echo ""

# Run Knip and capture metrics
npx knip --reporter compact 2>/dev/null | grep -E "^(Unused|unused)" | while read line; do
  echo "  $line"
done

echo ""
echo "=== Quick Commands ==="
echo "  Full report:     npx knip"
echo "  Compact:         npx knip --reporter compact"
echo "  JSON output:     npx knip --reporter json > knip-scan.json"
echo "  No config files: npx knip --no-config-hints"
echo ""
echo "⚠️  DO NOT DELETE CODE YET - Wait for 2-week monitoring period"
