import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://*.linkedin.com/games/*"],
  world: "MAIN",
  run_at: "document_start"
}

// Check to prevent double-initialization
if (!(window as any).__SOLVER_LOGGER_INITIALIZED__) {
  ;(window as any).__SOLVER_LOGGER_INITIALIZED__ = true

  const originalLog = console.log
  const originalError = console.error
  const originalWarn = console.warn
  const originalInfo = console.info

  const sendToIsolated = (type: string, args: any[]) => {
    // Safely serialize arguments to string to avoid circular references and exceptions
    const serialized = args.map((arg) => {
      try {
        if (arg === null) return "null"
        if (arg === undefined) return "undefined"
        if (arg instanceof Error) {
          return `${arg.name}: ${arg.message}\n${arg.stack || ""}`
        }
        if (typeof arg === "object") {
          return JSON.stringify(arg)
        }
        return String(arg)
      } catch (e) {
        return `[Unserializable Object: ${String(arg)}]`
      }
    })

    window.postMessage(
      {
        source: "linkedin-games-solver-logger",
        type,
        logs: serialized,
        timestamp: new Date().toLocaleTimeString()
      },
      "*"
    )
  }

  console.log = (...args) => {
    originalLog.apply(console, args)
    sendToIsolated("log", args)
  }

  console.error = (...args) => {
    originalError.apply(console, args)
    sendToIsolated("error", args)
  }

  console.warn = (...args) => {
    originalWarn.apply(console, args)
    sendToIsolated("warn", args)
  }

  console.info = (...args) => {
    originalInfo.apply(console, args)
    sendToIsolated("info", args)
  }
}
