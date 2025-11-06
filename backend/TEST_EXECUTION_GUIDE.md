# PAM Tool Test Execution Guide

**Quick reference for running PAM automated tests**

---

## Prerequisites

### Install Testing Dependencies
```bash
# Ensure you're in the backend directory
cd backend

# Install pytest and required packages
pip install pytest pytest-asyncio pytest-cov

# Verify installation
pytest --version
```

---

## Running Tests

### Run All Tests
```bash
# Run all 47 automated tests with verbose output
pytest app/tests/test_budget_tools.py \
       app/tests/test_trip_tools.py \
       app/tests/test_calendar_tools.py \
       app/tests/test_social_tools.py \
       -v
```

### Run Tests by Category
```bash
# Budget tools only (11 tests)
pytest -m budget -v

# Trip planning tools only (13 tests)
pytest -m trip -v

# Calendar tools only (12 tests)
pytest -m calendar -v

# Social tools only (11 tests)
pytest -m social -v

# Critical tests only (high-priority)
pytest -m critical -v

# Integration workflow tests
pytest -m integration -v
```

### Run Specific Test File
```bash
# Budget tools
pytest app/tests/test_budget_tools.py -v

# Trip tools
pytest app/tests/test_trip_tools.py -v

# Calendar tools
pytest app/tests/test_calendar_tools.py -v

# Social tools
pytest app/tests/test_social_tools.py -v
```

### Run Single Test
```bash
# Run specific test by name
pytest app/tests/test_budget_tools.py::test_create_expense_success -v

# Run with full traceback
pytest app/tests/test_budget_tools.py::test_create_expense_success -vv
```

---

## Test Coverage

### Generate Coverage Report
```bash
# Run tests with coverage
pytest app/tests/test_*.py \
       --cov=app/services/pam/tools \
       --cov-report=html \
       --cov-report=term

# Open HTML coverage report
open htmlcov/index.html
```

### Coverage by Category
```bash
# Budget tools coverage
pytest -m budget --cov=app/services/pam/tools/budget --cov-report=term

# Trip tools coverage
pytest -m trip --cov=app/services/pam/tools/trip --cov-report=term
```

---

## Test Output Options

### Minimal Output
```bash
# Show only summary
pytest app/tests/test_*.py -q
```

### Verbose Output
```bash
# Show test names and status
pytest app/tests/test_*.py -v

# Show even more details
pytest app/tests/test_*.py -vv
```

### Show Print Statements
```bash
# Display print() output
pytest app/tests/test_*.py -s
```

### Failed Tests Only
```bash
# Re-run only failed tests
pytest app/tests/test_*.py --lf

# Re-run failed tests first, then all
pytest app/tests/test_*.py --ff
```

---

## Debugging Tests

### Stop on First Failure
```bash
# Exit immediately on first failure
pytest app/tests/test_*.py -x
```

### Enter Debugger on Failure
```bash
# Drop into pdb debugger on failure
pytest app/tests/test_*.py --pdb
```

### Show Local Variables
```bash
# Show local variables in traceback
pytest app/tests/test_*.py -l
```

### Full Traceback
```bash
# Show complete traceback
pytest app/tests/test_*.py --tb=long

# Short traceback
pytest app/tests/test_*.py --tb=short

# No traceback
pytest app/tests/test_*.py --tb=no
```

---

## Performance Testing

### Show Slowest Tests
```bash
# Show 10 slowest tests
pytest app/tests/test_*.py --durations=10
```

### Parallel Execution
```bash
# Install pytest-xdist
pip install pytest-xdist

# Run tests in parallel (4 workers)
pytest app/tests/test_*.py -n 4
```

---

## CI/CD Integration

### GitHub Actions Workflow
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
        pytest app/tests/test_*.py \
               --cov=app/services/pam/tools \
               --cov-report=xml \
               --cov-report=term

    - name: Upload coverage
      uses: codecov/codecov-action@v2
      with:
        file: ./backend/coverage.xml
```

---

## Test Markers Reference

### Available Markers
```ini
# From pytest.ini
budget    - Budget tool tests
trip      - Trip planning tool tests
calendar  - Calendar management tool tests
social    - Social networking tool tests
profile   - User profile tool tests
community - Community feature tool tests
admin     - Admin tool tests
critical  - High-priority tools that must pass
integration - Multi-tool workflow tests
```

### Combine Markers
```bash
# Critical budget tests only
pytest -m "budget and critical" -v

# Trip OR calendar tests
pytest -m "trip or calendar" -v

# Not integration tests
pytest -m "not integration" -v
```

---

## Expected Test Results

### Successful Run Output
```
======================== test session starts =========================
platform darwin -- Python 3.11.0, pytest-7.4.0, pluggy-1.3.0
rootdir: /backend
configfile: pytest.ini
plugins: asyncio-0.21.0, cov-4.1.0
collected 47 items

app/tests/test_budget_tools.py::test_create_expense_success PASSED    [  2%]
app/tests/test_budget_tools.py::test_create_expense_validation_error PASSED [  4%]
...
app/tests/test_social_tools.py::test_social_workflow_integration PASSED [100%]

======================== 47 passed in 2.35s ==========================
```

### With Coverage
```
======================== test session starts =========================
...
======================== 47 passed in 2.35s ==========================

---------- coverage: platform darwin, python 3.11.0 -----------
Name                                           Stmts   Miss  Cover
------------------------------------------------------------------
app/services/pam/tools/budget/create_expense      45      8    82%
app/services/pam/tools/budget/analyze_budget      38      5    87%
app/services/pam/tools/budget/track_savings       42      6    86%
app/services/pam/tools/trip/plan_trip             52     10    81%
app/services/pam/tools/trip/get_weather_forecast  40      7    82%
app/services/pam/tools/trip/find_cheap_gas        35      6    83%
app/services/pam/tools/trip/calculate_gas_cost    28      3    89%
------------------------------------------------------------------
TOTAL                                            280     45    84%
```

---

## Troubleshooting

### pytest Command Not Found
```bash
# Ensure pytest is installed
pip install pytest pytest-asyncio

# Check Python path
which python3
python3 -m pip list | grep pytest
```

### ModuleNotFoundError
```bash
# Install missing dependencies
pip install -r requirements.txt

# Add backend to PYTHONPATH
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
```

### Async Test Warnings
```bash
# Ensure pytest-asyncio is installed
pip install pytest-asyncio

# Check pytest.ini has asyncio_mode
cat pytest.ini | grep asyncio_mode
```

### Import Errors
```bash
# Ensure you're in the backend directory
cd backend

# Run tests with Python module syntax
python3 -m pytest app/tests/test_*.py
```

---

## Quick Test Commands

### Development Workflow
```bash
# Quick syntax check (all tests)
python3 -m py_compile app/tests/test_*.py

# Run tests with minimal output
pytest app/tests/test_*.py -q

# Run critical tests only
pytest -m critical -v

# Run with coverage
pytest app/tests/test_*.py --cov=app/services/pam/tools --cov-report=term
```

### Pre-Commit Check
```bash
# Run all tests before committing
pytest app/tests/test_*.py -v

# If all pass, commit
git add app/tests/
git commit -m "test: add automated tests for 10 PAM tools"
```

### CI/CD Simulation
```bash
# Simulate GitHub Actions test run
pytest app/tests/test_*.py \
       --cov=app/services/pam/tools \
       --cov-report=xml \
       --cov-report=term \
       -v
```

---

## Test File Locations

```
backend/
├── pytest.ini                          # pytest configuration
├── app/
│   └── tests/
│       ├── conftest.py                 # Shared fixtures (20+ fixtures)
│       ├── test_budget_tools.py        # Budget tool tests (11 tests)
│       ├── test_trip_tools.py          # Trip tool tests (13 tests)
│       ├── test_calendar_tools.py      # Calendar tool tests (12 tests)
│       └── test_social_tools.py        # Social tool tests (11 tests)
└── docs/
    ├── PAM_MANUAL_TESTING_CHECKLIST.md # Manual test guide (37 tools)
    └── PAM_TEST_SUMMARY_2025.md        # Comprehensive test summary
```

---

## Resources

- **Test Summary:** `docs/PAM_TEST_SUMMARY_2025.md`
- **Manual Testing:** `docs/PAM_MANUAL_TESTING_CHECKLIST.md`
- **pytest Docs:** https://docs.pytest.org/
- **pytest-asyncio Docs:** https://pytest-asyncio.readthedocs.io/
- **Coverage Docs:** https://coverage.readthedocs.io/

---

**Last Updated:** January 2025
**Maintained By:** Development Team
