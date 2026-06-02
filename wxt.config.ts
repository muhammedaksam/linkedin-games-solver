import { defineConfig } from "wxt"
import path from "path"

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "__MSG_extensionName__",
    description: "__MSG_extensionDescription__",
    default_locale: "en",
    devtools_page: "devtools.html",
    icons: {
      "16": "icon.png",
      "32": "icon.png",
      "48": "icon.png",
      "128": "icon.png"
    },
    action: {
      default_icon: {
        "16": "icon.png",
        "32": "icon.png",
        "48": "icon.png",
        "128": "icon.png"
      }
    },
    permissions: [
      "activeTab",
      "storage",
      "session",
      "sidePanel",
      "alarms",
      "notifications",
      "contextMenus",
      "offscreen"
    ],
    optional_host_permissions: ["https://*.linkedin.com/games/*"],
    host_permissions: [
      "https://raw.githubusercontent.com/*",
      "https://www.google-analytics.com/*"
    ],
    omnibox: {
      keyword: "solve"
    },
    commands: {
      "solve-active-game": {
        suggested_key: {
          default: "Ctrl+Shift+S",
          mac: "Command+Shift+S"
        },
        description: "__MSG_commandSolveActiveGame__"
      },
      "get-single-hint": {
        suggested_key: {
          default: "Ctrl+Shift+H",
          mac: "Command+Shift+H"
        },
        description: "__MSG_commandGetSingleHint__"
      }
    },
    web_accessible_resources: [
      {
        matches: ["https://*.linkedin.com/*"],
        resources: ["logger-main.js"]
      }
    ],
    browser_specific_settings: {
      gecko: {
        id: "{58eb90cf-393d-4f9e-a4ab-d159dc88f018}",
        data_collection_permissions: {
          required: ["none"],
          optional: ["technicalAndInteraction", "websiteContent"]
        }
      },
      gecko_android: {}
    }
  },
  vite: () => ({
    define: {
      "process.env.PLASMO_PUBLIC_GTAG_ID": JSON.stringify(process.env.PLASMO_PUBLIC_GTAG_ID || ""),
      "process.env.PLASMO_PUBLIC_SECRET_API_KEY": JSON.stringify(process.env.PLASMO_PUBLIC_SECRET_API_KEY || ""),
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
      "process.env": "({ NODE_ENV: 'development' })",
      "process": "({ env: { NODE_ENV: 'development' } })"
    },
    resolve: {
      alias: {
        "@plasmohq/messaging": path.resolve("./lib/plasmo-messaging-shim.ts"),
        "@plasmohq/storage/secure": path.resolve("./lib/plasmo-storage-shim.ts"),
        "@plasmohq/storage/hook": path.resolve("./lib/plasmo-storage-shim.ts"),
        "@plasmohq/storage": path.resolve("./lib/plasmo-storage-shim.ts"),
        "~lib": path.resolve("./lib"),
        "~games": path.resolve("./games"),
        "~assets": path.resolve("./assets"),
        "~locales": path.resolve("./public/_locales"),
        "~tabs": path.resolve("./tabs"),
        "~components": path.resolve("./components"),
        "~": path.resolve("./"),
        "@": path.resolve("./")
      }
    }
  })
})
