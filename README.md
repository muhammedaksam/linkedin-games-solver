# LinkedIn Games Solver

LinkedIn Games Solver is a small Plasmo-based browser extension that provides helpers and shortcuts for LinkedIn's built-in browser games. This repository contains the extension source, localization files, and tooling to generate Chrome Web Store assets (icons, promo tiles, screenshots) including localized overlays and social preview images.

## Features

- **7 Game Solvers**: Complete support for Queens, Sudoku, Tango, Zip, Patches, Crossclimb, and Pinpoint.
- **Pacing & Solve Speed Controls**: Choose between _Instant_ (fastest), _Normal_, or _Stealth Mode_ (human-like pacing with randomized click delays to secure streaks against automated detection).
- **Educational Hint Mode**: Get single-step hints or check your moves. If you make a mistake, cells flash red to guide self-correction without spoiling the game.
- **Multi-Model AI Integration**: Solves trivia-based games (Crossclimb, Pinpoint) using Gemini, OpenAI GPT-4o, Anthropic Claude, DeepSeek, or custom local models (Ollama).
- **Interactive Stats Dashboard**: Track streaks, average solve times, activity calendar matrices, and personal best records.
- **Localized UI**: Native multilingual support for English and Turkish out of the box.

## Contents

- Source: extension React/TypeScript files in the project root and `components/`, `games/`, `tabs/`.
- Locales: `locales/<locale>/messages.json` — translated strings used for overlays and the extension manifest.
- Asset generator: `scripts/generate-store-assets.mjs` — creates store listing images and social previews.

## Quickstart

Install dependencies and run the dev server:

```bash
pnpm install
pnpm dev
```

Build a production package:

```bash
pnpm build
```

The production build for Chrome MV3 appears under `build/chrome-mv3-prod`.

## Generate Chrome Web Store & Social Assets

This repository includes an automatic generator for the images required by the Chrome Web Store and for social previews used by README/repo cards.

Run the generator:

```bash
pnpm generate:store-assets
```

Outputs (examples):

- `store-assets/store-icon-128.png` — store icon (128×128 PNG)
- `store-assets/global/small-promo-440x280.jpg` — small promo tile
- `store-assets/global/marquee-promo-1400x560.jpg` — marquee tile
- `store-assets/global/screenshots/screenshot-1.jpg` … `screenshot-5.jpg` — screenshots (1280×800)
- `store-assets/localized/<locale>/screenshots/...` — localized screenshots per `locales/`
- `store-assets/social/social-1280x640.jpg` and `store-assets/social/social-640x320.jpg` — global social previews
- `store-assets/localized/<locale>/social/social-1280x640.jpg` and `social-640x320.jpg` — localized social previews

The generator composes images from SVG artwork in `assets/` and overlays translated strings from the `locales/` folder.

### Safe area & layout

Social previews are produced with a visible safe margin so important details remain readable when cropped by social platforms. The generator keeps a 40pt safe border for text and icons.

### Localized overlays & CJK fonts

For non-Latin locales (e.g., `zh_CN`), the script will attempt to locate a suitable system font using `fc-match` and pass the font file to ImageMagick so glyphs render correctly. If localized text appears as missing glyphs, install CJK fonts (for example `fonts-noto-cjk` or `ttf-wqy-zenhei`) and re-run.

## Prerequisites

- `node` + `pnpm` (or `npm`) — project tooling.
- `rsvg-convert` — rasterize SVGs (Debian/Ubuntu: `apt install librsvg2-bin`).
- ImageMagick — the script prefers `magick` if available, otherwise falls back to `convert`.
- `fontconfig` utilities (`fc-list`, `fc-match`) — used to auto-detect fonts for CJK overlays.

If any of the above are missing the generator will log a helpful error.

## Validation

Quickly verify generated images with ImageMagick's `identify`:

```bash
identify -format '%f %wx%h %[channels]\n' store-assets/social/*.jpg store-assets/localized/*/social/*.jpg
```

## Development notes

- The asset generator is `scripts/generate-store-assets.mjs` (ESM JavaScript). It uses `rsvg-convert` to render SVGs at target sizes and ImageMagick to compose final JPEG/PNG outputs.
- If you need to tweak layout, fonts, or spacing, edit that script and re-run `pnpm generate:store-assets`.

## Troubleshooting

- Blurry icons: ensure SVGs are rendered at sufficient raster sizes; the generator renders multiple native icon sizes to avoid upscaling.
- Missing CJK glyphs: install a CJK font package and re-run; confirm `fc-match -f '%{file}\n' ':lang=zh-cn'` returns a valid font path.
- ImageMagick command differences: some systems install `magick` instead of `convert`. The script will prefer `magick` automatically.

## Contributing

Contributions are welcome. Typical workflows:

1. Fork the repo
2. Create a feature branch
3. Run `pnpm install` and `pnpm dev` to test locally
4. If you modify asset generation, run `pnpm generate:store-assets` and commit results if appropriate
5. Open a PR describing your change

## License

This project is licensed under the terms in `LICENSE`.

---

If you'd like, I can also add a GitHub Actions workflow to auto-generate and validate these assets on push — want me to add that?

Additional notes — social previews

- The generator now also creates social preview images intended for repository cards and social sharing:
  - Global: `store-assets/social/social-1280x640.jpg` and `store-assets/social/social-640x320.jpg`
  - Localized: `store-assets/localized/<locale>/social/social-1280x640.jpg` and `social-640x320.jpg`
- The layout respects a safe 40pt margin for important content (keeps text and icons inside the visible "safe area").

Prerequisites and font handling

- `rsvg-convert` is used to rasterize SVG artwork. Install via your package manager (for Debian/Ubuntu: `apt install librsvg2-bin`).
- ImageMagick is required. The script will prefer the `magick` binary if available, falling back to `convert`.
- For CJK locales (e.g. `zh_CN`) the generator attempts to detect a suitable system font using `fc-match` and provide its file path to ImageMagick so localized overlays render correctly. If you see missing glyphs, install a CJK font (for example `fonts-noto-cjk` / `ttf-wqy-zenhei`) and re-run.

Quick validation

After running the generator you can verify outputs with ImageMagick's `identify`:

```bash
identify -format '%f %wx%h %[channels]\n' store-assets/social/*.jpg store-assets/localized/*/social/*.jpg
```

If you'd like a different layout or font choices, edit `scripts/generate-store-assets.mjs`.
