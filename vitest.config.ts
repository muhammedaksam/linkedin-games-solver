import path from "path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@plasmohq/storage/secure": path.resolve(
        __dirname,
        "./lib/plasmo-storage-shim.ts"
      ),
      "@plasmohq/storage/hook": path.resolve(
        __dirname,
        "./lib/plasmo-storage-shim.ts"
      ),
      "@plasmohq/storage": path.resolve(
        __dirname,
        "./lib/plasmo-storage-shim.ts"
      ),
      "~games": path.resolve(__dirname, "./games"),
      "~lib": path.resolve(__dirname, "./lib"),
      "~components": path.resolve(__dirname, "./components"),
      "~background": path.resolve(__dirname, "./background")
    }
  }
})
