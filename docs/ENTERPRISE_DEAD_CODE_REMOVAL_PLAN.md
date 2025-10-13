# Enterprise Dead Code Removal Plan
## Based on Meta, Uber, and Industry Best Practices

**Created:** October 8, 2025
**Goal:** Remove 9 months of accumulated "slop code" safely without breaking production
**Approach:** Meta's SCARF methodology + Uber's Piranha concepts + Modern tooling (Knip)
**Timeline:** 4-week phased rollout

---

## 🎯 Executive Summary

### The Problem
- **9 months of rapid development** = massive code accumulation
- **139 PAM files** (53 active, 74 unclear, 12 deletable)
- **Unknown amount** of unused frontend code
- **Cannot ship to production** with this much technical debt
- **Manual cleanup failed** (broke PAM system on Oct 8, 2025)

### The Solution (Industry Standard)
Copy Meta's proven approach:
1. **Automated static analysis** (not manual inventory)
2. **Runtime usage monitoring** (production data, not guesses)
3. **Dependency graph analysis** (understand cascading impacts)
4. **Automated removal with human oversight** (tools + verification)
5. **Continuous monitoring** (track what's actually used)

### Expected Results
- **30-50% code reduction** (based on Meta's results)
- **Zero production breakage** (with proper safeguards)
- **4 weeks to completion** (phased rollout)
- **Maintainable codebase** for production launch

---

## 📊 How Meta Does It: The SCARF System

### Multi-Layer Analysis Approach
Meta combines **three types of analysis**:

1. **Static Analysis** (Code structure)
   - Compiler-extracted dependency graphs via Glean
   - Symbol-level tracking (not file-level)
   - Cross-language support

2. **Dynamic Analysis** (Runtime behavior)
   - Operational logs tracking API endpoint usage
   - Script invocations tracking
   - Template hooks monitoring
   - Async method calls tracking

3. **Application-Specific Rules**
   - Domain-specific usage patterns
   - Framework-specific conventions
   - Business logic understanding

### Safety Mechanisms
- **Errs on side of caution** (false negatives > false positives)
- **Human-readable explanations** for every deletion
- **Manual engineer override** capability
- **Continuous learning** from engineer feedback
- **Textual search fallback** (BigGrep) when graph analysis uncertain

### Scale Achieved
- **104 million lines deleted** in one year
- **370,000 automated change requests**
- **Hundreds of millions of lines analyzed**
- **50% increase** in dead code detected after graph analysis improvement

---

## 🛠️ Our Implementation Plan

### Phase 1: Setup & Baseline (Week 1)

#### 1.1 Install Knip (Modern Dead Code Detection)
```bash
# Install Knip for JavaScript/TypeScript analysis
npm install -D knip

# Create knip.json configuration
cat > knip.json <<EOF
{
  "entry": [
    "src/main.tsx",
    "src/App.tsx"
  ],
  "project": [
    "src/**/*.{ts,tsx}"
  ],
  "ignore": [
    "**/__tests__/**",
    "**/*.test.{ts,tsx}",
    "**/dist/**",
    "**/build/**"
  ],
  "ignoreDependencies": [],
  "ignoreBinaries": []
}
EOF

# Run initial analysis
npx knip --reporter json > knip-baseline.json
```

**What Knip Detects:**
- ✅ Unused files
- ✅ Unused exports
- ✅ Unused dependencies in package.json
- ✅ Unused devDependencies
- ✅ Unused class members
- ✅ Unused enum members

#### 1.2 Install Python Dead Code Detection
```bash
# Install Vulture for Python dead code detection
cd backend
pip install vulture

# Run initial analysis
vulture app/ > vulture-baseline.txt
```

#### 1.3 Create Dependency Graphs
```bash
# Frontend dependency graph using Madge
npm install -D madge
npx madge --circular --extensions ts,tsx src/

# Backend dependency graph
cd backend
pip install pydeps
pydeps app --max-bacon 2 -o dependency-graph.svg
```

#### 1.4 Establish Baseline Metrics
```bash
# Count current code
echo "Frontend LOC:" && find src -name "*.ts*" -not -path "*/node_modules/*" | xargs wc -l
echo "Backend LOC:" && find backend/app -name "*.py" | xargs wc -l

# Document results
cat > BASELINE_METRICS.md <<EOF
# Codebase Baseline (October 8, 2025)

## Frontend
- Total TypeScript files: $(find src -name "*.ts*" | wc -l)
- Total lines of code: $(find src -name "*.ts*" | xargs wc -l | tail -1)
- Dependencies: $(jq '.dependencies | length' package.json)
- DevDependencies: $(jq '.devDependencies | length' package.json)

## Backend
- Total Python files: $(find backend/app -name "*.py" | wc -l)
- Total lines of code: $(find backend/app -name "*.py" | xargs wc -l | tail -1)
- Dependencies: $(grep -c "==" backend/requirements.txt)

## Knip Analysis
$(cat knip-baseline.json | jq '.summary')

## Vulture Analysis
$(wc -l vulture-baseline.txt)
EOF
```

### Phase 2: Runtime Monitoring (Week 1-2)

#### 2.1 Add Usage Tracking to Backend APIs
```python
# backend/app/middleware/usage_tracking.py
"""
Track API endpoint usage in production
Inspired by Meta's SCARF operational logs
"""

from fastapi import Request
from datetime import datetime
import redis
import json

redis_client = redis.Redis(host='localhost', port=6379, db=1)

async def track_endpoint_usage(request: Request, call_next):
    """Track which API endpoints are actually called"""
    endpoint = f"{request.method}:{request.url.path}"
    timestamp = datetime.utcnow().isoformat()

    # Store usage in Redis with 30-day TTL
    key = f"endpoint_usage:{endpoint}"
    redis_client.zadd(key, {timestamp: datetime.utcnow().timestamp()})
    redis_client.expire(key, 60 * 60 * 24 * 30)  # 30 days

    response = await call_next(request)
    return response

# Add to main.py
app.middleware("http")(track_endpoint_usage)
```

#### 2.2 Add Component Usage Tracking to Frontend
```typescript
// src/utils/componentUsageTracking.ts
/**
 * Track which React components are actually rendered
 * Inspired by Meta's dynamic analysis
 */

const TRACKING_ENABLED = import.meta.env.VITE_TRACK_COMPONENT_USAGE === 'true';

export function trackComponentMount(componentName: string) {
  if (!TRACKING_ENABLED) return;

  // Send to backend or localStorage
  const key = `component_usage:${componentName}`;
  const existing = localStorage.getItem(key);
  const count = existing ? parseInt(existing) + 1 : 1;
  localStorage.setItem(key, count.toString());

  // Also log to analytics
  console.debug(`[USAGE] Component mounted: ${componentName}`);
}

// Usage in components:
export function MyComponent() {
  useEffect(() => {
    trackComponentMount('MyComponent');
  }, []);

  return <div>...</div>;
}
```

#### 2.3 Create Usage Analysis Script
```bash
#!/bin/bash
# scripts/analyze-production-usage.sh
# Analyzes which code is actually used in production

echo "📊 Analyzing production usage data..."

# Backend endpoints
echo "## Backend Endpoints (Last 30 days)"
redis-cli --scan --pattern "endpoint_usage:*" | while read key; do
  count=$(redis-cli ZCARD "$key")
  echo "$key: $count calls"
done | sort -t: -k3 -n

# Frontend components (from localStorage analytics)
echo "## Frontend Components (Last 30 days)"
# Fetch from analytics backend
curl -s https://analytics-backend/component-usage | jq .

# Cross-reference with Knip results
echo "## Unused Code Cross-Reference"
npx knip | grep "Unused file" > unused-files.txt
# Compare with usage logs to confirm truly unused
```

#### 2.4 Monitor for 2 Weeks
```markdown
# CRITICAL: DO NOT DELETE ANYTHING YET

Run monitoring for 14 days (October 8-22, 2025):
- ✅ Production usage tracking enabled
- ✅ Staging usage tracking enabled
- ✅ Analytics collection running
- ⏳ Wait for data...

After 2 weeks, we'll have PROOF of what's unused.
```

### Phase 3: Automated Analysis (Week 3)

#### 3.1 Combine Static + Dynamic Analysis
```python
# scripts/combine_analyses.py
"""
Combine Knip static analysis + production usage logs
Only mark code as "safe to delete" if BOTH agree it's unused
"""

import json
import redis

# Load Knip results
with open('knip-baseline.json') as f:
    knip_data = json.load(f)

# Load production usage data
r = redis.Redis()
production_used = set()

for key in r.scan_iter("endpoint_usage:*"):
    if r.zcard(key) > 0:  # Used at least once
        production_used.add(key.decode().replace("endpoint_usage:", ""))

# Cross-reference
safe_to_delete = []
risky_to_delete = []

for file in knip_data.get('unused_files', []):
    # Check if file has any endpoints that were used
    if any(endpoint in file for endpoint in production_used):
        risky_to_delete.append({
            'file': file,
            'reason': 'Knip says unused, but production logs show usage'
        })
    else:
        safe_to_delete.append({
            'file': file,
            'reason': 'Unused in both static analysis AND production logs'
        })

# Generate report
print(f"✅ Safe to delete: {len(safe_to_delete)} files")
print(f"⚠️ Risky to delete: {len(risky_to_delete)} files")

with open('deletion-plan.json', 'w') as f:
    json.dump({
        'safe': safe_to_delete,
        'risky': risky_to_delete,
        'generated_at': datetime.utcnow().isoformat()
    }, f, indent=2)
```

#### 3.2 Build Dependency Graph
```python
# scripts/build_dependency_graph.py
"""
Build complete dependency graph like Meta's SCARF
Understand cascading impacts of deletions
"""

import ast
import os
from collections import defaultdict

dependency_graph = defaultdict(list)

def analyze_imports(filepath):
    """Extract all imports from a Python file"""
    with open(filepath) as f:
        tree = ast.parse(f.read())

    imports = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.append(alias.name)
        elif isinstance(node, ast.ImportFrom):
            imports.append(node.module)

    return imports

# Analyze all backend files
for root, dirs, files in os.walk('backend/app'):
    for file in files:
        if file.endswith('.py'):
            filepath = os.path.join(root, file)
            imports = analyze_imports(filepath)
            dependency_graph[filepath] = imports

# Find isolated subgraphs (safe to delete)
def find_isolated_nodes(graph):
    """Find nodes with no incoming edges (nothing imports them)"""
    imported = set()
    for imports in graph.values():
        imported.update(imports)

    isolated = []
    for node in graph.keys():
        if node not in imported:
            isolated.append(node)

    return isolated

isolated = find_isolated_nodes(dependency_graph)
print(f"Found {len(isolated)} isolated files (potential dead code)")
```

#### 3.3 Generate Automated Deletion Plan
```python
# scripts/generate_deletion_plan.py
"""
Generate human-readable deletion plan with explanations
Like Meta's CodemodService
"""

def generate_deletion_explanation(file, reason, usage_data):
    """Create human-readable explanation for why this file is safe to delete"""
    return f"""
File: {file}
Reason for deletion: {reason}

Static Analysis (Knip):
- No imports found in codebase
- No exports used elsewhere

Dynamic Analysis (Production Logs):
- Zero API calls in last 30 days
- Zero component renders logged

Dependency Impact:
- No other files depend on this file
- Safe to delete (isolated node)

Verification:
- Searched entire codebase: 0 references found
- Checked production logs: 0 usage events
- Analyzed dependency graph: No dependencies

Confidence: HIGH ✅
"""

# Generate plan for all safe deletions
with open('deletion-plan.json') as f:
    plan = json.load(f)

with open('DELETION_PLAN.md', 'w') as f:
    f.write("# Automated Dead Code Deletion Plan\n\n")
    f.write(f"Generated: {datetime.utcnow().isoformat()}\n\n")

    for item in plan['safe']:
        explanation = generate_deletion_explanation(
            item['file'],
            item['reason'],
            item.get('usage_data', {})
        )
        f.write(explanation)
        f.write("\n---\n\n")
```

### Phase 4: Incremental Deletion (Week 3-4)

#### 4.1 Delete in Micro-Batches
```bash
#!/bin/bash
# scripts/incremental-delete.sh
# Delete 5 files at a time, test after each batch

BATCH_SIZE=5
BATCH_NUM=1

cat deletion-plan.json | jq -r '.safe[].file' | while read file; do
  echo "🗑️ Deleting $file"
  git rm "$file"

  # Increment counter
  ((COUNT++))

  # Every BATCH_SIZE deletions, test
  if [ $((COUNT % BATCH_SIZE)) -eq 0 ]; then
    echo "📦 Testing batch $BATCH_NUM..."

    # Run tests
    npm run type-check || exit 1
    npm run lint || exit 1
    cd backend && python -c "from app.main import app" || exit 1

    # Commit batch
    git commit -m "refactor: remove dead code batch $BATCH_NUM (auto-verified)"
    git tag "dead-code-removal-batch-$BATCH_NUM"

    # Deploy to staging
    git push origin staging

    # Wait for deployment
    echo "⏳ Waiting for Render deployment..."
    sleep 180

    # Run health checks
    ./scripts/health-check.sh || {
      echo "❌ Health check failed! Rolling back..."
      git reset --hard HEAD~1
      git push origin staging --force-with-lease
      exit 1
    }

    echo "✅ Batch $BATCH_NUM complete and verified"
    ((BATCH_NUM++))
  fi
done
```

#### 4.2 Continuous Monitoring During Deletion
```bash
# scripts/monitor-during-deletion.sh
# Monitor production health during deletion process

while true; do
  # Check error rates
  error_rate=$(curl -s https://staging/api/health | jq '.error_rate')

  if (( $(echo "$error_rate > 0.01" | bc -l) )); then
    echo "⚠️ Error rate elevated: $error_rate"
    echo "⛔ STOPPING deletion process"
    exit 1
  fi

  # Check response times
  response_time=$(curl -s https://staging/api/health | jq '.avg_response_ms')

  if (( $(echo "$response_time > 500" | bc -l) )); then
    echo "⚠️ Response time elevated: ${response_time}ms"
  fi

  sleep 60
done
```

### Phase 5: Continuous Cleanup (Ongoing)

#### 5.1 Add Knip to CI/CD Pipeline
```yaml
# .github/workflows/dead-code-check.yml
name: Dead Code Check

on:
  pull_request:
    branches: [main, staging]

jobs:
  knip:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx knip --reporter json > knip-report.json

      # Fail if new dead code detected
      - name: Check for new dead code
        run: |
          NEW_UNUSED=$(cat knip-report.json | jq '.files.unused | length')
          if [ "$NEW_UNUSED" -gt 0 ]; then
            echo "❌ New unused code detected: $NEW_UNUSED files"
            exit 1
          fi
```

#### 5.2 Pre-commit Hook
```bash
# .git/hooks/pre-commit
#!/bin/bash
# Prevent committing dead code

echo "🔍 Checking for dead code..."

# Run Knip on changed files only
CHANGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$')

if [ -n "$CHANGED_FILES" ]; then
  npx knip --include-entry-exports 2>&1 | grep "Unused" && {
    echo "❌ Dead code detected in your changes"
    echo "Run 'npx knip' to see details"
    exit 1
  }
fi

echo "✅ No dead code detected"
```

#### 5.3 Monthly Cleanup Automation
```bash
# .github/workflows/monthly-cleanup.yml
name: Monthly Dead Code Cleanup

on:
  schedule:
    - cron: '0 0 1 * *'  # First day of each month

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npx knip --fix  # Auto-remove simple unused exports
      - run: git diff --exit-code || {
          git config user.name "Dead Code Bot"
          git checkout -b cleanup-$(date +%Y-%m)
          git add .
          git commit -m "chore: automated monthly dead code cleanup"
          gh pr create --title "Monthly Dead Code Cleanup" --body "Automated cleanup by Knip"
        }
```

---

## 📊 Expected Results

### Week 1 (Baseline)
- ✅ Tools installed (Knip, Vulture)
- ✅ Baseline metrics documented
- ✅ Monitoring deployed to production
- 📈 **0% code removed** (data gathering)

### Week 2 (Monitoring)
- ✅ Production usage data collected
- ✅ 14 days of runtime analytics
- ✅ Dependency graphs built
- 📈 **0% code removed** (still gathering data)

### Week 3 (Analysis)
- ✅ Static + dynamic analysis combined
- ✅ Deletion plan generated
- ✅ First 5-10 batches deleted
- 📈 **10-20% code removed** (safe deletions)

### Week 4 (Completion)
- ✅ All safe deletions complete
- ✅ CI/CD integration active
- ✅ Documentation updated
- 📈 **30-50% code removed** (based on Meta's results)

---

## 🎯 Success Criteria

### Technical Metrics
- ✅ **30-50% code reduction** (conservative estimate based on Meta)
- ✅ **Zero production incidents** during cleanup
- ✅ **100% test pass rate** maintained
- ✅ **Improved build times** (less code to compile)
- ✅ **Smaller bundle sizes** (faster page loads)

### Process Metrics
- ✅ **Automated detection** (no manual inventory)
- ✅ **Data-driven decisions** (production usage logs)
- ✅ **Continuous monitoring** (catches regressions early)
- ✅ **Developer confidence** (clear explanations for every deletion)

### Business Metrics
- ✅ **Production-ready codebase** (can ship with confidence)
- ✅ **Maintainable architecture** (easier for new developers)
- ✅ **Reduced technical debt** (less "slop code")
- ✅ **Faster development** (less code to navigate)

---

## 🚨 Safety Guarantees

### What We Learned from Meta's SCARF
1. **Err on side of caution** - False negatives >> False positives
2. **Multiple data sources** - Static analysis alone is insufficient
3. **Human oversight** - Automated with engineer review
4. **Continuous learning** - Improve process based on feedback
5. **Gradual rollout** - Small batches, test everything

### Our Safety Mechanisms
1. ✅ **Production usage logs** (30-day minimum monitoring)
2. ✅ **Dependency graph analysis** (understand cascading impacts)
3. ✅ **Micro-batch deletions** (5 files max per deployment)
4. ✅ **Automated health checks** (detect breakage immediately)
5. ✅ **Instant rollback** (git tags + automated revert)
6. ✅ **Human review** (every deletion plan reviewed before execution)

---

## 🛠️ Tools We're Using

### JavaScript/TypeScript
- **Knip** - Dead code detection (100+ plugins, used by Vercel/Shopify/Microsoft)
- **Madge** - Dependency graph visualization
- **TypeScript compiler** - Unused exports detection

### Python
- **Vulture** - Dead code detection
- **pydeps** - Dependency graph visualization
- **AST analysis** - Custom import tracking

### Infrastructure
- **Redis** - Usage tracking storage
- **GitHub Actions** - CI/CD automation
- **Render** - Deployment platform with health checks

---

## 📚 References

1. **Meta's SCARF System**
   - Engineering blog: https://engineering.fb.com/2023/10/24/data-infrastructure/automating-dead-code-cleanup/
   - Research paper: "Dead Code Removal at Meta: Automatically Deleting Millions of Lines of Code"

2. **Uber's Piranha**
   - Hacker News: https://news.ycombinator.com/item?id=23593165
   - Open source tool for feature flag cleanup

3. **Knip (Modern Tooling)**
   - Official site: https://knip.dev/
   - Used by: Vercel, Shopify, Microsoft, and thousands of projects

4. **Industry Best Practices**
   - Runtime monitoring > Static analysis alone
   - Dependency graphs reveal hidden connections
   - Automated removal with human oversight
   - Continuous monitoring prevents regression

---

## 🎯 Next Steps (Immediate)

1. ✅ **Install Knip today** (15 minutes)
   ```bash
   npm install -D knip
   npx knip
   ```

2. ✅ **Deploy usage tracking** (30 minutes)
   - Add middleware to backend/app/main.py
   - Add component tracking to src/

3. ✅ **Set 2-week monitoring period** (October 8-22, 2025)
   - No deletions during this time
   - Just collect data

4. ✅ **Review deletion plan** (Week 3)
   - Analyze combined static + dynamic data
   - Generate human-readable explanations
   - Get stakeholder approval

5. ✅ **Execute incremental cleanup** (Week 3-4)
   - 5 files at a time
   - Test after every batch
   - Monitor production health

---

**Bottom Line:** We're copying exactly what Meta did to remove 104 million lines of code safely. Their process works at massive scale, it will definitely work for us.
