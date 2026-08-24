# MRA VBC Opportunities - Testing Instructions

This document provides step-by-step instructions to run both Python (backend) and TypeScript/Jest (frontend) tests for the MRA VBC Opportunities project.

## Prerequisites

- Python 3.14+ installed
- Node.js 22+ installed
- npm installed

---

## Part 1: Python Backend Tests (FastAPI + pytest)

### Step 1: Navigate to the API directory

From the repository root:

```bash
cd api
```

### Step 2: Create a Python virtual environment

```bash
python3 -m venv venv
```

This creates a new `venv` folder in the `api` directory.

### Step 3: Activate the virtual environment

**On macOS/Linux:**
```bash
source venv/bin/activate
```

**On Windows:**
```bash
venv\Scripts\activate
```

You should see `(venv)` prefix in your terminal prompt when activated.

### Step 4: Install test dependencies

```bash
pip install pytest pytest-asyncio pytest-cov
```

Or install from the project's pyproject.toml:

```bash
pip install -e .
```

This installs all dependencies including optional `dev` dependencies for testing.

### Step 5: Run the tests

Run all tests with verbose output:

```bash
pytest -v
```

**Alternative commands:**

- Run tests with coverage report:
  ```bash
  pytest --cov
  ```

- Run tests for a specific file:
  ```bash
  pytest tests/test_auth_service.py -v
  ```

- Run a specific test class:
  ```bash
  pytest tests/test_auth_service.py::TestAuthService -v
  ```

- Run a specific test:
  ```bash
  pytest tests/test_auth_service.py::TestAuthService::test_verify_token_valid_jwt -v
  ```

### Step 6: View test results

Expected output:
```
collected 31 items

tests/test_api_endpoints.py::TestPydanticValidation::test_bulk_update_disposition_valid_request PASSED [  3%]
...
tests/test_csv_ingestion.py::TestCSVIngestion::test_ingest_malformed_csv PASSED [100%]

============================== 31 passed in 9.14s ==============================
```

### Step 7: Deactivate virtual environment (when done)

```bash
deactivate
```

---

## Part 2: Frontend Tests (Next.js + Jest)

### Step 1: Navigate to the app directory

From the repository root:

```bash
cd app
```

### Step 2: Install Node dependencies

```bash
npm install
```

This installs all dependencies listed in `package.json`, including Jest and testing libraries.

### Step 3: Run the tests

Run all tests with Jest:

```bash
npm test
```

### Step 4: Alternative test commands

- Run tests in watch mode (re-run on file changes):
  ```bash
  npm run test:watch
  ```

- Run tests with coverage report:
  ```bash
  npm run test:coverage
  ```

- Run a specific test file:
  ```bash
  npx jest __tests__/utils/api.test.ts
  ```

- Run tests matching a pattern:
  ```bash
  npx jest --testNamePattern="auth"
  ```

### Step 5: View test results

Expected output:
```
 PASS  __tests__/utils/api.test.ts
 PASS  __tests__/hooks/usePagination.test.ts
 PASS  __tests__/components/Component.test.tsx

Test Suites: 3 passed, 3 total
Tests:       18 passed, 18 total
```

---

## Running Both Test Suites (Complete Testing)

To run both Python and TypeScript tests in sequence:

**From repository root:**

```bash
# Test backend
cd api
source venv/bin/activate
pytest -v
deactivate

# Test frontend
cd ../app
npm install
npm test
```

Or create a test script:

```bash
#!/bin/bash
# From repository root

echo "=== Running Python Tests ==="
cd api
source venv/bin/activate
pytest -v
deactivate
cd ..

echo "=== Running Frontend Tests ==="
cd app
npm test
```

---

## Test Structure

### Backend Tests (api/tests/)

- **test_auth_service.py** - Tests JWT token verification, user login, user creation, provider assignment
- **test_csv_ingestion.py** - Tests CSV data ingestion, duplicate detection, null value handling
- **test_api_endpoints.py** - Tests Pydantic model validation, route structure, auth headers

**Total: 31 tests**

### Frontend Tests (app/__tests__/)

- **hooks/usePagination.test.ts** - Tests pagination logic, page navigation, offset calculation
- **utils/api.test.ts** - Tests API URL configuration, auth token handling, headers
- **components/Component.test.tsx** - Tests form inputs, buttons, modals, lists, conditional rendering

**Total: 18+ tests**

---

## Troubleshooting

### Python: "ModuleNotFoundError: No module named 'services'"

**Solution:** Make sure you're in the `api` directory and have installed dependencies:
```bash
cd api
pip install -e .
```

### Python: "pytest: command not found"

**Solution:** Make sure the virtual environment is activated:
```bash
source venv/bin/activate
pip install pytest pytest-asyncio pytest-cov
```

### Frontend: "Cannot find module '@testing-library/react'"

**Solution:** Reinstall dependencies:
```bash
cd app
rm -rf node_modules package-lock.json
npm install
```

### Frontend: "jest: command not found"

**Solution:** Install dependencies:
```bash
cd app
npm install
npm test
```

---

## Test Coverage

The project includes meaningful unit tests for:

- **Authentication** - Token verification, login, user creation
- **CSV Processing** - Data ingestion, duplicate detection, null handling
- **API Validation** - Request/response schema validation, auth headers
- **Frontend Logic** - Pagination, API calls, UI interactions

**Coverage is focused on critical business logic rather than 100% coverage.**

---

## CI/CD Integration

These tests are configured to run:
- **Locally** - Via pytest and npm test commands
- **Vercel (Optional)** - Can be integrated into build process using vercel.json

For now, tests are intended for local development and validation.
