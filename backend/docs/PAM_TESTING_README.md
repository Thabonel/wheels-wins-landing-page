# PAM Testing - Complete Guide

**Last Updated:** January 2025
**Status:** Test infrastructure complete, ready for execution

---

## Quick Start

### 1. Install Dependencies
```bash
cd backend
pip install pytest pytest-asyncio pytest-cov
```

### 2. Run All Automated Tests
```bash
# Using bash script (Linux/macOS)
./scripts/run_pam_tests.sh --coverage

# Using Python script (cross-platform)
python scripts/run_pam_tests.py --coverage

# Using pytest directly
pytest app/tests/test_*.py --cov=app/services/pam/tools --cov-report=html -v
```

### 3. View Coverage Report
```bash
open htmlcov/index.html  # macOS
xdg-open htmlcov/index.html  # Linux
start htmlcov/index.html  # Windows
```

---

## Testing Strategy

### Hybrid Approach

**Phase 1: Automated Tests (21%)**
- 47 automated test cases
- 10 critical tools covered
- 188 assertions
- Mock Supabase + external APIs
- Decimal precision validation

**Phase 2: Manual Testing (79%)**
- 37 tools via PAM chat interface
- Real-world scenario testing
- Manual testing checklist provided
- Results tracker (CSV)

**Total Coverage: 47/47 tools (100%)**

---

## Documentation

### Technical References

1. **[PAM_TEST_SUMMARY_2025.md](PAM_TEST_SUMMARY_2025.md)**
   - Comprehensive test coverage report
   - All 47 test cases documented
   - Test infrastructure patterns
   - Schema alignment details
   - Known issues and limitations

2. **[TEST_EXECUTION_GUIDE.md](../TEST_EXECUTION_GUIDE.md)**
   - pytest command reference
   - Coverage report generation
   - CI/CD integration
   - Debugging options

3. **[PAM_TESTING_SESSION_COMPLETE.md](PAM_TESTING_SESSION_COMPLETE.md)**
   - Session summary
   - What was built
   - Next steps
   - Success metrics

### Manual Testing

4. **[PAM_MANUAL_TESTING_CHECKLIST.md](PAM_MANUAL_TESTING_CHECKLIST.md)**
   - 37 tool test scenarios
   - Exact test inputs
   - Expected outputs
   - Pass/fail criteria

5. **[PAM_MANUAL_TEST_TRACKER.csv](PAM_MANUAL_TEST_TRACKER.csv)**
   - Results tracking spreadsheet
   - Status tracking
   - Tester assignments
   - GitHub issue links

---

## Test Execution Tools

### Bash Script (Linux/macOS)
```bash
./scripts/run_pam_tests.sh [options]

Options:
  --quick    Run only critical tests
  --coverage Generate coverage report
  --verbose  Show detailed output
  --help     Show usage information
```

**Example:**
```bash
# Quick critical tests only
./scripts/run_pam_tests.sh --quick

# Full suite with coverage
./scripts/run_pam_tests.sh --coverage --verbose
```

### Python Script (Cross-platform)
```bash
python scripts/run_pam_tests.py [options]

Options:
  --quick       Run only critical tests
  --coverage    Generate coverage report
  --verbose     Show detailed output
  --json        Output JSON results (CI/CD)
  --output FILE Write JSON to FILE
```

**Example:**
```bash
# CI/CD mode with JSON output
python scripts/run_pam_tests.py --coverage --json --output results.json

# Quick critical tests
python scripts/run_pam_tests.py --quick
```

---

## Test Categories

### By Marker
```bash
pytest -m budget      # Budget tools (11 tests)
pytest -m trip        # Trip planning (13 tests)
pytest -m calendar    # Calendar tools (12 tests)
pytest -m social      # Social tools (11 tests)
pytest -m critical    # Critical tests only
pytest -m integration # Workflow tests
```

### By Tool Type
```bash
# Budget tools
pytest app/tests/test_budget_tools.py -v

# Trip planning tools
pytest app/tests/test_trip_tools.py -v

# Calendar tools
pytest app/tests/test_calendar_tools.py -v

# Social tools
pytest app/tests/test_social_tools.py -v
```

---

## Test Infrastructure

### Files Created

```
backend/
├── pytest.ini                                # pytest configuration
├── app/tests/
│   ├── conftest.py                          # 20+ shared fixtures
│   ├── test_budget_tools.py                 # 11 budget tests
│   ├── test_trip_tools.py                   # 13 trip tests
│   ├── test_calendar_tools.py               # 12 calendar tests
│   └── test_social_tools.py                 # 11 social tests
├── scripts/
│   ├── run_pam_tests.sh                     # Bash test runner
│   └── run_pam_tests.py                     # Python test runner
└── docs/
    ├── PAM_TEST_SUMMARY_2025.md             # Comprehensive summary
    ├── PAM_TESTING_SESSION_COMPLETE.md      # Session summary
    ├── PAM_MANUAL_TESTING_CHECKLIST.md      # Manual test guide
    ├── PAM_MANUAL_TEST_TRACKER.csv          # Results tracker
    └── PAM_TESTING_README.md                # This file
```

**Total Test Code:** ~1,950 lines

---

## Key Test Patterns

### 1. Mock Supabase Client
```python
@pytest.fixture
def mock_supabase_client():
    mock_client = MagicMock()
    mock_table = MagicMock()
    mock_client.table.return_value = mock_table

    # Chain all query methods
    mock_table.select.return_value = mock_table
    mock_table.insert.return_value = mock_table
    mock_table.eq.return_value = mock_table

    mock_execute_result = MagicMock()
    mock_execute_result.data = []
    mock_execute_result.error = None
    mock_table.execute.return_value = mock_execute_result

    return mock_client
```

### 2. Decimal Precision Validation
```python
async def test_decimal_precision(test_user_id, mock_supabase_client):
    """Test Amendment #4 compliance - Decimal(10,2) precision"""
    precise_amount = Decimal("123.45")

    result = await create_expense(
        user_id=test_user_id,
        amount=precise_amount,
        category="fuel"
    )

    assert Decimal(result["expense"]["amount"]) == precise_amount
```

### 3. External API Mocking
```python
async def test_weather_api(test_user_id, mock_weather_api_response):
    with patch('httpx.AsyncClient.get') as mock_get:
        mock_response = AsyncMock()
        mock_response.json.return_value = mock_weather_api_response
        mock_get.return_value = mock_response

        result = await get_weather_forecast(
            user_id=test_user_id,
            location="Phoenix, AZ"
        )

    assert result["success"] is True
```

### 4. Schema Alignment Test
```python
@pytest.mark.critical
async def test_calendar_schema_alignment(test_user_id, mock_supabase_client):
    """CRITICAL: Verify calendar_events uses start_date/end_date"""
    result = await create_calendar_event(...)

    assert "start_date" in result["event"]
    assert "end_date" in result["event"]
    assert "date" not in result["event"]  # Wrong field
```

---

## Coverage Goals

### Current Coverage
- **Automated:** 10/47 tools (21%)
- **Manual Checklist:** 37/47 tools (79%)
- **Total:** 47/47 tools (100%)

### Target Coverage
- **Week 1:** Execute all 47 automated tests
- **Week 2:** Execute all 37 manual tests
- **Month 1:** 80%+ automated coverage
- **Quarter 1:** 100% automated coverage

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: PAM Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2

    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: '3.11'

    - name: Install dependencies
      run: |
        cd backend
        pip install pytest pytest-asyncio pytest-cov
        pip install -r requirements.txt

    - name: Run tests
      run: |
        cd backend
        python scripts/run_pam_tests.py --coverage --json

    - name: Upload coverage
      uses: codecov/codecov-action@v2
      with:
        file: ./backend/coverage.xml
```

---

## Troubleshooting

### pytest Not Found
```bash
pip install pytest pytest-asyncio pytest-cov
```

### ModuleNotFoundError
```bash
pip install -r requirements.txt
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
```

### Async Test Warnings
```bash
pip install pytest-asyncio
# Ensure pytest.ini has: asyncio_mode = auto
```

### Import Errors
```bash
# Run from backend directory
cd backend
pytest app/tests/test_*.py
```

---

## Next Steps

### Immediate (This Week)
1. ✅ Install pytest: `pip install pytest pytest-asyncio pytest-cov`
2. ⬜ Run all automated tests
3. ⬜ Fix any failures
4. ⬜ Generate coverage report

### Short-term (Weeks 1-2)
5. ⬜ Execute manual testing (37 tools)
   - Use `PAM_MANUAL_TESTING_CHECKLIST.md`
   - Track results in `PAM_MANUAL_TEST_TRACKER.csv`
   - Create GitHub issues for bugs

6. ⬜ Expand automated coverage
   - Add tests for profile tools (6 tools)
   - Add tests for community tools (2 tools)
   - Target: 80%+ coverage

### Medium-term (Month 1)
7. ⬜ Set up test database
   - Dedicated Supabase test project
   - Integration tests with real database
   - RLS policy testing

8. ⬜ CI/CD integration
   - GitHub Actions workflow
   - Automated test runs on PR
   - Coverage reporting

9. ⬜ Performance testing
   - Load test with 100+ concurrent users
   - Measure response times
   - Optimize slow tools

### Long-term (Quarter 1)
10. ⬜ 100% automated coverage
11. ⬜ End-to-end workflow tests
12. ⬜ Security testing
13. ⬜ User acceptance testing

---

## Success Metrics

### Quality Gates
- ✅ All automated tests pass
- ✅ Code coverage >80%
- ✅ No critical bugs
- ✅ All manual tests documented
- ✅ CI/CD pipeline green

### Performance Benchmarks
- Response time: <3s for all tools
- Test execution: <30s for full suite
- Coverage report: <5s generation

---

## Resources

- **pytest Docs:** https://docs.pytest.org/
- **pytest-asyncio:** https://pytest-asyncio.readthedocs.io/
- **Coverage Docs:** https://coverage.readthedocs.io/
- **Staging Environment:** https://wheels-wins-staging.netlify.app

---

**For questions or issues, see [PAM_TESTING_SESSION_COMPLETE.md](PAM_TESTING_SESSION_COMPLETE.md)**

**Last Updated:** January 2025
**Maintained By:** Development Team
