import path from "path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "~games": path.resolve(__dirname, "./games"),
      "~lib": path.resolve(__dirname, "./lib"),
      "~components": path.resolve(__dirname, "./components"),
      "~background": path.resolve(__dirname, "./background")
    }
  }
})
