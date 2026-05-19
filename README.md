This is a [Plasmo extension](https://docs.plasmo.com/) project bootstrapped with [`plasmo init`](https://www.npmjs.com/package/plasmo).

## Getting Started

First, run the development server:

```bash
pnpm dev
# or
npm run dev
```

Open your browser and load the appropriate development build. For example, if you are developing for the chrome browser, using manifest v3, use: `build/chrome-mv3-dev`.

You can start editing the popup by modifying `popup.tsx`. It should auto-update as you make changes. To add an options page, simply add a `options.tsx` file to the root of the project, with a react component default exported. Likewise to add a content page, add a `content.ts` file to the root of the project, importing some module and do some logic, then reload the extension on your browser.

For further guidance, [visit our Documentation](https://docs.plasmo.com/)

## Making production build

Run the following:

```bash
pnpm build
# or
npm run build
```

This should create a production bundle for your extension, ready to be zipped and published to the stores.

## Submit to the webstores

The easiest way to deploy your Plasmo extension is to use the built-in [bpp](https://bpp.browser.market) GitHub action. Prior to using this action however, make sure to build your extension and upload the first version to the store to establish the basic credentials. Then, simply follow [this setup instruction](https://docs.plasmo.com/framework/workflows/submit) and you should be on your way for automated submission!

## Generate Chrome Web Store Assets

This project includes an automatic asset generator for Chrome Web Store listing images.

Run:

```bash
pnpm generate:store-assets
```

It generates:

- `store-assets/store-icon-128.png` (128x128 with transparent padding around centered artwork)
- `store-assets/global/small-promo-440x280.jpg`
- `store-assets/global/marquee-promo-1400x560.jpg`
- `store-assets/global/screenshots/screenshot-1.jpg` ... `screenshot-5.jpg` (1280x800)
- `store-assets/localized/<locale>/screenshots/screenshot-1.jpg` for each folder in `locales/`

Notes:

- Requires `rsvg-convert` and ImageMagick `convert` installed in your system PATH.
- Promo tiles and screenshots are exported as JPEG without alpha.
- The icon is exported as PNG with transparent padding per Chrome icon guidance.
