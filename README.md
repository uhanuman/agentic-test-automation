# Agentic Test Automation Framework (Repo-2)

> **Decoupled Executable Test Automation Framework & Scripts**  
> Generated and synthesized by **Agentic Quality Engineering Workflow** (`agentic-quality-engineering-gemini`).

---

## 🏛 Architecture Overview: Two-Repo Workspace Segregation

This repository is segregated from the core AI agent orchestrator to guarantee strict decoupling of executable test code and automation harnesses from agent prompt definitions, evaluation benchmarks, and raw quality artifacts:

| Repository | Scope & Contents |
| :--- | :--- |
| **Repo-1: `agentic-quality-engineering-gemini`** | Agent specifications (`agents/`), LLM judges & evaluators (`evals/`), quality gate artifacts (`test-artifacts/`), orchestrator runtime DAG |
| **Repo-2: `agentic-test-automation`** (This Repo) | Executable automation framework (Playwright, Axe-core), test fixtures, configuration, and executable specs (`tests/`) |

---

## 📂 Repository Structure

```text
agentic-test-automation/
├── tests/                          # Executable test suites
│   ├── part-category.api.spec.ts   # Category CRUD & hierarchy verification (TC-001, 002, 003)
│   ├── part-lifecycle.api.spec.ts  # Part lifecycle, activation & negative boundary tests (TC-004 to 008)
│   ├── part-search.api.spec.ts     # Search, filter & pagination validation (TC-009, 010)
│   ├── part-security.api.spec.ts   # RBAC, Token auth & injection resilience (TC-011 to 013, TC-SEC-*)
│   ├── part-ui.spec.ts             # Playwright UI tree & modal focus traps (TC-014, 015)
│   └── part-a11y.spec.ts           # Axe-core WCAG 2.1 AA automated scans (TC-A11Y-003)
├── playwright.config.ts            # Multi-project test runner config (API + Chromium UI)
├── tsconfig.json                   # Strict TypeScript compiler options
├── package.json                    # Dependencies & npm test scripts
├── .env.example                    # Target environment variable template
└── README.md                       # Architecture & execution guide
```

---

## 🚀 Getting Started

### 1. Installation

```bash
npm install
npx playwright install --with-deps chromium
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and set your target InvenTree backend coordinates:

```bash
cp .env.example .env
```

```ini
INVENTREE_BASE_URL=http://localhost:8000
INVENTREE_API_TOKEN=your_auth_token_here
INVENTREE_READONLY_TOKEN=your_readonly_token_here
```

### 3. Test Execution

| Target | Command |
| :--- | :--- |
| **All Test Suites** | `npm test` |
| **API Suites Only** | `npm run test:api` |
| **UI Suites Only** | `npm run test:ui` |
| **Accessibility Audit** | `npm run test:a11y` |
| **Headed Browser Mode** | `npm run test:headed` |
| **Debug Mode / Inspector**| `npm run test:debug` |
| **Interactive HTML Report**| `npm run report` |

---

## 🔗 Traceability to Agentic Workflow

All test suites in `tests/` map 1:1 with artifacts produced in `Repo-1`:
- **`REQ-INVENTREE-PART-001`**: InvenTree Part & Category Management Specification
- **`AUT-INVENTREE-PART-001`**: SDET Automation Blueprint Contracts
- **`SCN-TC-INVENTREE-PART-001`**: Functional & NFR Test Cases
