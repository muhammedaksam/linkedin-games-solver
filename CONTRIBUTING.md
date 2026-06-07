# 🤝 Contributing to LinkedIn Games Solver

First off, thank you for taking the time to contribute! 🎉

Projects like this thrive because of people like you. Whether you are fixing a bug, adding support for a new game, optimizing our React Fiber bridge, or simply contributing daily puzzle answers to our registry, your help is incredibly valuable.

Please read through this guide to understand our development workflow, coding standards, and how to get your changes merged smoothly.

---

## 📜 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please report any unacceptable behavior to [info@muhammedaksam.com.tr](mailto:info@muhammedaksam.com.tr).

---

## 🗺️ Ways to Contribute

There are several ways you can help improve the extension:

1. **Submitting Daily Puzzle Answers**: Help keep our offline solver accurate and zero-cost by contributing daily trivia solutions for **Crossclimb** and **Pinpoint**.
2. **Reporting Bugs & Glitches**: Open an issue to describe any layout breakages, extraction failures, or incorrect solver behaviors.
3. **Suggesting Features**: Suggest new heuristics, UI themes, custom stealth pacing modes, or support for newly introduced LinkedIn games.
4. **Improving Documentation**: Fix typos, clarify architecture flows, or add installation tips in `README.md`.
5. **Contributing Code**: Implement bug fixes, optimize performance, or write unit tests.

---

## 🗃️ Registry Contributions (Daily Puzzles)

For trivia-based Ember.js games like **Pinpoint** and **Crossclimb**, we maintain an offline, zero-hallucination database inside the `registry/` directory. Keeping this up-to-date is a community effort!

We offer three easy ways to contribute today's answers:

### 1️⃣ Method 1: 1-Click Submit via Extension (Recommended)

1. Play the game on LinkedIn with the extension active.
2. Open the extension popup or side panel, and click on the **Debug** tab.
3. Click the **"Submit Answer"** button under today's puzzle state.
4. This will open a pre-filled GitHub issue template containing all the board clues and answers in your browser! Just click **"Submit new issue"** on GitHub.
5. Our CI/CD pipeline will automatically parse, validate, and merge your submission, crediting you as a contributor.

### 2️⃣ Method 2: Manual Issue Template

1. Go to our repository's [Issues](../../issues) tab and click **New Issue**.
2. Select the **"Submit Daily Puzzle Answers"** issue template.
3. Copy-paste the clues and answers from your daily board and submit.

### 3️⃣ Method 3: Direct Pull Request (PR)

If you prefer adding the JSON entry directly:

1. Format your entry according to the existing schemas in:
   - **[`registry/crossclimb.json`](registry/crossclimb.json)**
   - **[`registry/pinpoint.json`](registry/pinpoint.json)**
2. Save the file and validate your changes locally:

   ```bash
   # Run the registry integrity validation script
   pnpm exec tsx scripts/validate-registry.ts

   # Run validation unit tests
   pnpm exec vitest run scripts/validate-registry.test.ts
   ```

3. Commit your changes and open a Pull Request.

---

## 🛠️ Development Setup

To modify code, you'll need to set up the extension on your machine.

### Prerequisites

- **Node.js** (v20 or higher is recommended)
- **pnpm** (preferred package manager)

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/muhammedaksam/linkedin-games-solver.git
cd linkedin-games-solver

# Install all dependencies
pnpm install
```

### 2. Configure Environment Variables

Copy the template configuration file to `.env.local` to enable local API integrations:

```bash
cp .env.example .env.local
```

If you are developing telemetry features or AI solvers, populate the environment variables. Otherwise, they will fail safely or skip gracefully during development.

### 3. Start the Development Server

```bash
pnpm dev
```

This launches Plasmo's hot-reloading development server.

### 4. Load the Extension in Chrome

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Toggle the **Developer mode** switch in the top-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select the `build/chrome-mv3-dev` directory created by Plasmo inside your workspace.

---

## 📂 Codebase Architecture Overview

Familiarize yourself with the project structure before writing code:

```
├── .github/              # GitHub Action workflows & issue templates
├── assets/               # Core extension icons and static visuals
├── components/           # Reusable UI components built with React and Tailwind CSS
├── contents/             # Content scripts running in page context (e.g. logger-main.ts bridge)
├── games/                # Custom solvers, state extractors, and patch rules for each game
│   ├── queens.ts         # Queens game logic (React Fiber extraction & grid solver)
│   ├── tango.ts          # Tango solver algorithms
│   ├── pinpoint.ts       # Pinpoint database queries & LLM fallback pipelines
│   └── ...
├── lib/                  # Shared analytical, storage, and telemetry utility functions
│   ├── analytics.ts      # Anonymous GA4 event measurement proxy
│   └── ...
├── public/_locales/      # Multilingual JSON translation files (en, tr)
├── registry/             # Database for offline puzzles (Pinpoint & Crossclimb)
├── scripts/              # Codebase scripts (store asset generation, registry validations)
├── background.ts         # Extension Background Service Worker (manages storage, API calls, telemetry)
├── content.tsx           # Primary Content Script (mounts floating overlay, interfaces with games)
├── popup.tsx             # Pop-up window React layout
└── sidepanel.tsx         # Sidepanel utility React layout
```

---

## 🎨 Coding Standards & Quality Workflow

To keep our codebase clean, maintainable, and robust, we enforce a strict linting, formatting, and testing workflow.

### 💅 Formatting and Linting

We use **Prettier** and **ESLint** to enforce a uniform style.

- **Auto-Fix Style and Lint issues**:
  ```bash
  pnpm fix
  ```
- **Check for Code Compliance**:
  ```bash
  pnpm check
  ```

### 🧪 Writing and Running Tests

We use **Vitest** for running our unit tests.

- **Run all unit tests once**:
  ```bash
  pnpm test
  ```
- **Run tests in watch mode** (during development):
  ```bash
  pnpm test:watch
  ```

### 🧱 Framework Guidelines

- **Chrome APIs**: Always coordinate asynchronous messaging via `chrome.runtime.sendMessage` and execute long-running requests or API operations (like GA4 logs) inside `background.ts` to bypass page CSP restrictions.
- **React Components**: Leverage tailwind utilities and classes. Follow [shadcn/ui](https://ui.shadcn.com/) guidelines if introducing new interactive primitives.
- **Strict Typing**: Avoid using `any`. Write robust TypeScript interfaces for both game states and internal runtime communication.

---

## 🚀 Submitting a Pull Request (PR)

When you're ready to submit your changes, follow these steps:

1. **Branch Naming**:
   - `feat/some-cool-feature` for new features.
   - `fix/some-bug` for bug fixes.
   - `docs/clarify-readme` for documentation.
   - `registry/add-puzzle-758` for registry updates.
2. **Commit Messages**: Use clear, semantic commit messages (e.g., `feat(queens): optimize grid check speed`, `fix(tango): resolve border overlap styling error`).
3. **Synchronize**: Ensure your branch is up-to-date with the latest `main` branch.
4. **Self-Review Checklist**:
   - [ ] Did I run `pnpm fix` to check for formatting and linting errors?
   - [ ] Did all tests pass via `pnpm test`?
   - [ ] Did I verify the extension builds without errors using `pnpm build`?
   - [ ] If I added a new game or feature, did I document it or add tests?
5. **Open the PR**: Provide a clear, detailed summary of your changes, what problem they solve, and how you verified them. Attach screenshots/GIFs for visual or UI-related changes!

Thank you again for making the **LinkedIn Games Solver** community amazing! ❤️
