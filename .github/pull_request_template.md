## 📝 Description

Please include a summary of the changes and the related issue/puzzle (if applicable). Also include relevant motivation and context.

Fixes / Closes / Resolves # (issue number) or pre-fills Puzzle ID # (puzzle ID)

---

## 🛠️ Type of Change

Please delete options that are not relevant:

- [ ] **Bug Fix** (non-breaking change which fixes an issue)
- [ ] **New Feature** (non-breaking change which adds functionality)
- [ ] **Registry Update** (adding or updating daily puzzle solutions)
- [ ] **Documentation Update** (typos, README, CONTRIBUTING, etc.)
- [ ] **Refactor / Optimization** (improving code quality without adding features or fixing bugs)
- [ ] **Tests** (adding or updating unit/integration tests)

---

## 🧪 How Has This Been Tested?

Please describe the tests that you ran to verify your changes. Provide instructions so we can reproduce. Please also list any relevant details for your test configuration.

- [ ] **Automated Code Checks:** Ran `pnpm check` and `pnpm fix` without errors.
- [ ] **Unit Tests:** Ran `pnpm test` and all tests passed.
- [ ] **Registry Integrity Check (If updating registry):** Verified via `pnpm exec tsx scripts/validate-registry.ts` and `pnpm exec vitest run scripts/validate-registry.test.ts`.
- [ ] **Manual Browser Sandbox Testing:** Loaded unpacked extension (`build/chrome-mv3-dev`) on Google Chrome and verified the functionality against the active game page.

---

## 📋 Submission Checklist

- [ ] My code follows the style guidelines of this project.
- [ ] I have performed a self-review of my own code.
- [ ] I have commented on my code, particularly in hard-to-understand areas.
- [ ] I have made corresponding changes to the documentation (if applicable).
- [ ] My changes generate no new warnings or console errors.
- [ ] Any dependent changes have been merged and published in downstream modules.

---

## 📸 Screenshots or Screen Recordings (Optional)

*If applicable, add screenshots or recordings to help demonstrate your changes visually (highly recommended for UI/UX modifications).*
