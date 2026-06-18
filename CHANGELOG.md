# Changelog

## v0.4.0

[compare changes](https://github.com/muhammedaksam/linkedin-games-solver/compare/v0.3.0...v0.4.0)

### 🚀 Enhancements

- Add support for the Wend game and integrate it into the solver suite ([6aa49b5](https://github.com/muhammedaksam/linkedin-games-solver/commit/6aa49b5))
- Add support for the Wend game and update existing registry and validation logic ([be479ff](https://github.com/muhammedaksam/linkedin-games-solver/commit/be479ff))
- Add Wend game support with registry integration, inject main-world bridge, and refactor analytics configuration ([89cdda4](https://github.com/muhammedaksam/linkedin-games-solver/commit/89cdda4))

### 🩹 Fixes

- **wend:** Prevent JSON parsing crash when AI returns single word object ([6842b35](https://github.com/muhammedaksam/linkedin-games-solver/commit/6842b35))
- **wend:** Request top-level JSON object to prevent AI from dropping array items ([fb68b08](https://github.com/muhammedaksam/linkedin-games-solver/commit/fb68b08))
- **wend:** Delegate index-to-letter/adjacency paths search to programmatic backtracking solver ([98e8e30](https://github.com/muhammedaksam/linkedin-games-solver/commit/98e8e30))
- **wend:** Remove duplicate findPathsForWords and reuse the pre-existing one ([208920d](https://github.com/muhammedaksam/linkedin-games-solver/commit/208920d))
- **wend:** Address unknown type cast warning in parseAIResponse ([4ed6399](https://github.com/muhammedaksam/linkedin-games-solver/commit/4ed6399))
- Add @wxt-dev/analytics/module to wxt config ([c7af420](https://github.com/muhammedaksam/linkedin-games-solver/commit/c7af420))

### 💅 Refactors

- Migrate legacy @plasmohq/messaging to @webext-core/messaging ([2ae5116](https://github.com/muhammedaksam/linkedin-games-solver/commit/2ae5116))
- Format answers arrays in registry JSON files for better readability ([d60bc69](https://github.com/muhammedaksam/linkedin-games-solver/commit/d60bc69))
- Improve code formatting and readability across game logic and messaging modules ([bc6b6c1](https://github.com/muhammedaksam/linkedin-games-solver/commit/bc6b6c1))
- Enhance mouse event simulation with coordinate offsets and improve game interaction sequences ([afac80d](https://github.com/muhammedaksam/linkedin-games-solver/commit/afac80d))

### 🏡 Chore

- Update solver registry ([51f980e](https://github.com/muhammedaksam/linkedin-games-solver/commit/51f980e))
- Update solver registry ([961043f](https://github.com/muhammedaksam/linkedin-games-solver/commit/961043f))
- Update solver registry ([38ba05f](https://github.com/muhammedaksam/linkedin-games-solver/commit/38ba05f))
- Update solver registry ([69e45d5](https://github.com/muhammedaksam/linkedin-games-solver/commit/69e45d5))
- Update solver registry ([098e9e0](https://github.com/muhammedaksam/linkedin-games-solver/commit/098e9e0))
- Update solver registry ([528643f](https://github.com/muhammedaksam/linkedin-games-solver/commit/528643f))
- Update solver registry ([93654ab](https://github.com/muhammedaksam/linkedin-games-solver/commit/93654ab))
- Update solver registry ([8a9d677](https://github.com/muhammedaksam/linkedin-games-solver/commit/8a9d677))
- Update solver registry ([8de1380](https://github.com/muhammedaksam/linkedin-games-solver/commit/8de1380))
- Update solver registry ([86f38d5](https://github.com/muhammedaksam/linkedin-games-solver/commit/86f38d5))
- Update solver registry ([4e15ffa](https://github.com/muhammedaksam/linkedin-games-solver/commit/4e15ffa))
- Update solver registry ([4748aeb](https://github.com/muhammedaksam/linkedin-games-solver/commit/4748aeb))
- Update solver registry ([1f775bd](https://github.com/muhammedaksam/linkedin-games-solver/commit/1f775bd))
- Update solver registry ([6ae1c37](https://github.com/muhammedaksam/linkedin-games-solver/commit/6ae1c37))
- Update solver registry ([f694890](https://github.com/muhammedaksam/linkedin-games-solver/commit/f694890))
- Update application icons and localized store assets ([5673d42](https://github.com/muhammedaksam/linkedin-games-solver/commit/5673d42))
- Refactor description formatting in all locales and update game registry/logic ([1167427](https://github.com/muhammedaksam/linkedin-games-solver/commit/1167427))
- Update solver registry ([e1c18e6](https://github.com/muhammedaksam/linkedin-games-solver/commit/e1c18e6))
- Update solver registry ([26049b0](https://github.com/muhammedaksam/linkedin-games-solver/commit/26049b0))
- Update solver registry ([07482a3](https://github.com/muhammedaksam/linkedin-games-solver/commit/07482a3))

### ❤️ Contributors

- Muhammed Mustafa AKSAM ([@muhammedaksam](https://github.com/muhammedaksam))

## v0.3.0

[compare changes](https://github.com/muhammedaksam/linkedin-games-solver/compare/v0.2.0...v0.3.0)

### 🚀 Enhancements

- Implement automated asset uploader for Firefox Add-ons (AMO) ([09f209a](https://github.com/muhammedaksam/linkedin-games-solver/commit/09f209a))
- Add omnibox search suggestions and implement anonymous telemetry reporting ([10265e9](https://github.com/muhammedaksam/linkedin-games-solver/commit/10265e9))
- Automatically lock issues upon pull request merge ([4f64768](https://github.com/muhammedaksam/linkedin-games-solver/commit/4f64768))
- Implement async locale initialization with chrome.storage.sync support and dynamic message loading ([9623245](https://github.com/muhammedaksam/linkedin-games-solver/commit/9623245))

### 💅 Refactors

- Migrate analytics implementation to @wxt-dev/analytics and remove custom tracking logic ([0998616](https://github.com/muhammedaksam/linkedin-games-solver/commit/0998616))
- Improve i18n handling, add Plasmo shims to test config, and encapsulate context menu updates ([514d458](https://github.com/muhammedaksam/linkedin-games-solver/commit/514d458))

### 🏡 Chore

- Update store assets and localize metadata for multiple languages ([b635c26](https://github.com/muhammedaksam/linkedin-games-solver/commit/b635c26))
- Update solver registry ([09df002](https://github.com/muhammedaksam/linkedin-games-solver/commit/09df002))
- Update solver registry ([ee6ed2e](https://github.com/muhammedaksam/linkedin-games-solver/commit/ee6ed2e))
- Standardize smart quote usage across registry clue definitions ([c6224f2](https://github.com/muhammedaksam/linkedin-games-solver/commit/c6224f2))
- Update solver registry ([9063c64](https://github.com/muhammedaksam/linkedin-games-solver/commit/9063c64))
- Update solver registry ([8d18937](https://github.com/muhammedaksam/linkedin-games-solver/commit/8d18937))
- Remove unused plasmo dependencies and update project packages ([bf44eb3](https://github.com/muhammedaksam/linkedin-games-solver/commit/bf44eb3))
- Update project dependencies in package.json and pnpm-lock.yaml ([56e7936](https://github.com/muhammedaksam/linkedin-games-solver/commit/56e7936))
- Add .prettierignore file to exclude build artifacts and static assets ([828aab3](https://github.com/muhammedaksam/linkedin-games-solver/commit/828aab3))
- Update solver registry ([c67902d](https://github.com/muhammedaksam/linkedin-games-solver/commit/c67902d))
- Update solver registry ([123ad8d](https://github.com/muhammedaksam/linkedin-games-solver/commit/123ad8d))
- Update localized store assets, add new icons, and refactor devtools launcher configuration ([d0033ac](https://github.com/muhammedaksam/linkedin-games-solver/commit/d0033ac))
- Update documentation formatting across all localized descriptions and refresh generation script ([62c21e4](https://github.com/muhammedaksam/linkedin-games-solver/commit/62c21e4))

### ❤️ Contributors

- Muhammed Mustafa AKSAM ([@muhammedaksam](https://github.com/muhammedaksam))

## v0.2.0

[compare changes](https://github.com/muhammedaksam/linkedin-games-solver/compare/v0.1.0...v0.2.0)

### 🚀 Enhancements

- Implement comprehensive internationalization support by adding new locale message files and updating the i18n configuration. ([85ea298](https://github.com/muhammedaksam/linkedin-games-solver/commit/85ea298))

### 📖 Documentation

- Reformat store description files to use bulleted lists and consistent styling ([9abf239](https://github.com/muhammedaksam/linkedin-games-solver/commit/9abf239))

### 🏡 Chore

- Update solver registry ([b912452](https://github.com/muhammedaksam/linkedin-games-solver/commit/b912452))
- Update solver registry ([ba5cd40](https://github.com/muhammedaksam/linkedin-games-solver/commit/ba5cd40))
- Update solver registry ([3f613b8](https://github.com/muhammedaksam/linkedin-games-solver/commit/3f613b8))
- Update solver registry ([3782240](https://github.com/muhammedaksam/linkedin-games-solver/commit/3782240))
- Update solver registry ([5825fd3](https://github.com/muhammedaksam/linkedin-games-solver/commit/5825fd3))
- Remove unused translation and verification scripts from package.json ([febdbd4](https://github.com/muhammedaksam/linkedin-games-solver/commit/febdbd4))
- Update localized store assets, screenshots, and descriptions ([8e868ef](https://github.com/muhammedaksam/linkedin-games-solver/commit/8e868ef))
- **release:** V0.1.1 ([4ee11b7](https://github.com/muhammedaksam/linkedin-games-solver/commit/4ee11b7))
- **release:** V0.1.1" ([6cc50ac](https://github.com/muhammedaksam/linkedin-games-solver/commit/6cc50ac))

### ❤️ Contributors

- Muhammed Mustafa AKSAM ([@muhammedaksam](https://github.com/muhammedaksam))
- GitHub Actions ([@github-actions-up-and-running](https://github.com/github-actions-up-and-running))

## v0.1.0

### 🚀 Enhancements

- Implement solvers for multiple LinkedIn games and add localized UI dashboard ([1ac2f33](https://github.com/muhammedaksam/linkedin-games-solver/commit/1ac2f33))
- Add Pinpoint, Crossclimb, and AI solver support with history tracking ([e18cdf1](https://github.com/muhammedaksam/linkedin-games-solver/commit/e18cdf1))
- Implement storage utility and add input and select UI components with localization support ([42969e8](https://github.com/muhammedaksam/linkedin-games-solver/commit/42969e8))
- Replace lucide-react icons with custom SVG assets for all game configurations ([85de98c](https://github.com/muhammedaksam/linkedin-games-solver/commit/85de98c))
- Add anti-cheat pacing delay and support dynamic row counts in Crossclimb solver ([551f8bd](https://github.com/muhammedaksam/linkedin-games-solver/commit/551f8bd))
- Inject layout styles and dynamically sync button wrapper classes for improved UI consistency ([9d0e5a7](https://github.com/muhammedaksam/linkedin-games-solver/commit/9d0e5a7))
- Implement dashboard and localize full UI with disclaimer footer and dynamic puzzle counting ([27675c7](https://github.com/muhammedaksam/linkedin-games-solver/commit/27675c7))
- Add SVG and PNG icon variants for light and dark themes ([eb101c2](https://github.com/muhammedaksam/linkedin-games-solver/commit/eb101c2))
- Implement options page and update localization labels for settings management ([a67f336](https://github.com/muhammedaksam/linkedin-games-solver/commit/a67f336))
- Add robust solve time detection for results pages and improve UI container initialization logic ([a2ea058](https://github.com/muhammedaksam/linkedin-games-solver/commit/a2ea058))
- Add content script for automatic game completion tracking and solver orchestration ([b76709a](https://github.com/muhammedaksam/linkedin-games-solver/commit/b76709a))
- Replace content.ts with content.tsx, add i18n utility, and update translations. ([5984aec](https://github.com/muhammedaksam/linkedin-games-solver/commit/5984aec))
- Improve toolbar detection by targeting specific game container selectors ([0f861b6](https://github.com/muhammedaksam/linkedin-games-solver/commit/0f861b6))
- Implement multi-language support with dynamic locale switching and localized game descriptions ([4c11522](https://github.com/muhammedaksam/linkedin-games-solver/commit/4c11522))
- Add Contributor Covenant Code of Conduct to promote community standards ([a7f0efc](https://github.com/muhammedaksam/linkedin-games-solver/commit/a7f0efc))
- Update localization support by renaming Chinese locale and adding new messages ([f63b2f0](https://github.com/muhammedaksam/linkedin-games-solver/commit/f63b2f0))
- Add generate:store-assets ([4762772](https://github.com/muhammedaksam/linkedin-games-solver/commit/4762772))
- **store-assets:** Generate social preview images (1280x640 & 640x320) with localized overlays ([83588fa](https://github.com/muhammedaksam/linkedin-games-solver/commit/83588fa))
- **store-assets:** Add social previews and README docs ([0e17005](https://github.com/muhammedaksam/linkedin-games-solver/commit/0e17005))
- **i18n,assets:** Upgrade store promo assets and expand CWS compliant locales ([98565d3](https://github.com/muhammedaksam/linkedin-games-solver/commit/98565d3))
- Update store assets and localize metadata for PT and ZH-TW regions ([ed61381](https://github.com/muhammedaksam/linkedin-games-solver/commit/ed61381))
- Add undo game completion via right-click context menu ([e8e1809](https://github.com/muhammedaksam/linkedin-games-solver/commit/e8e1809))
- **i18n:** Enhance locale support for DayPicker and update date formatting ([74c6820](https://github.com/muhammedaksam/linkedin-games-solver/commit/74c6820))
- Append localized disclaimers to generated store descriptions ([5b943a7](https://github.com/muhammedaksam/linkedin-games-solver/commit/5b943a7))
- Implement customizable solve speed and educational hint mode settings ([46b2b67](https://github.com/muhammedaksam/linkedin-games-solver/commit/46b2b67))
- Add ESLint, Prettier scripts and fix all lint errors ([515b0ad](https://github.com/muhammedaksam/linkedin-games-solver/commit/515b0ad))
- **crossclimb:** Improve candidate generation quality with reasoning self-validation, expert ladder transitions, and auto-check self-healing ([13a86e2](https://github.com/muhammedaksam/linkedin-games-solver/commit/13a86e2))
- **ai:** Integrate chrome built-in prompt api gemini nano ([0ca4447](https://github.com/muhammedaksam/linkedin-games-solver/commit/0ca4447))
- **locales:** Add Chrome Built-in AI guide text in multiple languages ([e0607d3](https://github.com/muhammedaksam/linkedin-games-solver/commit/e0607d3))
- **locales:** Add Chrome Built-in AI guide title and description in multiple languages ([caa0d5a](https://github.com/muhammedaksam/linkedin-games-solver/commit/caa0d5a))
- Implement localized premium side panel debugger and console logs feed ([0b8a5c4](https://github.com/muhammedaksam/linkedin-games-solver/commit/0b8a5c4))
- Add shadcn MCP server configuration and move package to devDependencies ([69bc51a](https://github.com/muhammedaksam/linkedin-games-solver/commit/69bc51a))
- Add daily reminders, profile sync storage, and site-specific sidepanel ([619dc60](https://github.com/muhammedaksam/linkedin-games-solver/commit/619dc60))
- Localize daily reminders and desktop notifications across all supported languages ([835d521](https://github.com/muhammedaksam/linkedin-games-solver/commit/835d521))
- Add keyboard shortcuts, sidepanel auto-open, and shadcn checkboxes ([cb6c2fa](https://github.com/muhammedaksam/linkedin-games-solver/commit/cb6c2fa))
- Implement phase 2 advanced integrations (omnibox navigation, storage session logger, optional permissions dialog) ([a4b9c62](https://github.com/muhammedaksam/linkedin-games-solver/commit/a4b9c62))
- Implement phase 3 integrations (multimodal visual ai solver, f12 devtools diagnostics tab, built-in ai download telemetry) ([bb22fa6](https://github.com/muhammedaksam/linkedin-games-solver/commit/bb22fa6))
- Localize DevTools registration, optimize visual inspector scaling, and integrate premium copy actions toolbar ([730513f](https://github.com/muhammedaksam/linkedin-games-solver/commit/730513f))
- **crossclimb:** Decouple ladder prompt verification and improve solver accuracy ([1fc0889](https://github.com/muhammedaksam/linkedin-games-solver/commit/1fc0889))
- Implement Phase 3 MAIN world React Fiber board extraction for Patches/Queens/Tango/Zip with robust fallback and Ember framework safety ([d2314b4](https://github.com/muhammedaksam/linkedin-games-solver/commit/d2314b4))
- Fix Tango grid visualizer duplication and optimize F12 DevTools visual inspector ([af0c102](https://github.com/muhammedaksam/linkedin-games-solver/commit/af0c102))
- Render -bonus games on statistics dashboard with localized badge ([0df0bf3](https://github.com/muhammedaksam/linkedin-games-solver/commit/0df0bf3))
- Migrate AI API keys to AES secure storage and clean up legacy variables ([dbcfdaa](https://github.com/muhammedaksam/linkedin-games-solver/commit/dbcfdaa))
- Implement dynamic action badges and context menu shortcuts ([57d0164](https://github.com/muhammedaksam/linkedin-games-solver/commit/57d0164))
- Add contextMenus permission to extension manifest ([aedf25d](https://github.com/muhammedaksam/linkedin-games-solver/commit/aedf25d))
- Implement dynamic context-aware right-click menus & full translation locales ([c48d192](https://github.com/muhammedaksam/linkedin-games-solver/commit/c48d192))
- Implement remote pre-solved answers registry for pinpoint and crossclimb ([3afc2b1](https://github.com/muhammedaksam/linkedin-games-solver/commit/3afc2b1))
- **debug:** Add daily puzzle registry extraction and copy tool ([5f2afaa](https://github.com/muhammedaksam/linkedin-games-solver/commit/5f2afaa))
- **debug:** Localize daily puzzle extraction copy labels ([fffb8d2](https://github.com/muhammedaksam/linkedin-games-solver/commit/fffb8d2))
- Add Crossclimb and Pinpoint puzzle data for day 758 to registry ([97a45bb](https://github.com/muhammedaksam/linkedin-games-solver/commit/97a45bb))
- **ci:** Implement automated registry updates pipeline and daily puzzle issue template ([d796a88](https://github.com/muhammedaksam/linkedin-games-solver/commit/d796a88))
- **ci:** Switch pipeline from direct push on main to Pull Request review based flow ([5035e6a](https://github.com/muhammedaksam/linkedin-games-solver/commit/5035e6a))
- **ci:** Assign both the issue submitter and maintainer to the created pull request ([20f252f](https://github.com/muhammedaksam/linkedin-games-solver/commit/20f252f))
- Add puzzle data for Crossclimb and Pinpoint ([c10e396](https://github.com/muhammedaksam/linkedin-games-solver/commit/c10e396))
- **ci:** Prevent duplicate PRs by auto-detecting and closing duplicate puzzle submissions ([ffa6b8a](https://github.com/muhammedaksam/linkedin-games-solver/commit/ffa6b8a))
- **ci:** Automatically replace pending-review label with merged on linked issues when PR is merged ([fe4e774](https://github.com/muhammedaksam/linkedin-games-solver/commit/fe4e774))
- **ui:** Add 1-click Submit Answer button to debug quick actions in extension panel ([2a3f2d2](https://github.com/muhammedaksam/linkedin-games-solver/commit/2a3f2d2))
- **i18n:** Add debugSubmitAnswer and debugCopyRegistryShort to all locales, bump version to 0.0.29, and update README.md ([c62f5a4](https://github.com/muhammedaksam/linkedin-games-solver/commit/c62f5a4))
- Update puzzle data for crossclimb and pinpoint games ([1a5f3a0](https://github.com/muhammedaksam/linkedin-games-solver/commit/1a5f3a0))
- Update puzzle data for crossclimb and pinpoint games ([cf94a42](https://github.com/muhammedaksam/linkedin-games-solver/commit/cf94a42))
- Integrate anonymous GA4 telemetry and setting opt-out toggle ([2fd3d3a](https://github.com/muhammedaksam/linkedin-games-solver/commit/2fd3d3a))
- Implement image preprocessing using chrome offscreen API and declarative messaging ([a3191bb](https://github.com/muhammedaksam/linkedin-games-solver/commit/a3191bb))
- **store:** Modularize English assets and optimize uploader robustly ([0746e1c](https://github.com/muhammedaksam/linkedin-games-solver/commit/0746e1c))
- Add cross-browser build scripts, update privacy policy, and configure manifest web accessibility ([eff9830](https://github.com/muhammedaksam/linkedin-games-solver/commit/eff9830))
- Add browser-specific settings for Firefox extension compatibility ([e1e0aa2](https://github.com/muhammedaksam/linkedin-games-solver/commit/e1e0aa2))
- **store-assets:** Support CJK fonts in promo generation and automate Edge store asset uploads ([9a31d0f](https://github.com/muhammedaksam/linkedin-games-solver/commit/9a31d0f))
- Update validation to allow alphanumeric strings in Crossclimb puzzle answers and words ([cec33af](https://github.com/muhammedaksam/linkedin-games-solver/commit/cec33af))
- Add WXT type preparation step to registry validation workflow ([94d3ea8](https://github.com/muhammedaksam/linkedin-games-solver/commit/94d3ea8))
- Add dashboard tab entrypoint and update launcher styles ([ca4133c](https://github.com/muhammedaksam/linkedin-games-solver/commit/ca4133c))

### 🩹 Fixes

- Add cooldown check for game controls and implement dynamic anchor resolution for SPA navigation ([2afeed8](https://github.com/muhammedaksam/linkedin-games-solver/commit/2afeed8))
- Remove update_locales.py file ([824f5ca](https://github.com/muhammedaksam/linkedin-games-solver/commit/824f5ca))
- Resolve Zip solver pathfinding failures ([5a98beb](https://github.com/muhammedaksam/linkedin-games-solver/commit/5a98beb))
- Improve Queens solver region detection ([7cc8995](https://github.com/muhammedaksam/linkedin-games-solver/commit/7cc8995))
- Overhaul Crossclimb solver with two-phase strategy ([c38e330](https://github.com/muhammedaksam/linkedin-games-solver/commit/c38e330))
- Update date-fns dependency to version 4.2.1 and add pnpm workspace configuration ([b6036c4](https://github.com/muhammedaksam/linkedin-games-solver/commit/b6036c4))
- **zip:** Rewrite wall detection to be completely class-free and future-proof ([e79b402](https://github.com/muhammedaksam/linkedin-games-solver/commit/e79b402))
- **crossclimb:** Resolve row-sorting bug using word text content instead of data-guess-id ([25942e0](https://github.com/muhammedaksam/linkedin-games-solver/commit/25942e0))
- Correct relative HTML path for F12 DevTools panel ([c1a5181](https://github.com/muhammedaksam/linkedin-games-solver/commit/c1a5181))
- Change devtools panel to default export to resolve React error 130 ([af03e82](https://github.com/muhammedaksam/linkedin-games-solver/commit/af03e82))
- Restore F12 panel pagePath as tabs/devtools-panel.html relative to extension root ([8c767f8](https://github.com/muhammedaksam/linkedin-games-solver/commit/8c767f8))
- **types:** Resolve Prompt API availability mismatch, tsconfig ignoreDeprecations, and multimodal PromptInputs types ([c2615d9](https://github.com/muhammedaksam/linkedin-games-solver/commit/c2615d9))
- **crossclimb:** Improve top/bottom joint solver with self-healing DOM evaluation ([54bd418](https://github.com/muhammedaksam/linkedin-games-solver/commit/54bd418))
- **crossclimb:** Support bidirectional word ladders and dynamic top/bottom reference words ([4876e90](https://github.com/muhammedaksam/linkedin-games-solver/commit/4876e90))
- **ci:** Make process-submission trigger robust using body signature and issue labeling ([738ba63](https://github.com/muhammedaksam/linkedin-games-solver/commit/738ba63))
- **ci:** Upgrade workflow action versions and Node.js version to 22.x to fix pnpm support ([f783c29](https://github.com/muhammedaksam/linkedin-games-solver/commit/f783c29))
- **ci:** Write pipeline summary to local file submission-summary.md to prevent ENOENT errors ([beb05ba](https://github.com/muhammedaksam/linkedin-games-solver/commit/beb05ba))
- **ci:** Remove daily-puzzle-submission label argument from pr creation to prevent CLI failures ([2130706](https://github.com/muhammedaksam/linkedin-games-solver/commit/2130706))
- **ci:** Add explicit pull-requests: write permissions to the submission processor job ([eb0d7ed](https://github.com/muhammedaksam/linkedin-games-solver/commit/eb0d7ed))
- **ci:** Update validation success comment to say PR opened instead of merged ([99490fa](https://github.com/muhammedaksam/linkedin-games-solver/commit/99490fa))
- **ci:** Restrict process-submission workflow triggers to opened issues and daily-puzzle-submission labels ([decd584](https://github.com/muhammedaksam/linkedin-games-solver/commit/decd584))
- **ci:** Prevent parallel duplicate workflow runs on template issue opening ([8d2cde8](https://github.com/muhammedaksam/linkedin-games-solver/commit/8d2cde8))
- **debug:** Prefill GitHub issue dropdown using 0-based indices ([31930fc](https://github.com/muhammedaksam/linkedin-games-solver/commit/31930fc))
- **ci:** Change game field to text input to allow reliable prefilling ([73419e0](https://github.com/muhammedaksam/linkedin-games-solver/commit/73419e0))
- **ci:** Trigger pr-merged workflow on push to main to bypass bot recursion and skip-ci rules ([25fe03c](https://github.com/muhammedaksam/linkedin-games-solver/commit/25fe03c))
- Persist action badge cached streak in chrome.storage.session ([c67aac8](https://github.com/muhammedaksam/linkedin-games-solver/commit/c67aac8))
- Catch fire-and-forget content script communication errors gracefully in background.ts ([39f393e](https://github.com/muhammedaksam/linkedin-games-solver/commit/39f393e))
- Resolve background registry loading hanging issues and configure vitest aliases ([0339395](https://github.com/muhammedaksam/linkedin-games-solver/commit/0339395))
- **ci:** Prevent duplicate linked issue comments from double-runs ([ff03d08](https://github.com/muhammedaksam/linkedin-games-solver/commit/ff03d08))
- Update gecko data collection permissions to include none as a required field ([291be38](https://github.com/muhammedaksam/linkedin-games-solver/commit/291be38))
- Resolve all import alias and compiler checking errors ([efb9f12](https://github.com/muhammedaksam/linkedin-games-solver/commit/efb9f12))
- Restore jsx config and dynamic storage wrapper key typings ([30fd55b](https://github.com/muhammedaksam/linkedin-games-solver/commit/30fd55b))
- Resolve all remaining eslint and warning warnings in background.ts and storage.ts ([8247022](https://github.com/muhammedaksam/linkedin-games-solver/commit/8247022))
- Resolve background.ts strict union type mismatch and undefined prompt fallback ([95c03d3](https://github.com/muhammedaksam/linkedin-games-solver/commit/95c03d3))
- Register manifest icons explicitly in wxt.config.ts ([c6b1242](https://github.com/muhammedaksam/linkedin-games-solver/commit/c6b1242))
- Define process.env and process shims in wxt.config.ts ([68d27ba](https://github.com/muhammedaksam/linkedin-games-solver/commit/68d27ba))
- Resolve logger-main.content.ts stateNode assignment and cleanup linter warnings ([e4ece28](https://github.com/muhammedaksam/linkedin-games-solver/commit/e4ece28))
- Resolve tsconfig paths for shims, type-safe i18n dictionaries, and shim warnings ([c56a890](https://github.com/muhammedaksam/linkedin-games-solver/commit/c56a890))
- **csui:** Inline CSS injection directly into shadow root to bypass CSP and MV3 dynamic URL fetch block ([04aa125](https://github.com/muhammedaksam/linkedin-games-solver/commit/04aa125))

### 💅 Refactors

- Standardize local storage usage and enforce a 1s minimum time for game records and streak calculations ([1f9d9d0](https://github.com/muhammedaksam/linkedin-games-solver/commit/1f9d9d0))
- Migrate content script to TSX, add background service worker, and scope host permissions to LinkedIn games ([e498332](https://github.com/muhammedaksam/linkedin-games-solver/commit/e498332))
- Improve UI interaction robustness with React-specific input handling, resilient AI response parsing, and optimized timing delays ([2df1d00](https://github.com/muhammedaksam/linkedin-games-solver/commit/2df1d00))
- Update perfect day completion styling and remove animation in popup UI ([02f355c](https://github.com/muhammedaksam/linkedin-games-solver/commit/02f355c))
- Update saveGameCompleted to support conditional time updates and track actual page duration ([cacb917](https://github.com/muhammedaksam/linkedin-games-solver/commit/cacb917))
- Convert JS/MJS files to TypeScript ([1dbb70b](https://github.com/muhammedaksam/linkedin-games-solver/commit/1dbb70b))
- Replace any with unknown in generate-store-assets.ts ([4659aed](https://github.com/muhammedaksam/linkedin-games-solver/commit/4659aed))
- Upgrade raw HTML buttons to Shadcn UI Button component in solver shell, language switcher, and dashboard ([83edb15](https://github.com/muhammedaksam/linkedin-games-solver/commit/83edb15))
- Strictly type logger-main state extraction and integrate direct React solution bypassing for Queens, Zip, and Patches ([ebf7097](https://github.com/muhammedaksam/linkedin-games-solver/commit/ebf7097))
- **types:** Resolve TypeScript warnings and improve type safety ([6b250a4](https://github.com/muhammedaksam/linkedin-games-solver/commit/6b250a4))
- Transition to Plasmo's declarative messaging system and cleanup imports ([6a65fc4](https://github.com/muhammedaksam/linkedin-games-solver/commit/6a65fc4))
- Simplify PR merged workflow logic and conditionally add issue author as co-author in submission workflow ([1dde358](https://github.com/muhammedaksam/linkedin-games-solver/commit/1dde358))
- Add bonus-aware game ID helper and improve SPA navigation tracking for solver states ([28214f9](https://github.com/muhammedaksam/linkedin-games-solver/commit/28214f9))
- Condense clue arrays into single lines and update dependencies in lockfile ([98e4d71](https://github.com/muhammedaksam/linkedin-games-solver/commit/98e4d71))
- Constrain file input lookup to specific section-level containers in asset upload script ([091e531](https://github.com/muhammedaksam/linkedin-games-solver/commit/091e531))
- Statically import askAI and flatten dynamic promise chain ([c2d01ce](https://github.com/muhammedaksam/linkedin-games-solver/commit/c2d01ce))
- Migrate pnpm configuration and overrides to workspace level ([ee641de](https://github.com/muhammedaksam/linkedin-games-solver/commit/ee641de))
- Update CI submission workflow, standardize registry formatting, and add store publication scripts ([cc33516](https://github.com/muhammedaksam/linkedin-games-solver/commit/cc33516))

### 📖 Documentation

- Update README ([e066860](https://github.com/muhammedaksam/linkedin-games-solver/commit/e066860))
- Update readme and store descriptions, bump version to 0.0.6 ([040c983](https://github.com/muhammedaksam/linkedin-games-solver/commit/040c983))
- Translate solve speed and hint mode settings to all other locales ([414daca](https://github.com/muhammedaksam/linkedin-games-solver/commit/414daca))
- Update privacy policy last updated date ([1f0021f](https://github.com/muhammedaksam/linkedin-games-solver/commit/1f0021f))
- Update PRIVACY.md with sidePanel and legacy scripting justifications ([b35b26a](https://github.com/muhammedaksam/linkedin-games-solver/commit/b35b26a))
- Update PRIVACY.md to declare active scripting permission for logger script ([248fa10](https://github.com/muhammedaksam/linkedin-games-solver/commit/248fa10))
- Update privacy policy and clean eslint type safety warnings ([f3e8b0d](https://github.com/muhammedaksam/linkedin-games-solver/commit/f3e8b0d))
- Update PRIVACY.md to reflect optional permissions and storage session ([cd0cce1](https://github.com/muhammedaksam/linkedin-games-solver/commit/cd0cce1))
- Modernize README.md with advanced markdown, Mermaid diagrams, alerts, status tables, and accordions ([fe3f364](https://github.com/muhammedaksam/linkedin-games-solver/commit/fe3f364))
- Update README with Chrome Web Store badges and branding compliance ([7a64431](https://github.com/muhammedaksam/linkedin-games-solver/commit/7a64431))
- Comply with LinkedIn brand guidelines and add disclaimer ([d390be7](https://github.com/muhammedaksam/linkedin-games-solver/commit/d390be7))
- Improve formatting of the importance notice in README ([85f8d80](https://github.com/muhammedaksam/linkedin-games-solver/commit/85f8d80))
- Integrate Hybrid Answers Registry documentation, contribution flow, and updated feature roadmap in README ([35a3400](https://github.com/muhammedaksam/linkedin-games-solver/commit/35a3400))
- Update contribution guide with automated issue templates and mark registry pipeline as complete ([fb3754b](https://github.com/muhammedaksam/linkedin-games-solver/commit/fb3754b))
- Add CONTRIBUTING, SECURITY, and PR template ([17c3ae4](https://github.com/muhammedaksam/linkedin-games-solver/commit/17c3ae4))
- Add Microsoft Edge extension support badges and branding to README ([41fe635](https://github.com/muhammedaksam/linkedin-games-solver/commit/41fe635))
- Update README.md with WXT framework and build directories ([4d293f3](https://github.com/muhammedaksam/linkedin-games-solver/commit/4d293f3))
- Add Firefox Add-on badges and update compatibility documentation in README ([e6bb023](https://github.com/muhammedaksam/linkedin-games-solver/commit/e6bb023))

### 📦 Build

- Add step to prepare WXT types in CI workflow ([3301c13](https://github.com/muhammedaksam/linkedin-games-solver/commit/3301c13))

### 🏡 Chore

- Bump version to 0.0.2 ([bb37167](https://github.com/muhammedaksam/linkedin-games-solver/commit/bb37167))
- **dev-deps:** Update devDependencies ([31696ed](https://github.com/muhammedaksam/linkedin-games-solver/commit/31696ed))
- Bump version to 0.0.3 ([df3ec67](https://github.com/muhammedaksam/linkedin-games-solver/commit/df3ec67))
- Bump package version to 0.0.4 ([79ce72e](https://github.com/muhammedaksam/linkedin-games-solver/commit/79ce72e))
- Bump version to 0.0.5 ([a178a1d](https://github.com/muhammedaksam/linkedin-games-solver/commit/a178a1d))
- Add ESLint configuration and update project tooling scripts and dependencies ([d17baa5](https://github.com/muhammedaksam/linkedin-games-solver/commit/d17baa5))
- Remove unused scripting permission and resolve CWS policy violations ([b2cdfde](https://github.com/muhammedaksam/linkedin-games-solver/commit/b2cdfde))
- Bump version to 0.0.7 ([26f53ad](https://github.com/muhammedaksam/linkedin-games-solver/commit/26f53ad))
- Bump version to 0.0.8 ([f32541c](https://github.com/muhammedaksam/linkedin-games-solver/commit/f32541c))
- Bump version to 0.0.9 ([4f01c13](https://github.com/muhammedaksam/linkedin-games-solver/commit/4f01c13))
- Bump version to 0.0.11 ([42e4798](https://github.com/muhammedaksam/linkedin-games-solver/commit/42e4798))
- Bump version to 0.0.12 ([ac6b402](https://github.com/muhammedaksam/linkedin-games-solver/commit/ac6b402))
- Bump version to 0.0.13 ([fb30e33](https://github.com/muhammedaksam/linkedin-games-solver/commit/fb30e33))
- Bump version to 0.0.14 ([ed9c1db](https://github.com/muhammedaksam/linkedin-games-solver/commit/ed9c1db))
- Bump version to 0.0.15 ([9eea6d6](https://github.com/muhammedaksam/linkedin-games-solver/commit/9eea6d6))
- Bump version to 0.0.16 ([ae0e921](https://github.com/muhammedaksam/linkedin-games-solver/commit/ae0e921))
- Bump version to 0.0.17 ([5b3e780](https://github.com/muhammedaksam/linkedin-games-solver/commit/5b3e780))
- Resolve type-safety explicit any warnings, run pnpm fix and bump version to 0.0.19 ([2556f1c](https://github.com/muhammedaksam/linkedin-games-solver/commit/2556f1c))
- Bump version to 0.0.21 ([305fe0b](https://github.com/muhammedaksam/linkedin-games-solver/commit/305fe0b))
- Update TypeScript build information cache ([f596238](https://github.com/muhammedaksam/linkedin-games-solver/commit/f596238))
- Bump version to 0.0.22 ([e3e5c48](https://github.com/muhammedaksam/linkedin-games-solver/commit/e3e5c48))
- Bump version to 0.0.24 ([b10f5e2](https://github.com/muhammedaksam/linkedin-games-solver/commit/b10f5e2))
- Bump version to 0.0.25 ([16df472](https://github.com/muhammedaksam/linkedin-games-solver/commit/16df472))
- Bump extension version to 0.0.26 ([07f009c](https://github.com/muhammedaksam/linkedin-games-solver/commit/07f009c))
- Auto-update solver registry [skip ci] ([5b6a1c1](https://github.com/muhammedaksam/linkedin-games-solver/commit/5b6a1c1))
- Update solver registry [skip ci] ([eb6ac02](https://github.com/muhammedaksam/linkedin-games-solver/commit/eb6ac02))
- **ci:** Update label applied on PR merge to processed-successfully ([4a65622](https://github.com/muhammedaksam/linkedin-games-solver/commit/4a65622))
- Update solver registry [skip ci] ([a97bf35](https://github.com/muhammedaksam/linkedin-games-solver/commit/a97bf35))
- Update solver registry [skip ci] ([31d8be1](https://github.com/muhammedaksam/linkedin-games-solver/commit/31d8be1))
- Bump version to 0.0.30 ([d74d065](https://github.com/muhammedaksam/linkedin-games-solver/commit/d74d065))
- Bump version to 0.0.32 ([73d159f](https://github.com/muhammedaksam/linkedin-games-solver/commit/73d159f))
- Untrack and ignore tsconfig.tsbuildinfo ([7a42608](https://github.com/muhammedaksam/linkedin-games-solver/commit/7a42608))
- Update solver registry [skip ci] ([7f573a7](https://github.com/muhammedaksam/linkedin-games-solver/commit/7f573a7))
- Update solver registry [skip ci] ([9f1beae](https://github.com/muhammedaksam/linkedin-games-solver/commit/9f1beae))
- Update solver registry [skip ci] ([a945ecc](https://github.com/muhammedaksam/linkedin-games-solver/commit/a945ecc))
- Update solver registry [skip ci] ([3ffd1e3](https://github.com/muhammedaksam/linkedin-games-solver/commit/3ffd1e3))
- Update solver registry [skip ci] ([6470d7b](https://github.com/muhammedaksam/linkedin-games-solver/commit/6470d7b))
- Update solver registry [skip ci] ([add11ed](https://github.com/muhammedaksam/linkedin-games-solver/commit/add11ed))
- Update solver registry [skip ci] ([866b891](https://github.com/muhammedaksam/linkedin-games-solver/commit/866b891))
- Update solver registry [skip ci] ([56ca0dc](https://github.com/muhammedaksam/linkedin-games-solver/commit/56ca0dc))
- Upgrade actions/github-script to v7 and remove skip-ci to enable merge triggers ([f1c7024](https://github.com/muhammedaksam/linkedin-games-solver/commit/f1c7024))
- Update solver registry ([c5c8006](https://github.com/muhammedaksam/linkedin-games-solver/commit/c5c8006))
- Update solver registry ([61fbddb](https://github.com/muhammedaksam/linkedin-games-solver/commit/61fbddb))
- Update solver registry ([db9608a](https://github.com/muhammedaksam/linkedin-games-solver/commit/db9608a))
- Update solver registry ([ab890aa](https://github.com/muhammedaksam/linkedin-games-solver/commit/ab890aa))
- Update solver registry ([c364252](https://github.com/muhammedaksam/linkedin-games-solver/commit/c364252))
- Update project dependencies in package.json and pnpm-lock.yaml ([ee276c9](https://github.com/muhammedaksam/linkedin-games-solver/commit/ee276c9))
- Add .nvmrc file specifying Node.js v24.11.1 ([570ec34](https://github.com/muhammedaksam/linkedin-games-solver/commit/570ec34))
- Update store asset generator window dimensions and regenerate store listings ([1b1dae0](https://github.com/muhammedaksam/linkedin-games-solver/commit/1b1dae0))
- Update store assets ([569480a](https://github.com/muhammedaksam/linkedin-games-solver/commit/569480a))
- Update solver registry ([96bba0a](https://github.com/muhammedaksam/linkedin-games-solver/commit/96bba0a))
- Update solver registry ([0a932e0](https://github.com/muhammedaksam/linkedin-games-solver/commit/0a932e0))
- Achieve 100% warning-free types in background.ts ([03618d5](https://github.com/muhammedaksam/linkedin-games-solver/commit/03618d5))
- Migrate to WXT and implement legacy storage data migration ([11c5626](https://github.com/muhammedaksam/linkedin-games-solver/commit/11c5626))
- Remove redundant legacy Plasmo files ([0c90b65](https://github.com/muhammedaksam/linkedin-games-solver/commit/0c90b65))
- Update solver registry ([d6cf2ac](https://github.com/muhammedaksam/linkedin-games-solver/commit/d6cf2ac))
- Update solver registry ([4b13f0a](https://github.com/muhammedaksam/linkedin-games-solver/commit/4b13f0a))
- Bump version to 0.1.0 ([afc296c](https://github.com/muhammedaksam/linkedin-games-solver/commit/afc296c))
- Update solver registry ([3969350](https://github.com/muhammedaksam/linkedin-games-solver/commit/3969350))
- Update solver registry ([85bb984](https://github.com/muhammedaksam/linkedin-games-solver/commit/85bb984))
- Update solver registry ([2fc8cc5](https://github.com/muhammedaksam/linkedin-games-solver/commit/2fc8cc5))
- Update solver registry ([c988f7a](https://github.com/muhammedaksam/linkedin-games-solver/commit/c988f7a))
- Update solver registry ([1a15b6e](https://github.com/muhammedaksam/linkedin-games-solver/commit/1a15b6e))
- Update solver registry ([0fc5dd4](https://github.com/muhammedaksam/linkedin-games-solver/commit/0fc5dd4))
- Update solver registry ([2186f79](https://github.com/muhammedaksam/linkedin-games-solver/commit/2186f79))
- Update solver registry ([1a62791](https://github.com/muhammedaksam/linkedin-games-solver/commit/1a62791))
- Update solver registry ([27908eb](https://github.com/muhammedaksam/linkedin-games-solver/commit/27908eb))
- Update solver registry ([782dbce](https://github.com/muhammedaksam/linkedin-games-solver/commit/782dbce))
- Update solver registry ([282a2b7](https://github.com/muhammedaksam/linkedin-games-solver/commit/282a2b7))
- Automate versioning, release tagging, and store submission in CI pipeline ([bc3db27](https://github.com/muhammedaksam/linkedin-games-solver/commit/bc3db27))
- Bump extension version to 0.0.34 ([3722e39](https://github.com/muhammedaksam/linkedin-games-solver/commit/3722e39))
- Upgrade github actions and pnpm versions in workflow configurations ([b065be8](https://github.com/muhammedaksam/linkedin-games-solver/commit/b065be8))
- **ci:** Run prettier on changelog and registry before staging/committing ([775bb04](https://github.com/muhammedaksam/linkedin-games-solver/commit/775bb04))

### ✅ Tests

- Add Vitest unit testing harness for solver algorithms ([4cfb794](https://github.com/muhammedaksam/linkedin-games-solver/commit/4cfb794))

### 🎨 Styles

- Format crossclimb.ts using prettier ([5c14f94](https://github.com/muhammedaksam/linkedin-games-solver/commit/5c14f94))
- Resolve all remaining eslint and react-refresh warnings cleanly ([9ba83fb](https://github.com/muhammedaksam/linkedin-games-solver/commit/9ba83fb))
- Restore content script UI solver button styling inside Shadow DOM ([9598c6a](https://github.com/muhammedaksam/linkedin-games-solver/commit/9598c6a))
- Prevent vertical scrollbars on content script UI container and host ([3103100](https://github.com/muhammedaksam/linkedin-games-solver/commit/3103100))
- Refactor code and markup for consistent formatting and improved readability ([9d80f9e](https://github.com/muhammedaksam/linkedin-games-solver/commit/9d80f9e))

### 🤖 CI

- Update pr-merged workflow to lock, delete branch, and comment on linked issue ([eb0dc56](https://github.com/muhammedaksam/linkedin-games-solver/commit/eb0dc56))

### ❤️ Contributors

- Muhammed Mustafa AKSAM ([@muhammedaksam](https://github.com/muhammedaksam))
- Muhammed Mustafa AKŞAM ([@muhammedaksam](https://github.com/muhammedaksam))
