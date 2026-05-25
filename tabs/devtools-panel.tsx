import {
  CheckCircle2,
  Copy,
  Cpu,
  ExternalLink,
  FileCode,
  Grid,
  Search,
  Share2,
  Terminal,
  Trash2
} from "lucide-react"
import React, { useCallback, useEffect, useState } from "react"

import "./dashboard.css"

import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "~/components/ui/select"
import { getMessage } from "~/lib/i18n"

interface LogEntry {
  type: string
  message: string
  timestamp: string
}

interface CellEntry {
  id: string
  text: string
  ariaLabel?: string
  disabled: boolean
  color: string
  constraintRight?: "eq" | "neq"
  constraintBottom?: "eq" | "neq"
}

const getTypeLabel = (type: string) => {
  switch (type) {
    case "all":
      return getMessage("allTypes")
    case "log":
      return getMessage("logsType")
    case "info":
      return getMessage("infoType")
    case "warn":
      return getMessage("warnsType")
    case "error":
      return getMessage("errorsType")
    default:
      return type.toUpperCase()
  }
}

export default function DevToolsPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filterType, setFilterType] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [gridCells, setGridCells] = useState<CellEntry[]>([])
  const [gameName, setGameName] = useState<string | null>(null)
  const [tabUrl, setDebugTabUrl] = useState<string>("")
  const [isLive, setIsLive] = useState<boolean>(false)
  const [mainHtml, setMainHtml] = useState<string>("")
  const [copyMessage, setCopyMessage] = useState<string | null>(null)

  // Retrieve logs from chrome.storage.session
  const fetchSessionLogs = useCallback(() => {
    if (typeof chrome !== "undefined" && chrome.storage?.session) {
      chrome.storage.session.get("solverLogs", (stored) => {
        if (stored?.solverLogs) {
          setLogs(stored.solverLogs)
        }
      })
    }
  }, [])

  // Inspect the current active DOM state on the tab
  const inspectTabDOM = useCallback(() => {
    if (typeof chrome === "undefined" || !chrome.devtools?.inspectedWindow) {
      return
    }

    // 1. Evaluate game type
    const detectGameScript = `
      (() => {
        const url = window.location.href;
        if (url.includes('/queens')) return 'Queens';
        if (url.includes('/sudoku') || url.includes('/mini-sudoku')) return 'Sudoku';
        if (url.includes('/tango')) return 'Tango';
        if (url.includes('/crossclimb')) return 'Crossclimb';
        if (url.includes('/pinpoint')) return 'Pinpoint';
        if (url.includes('/zip')) return 'Zip';
        if (url.includes('/patches')) return 'Patches';
        return null;
      })()
    `
    chrome.devtools.inspectedWindow.eval(
      detectGameScript,
      (result: unknown, isException) => {
        if (!isException && result) {
          setGameName(result as string)
          setIsLive(true)
        } else {
          setGameName(null)
          setIsLive(false)
        }
      }
    )

    // 2. Evaluate cell details
    const cellInspectScript = `
      (() => {
        // 1. Locate active board container first to prevent stale matching from other games
        let boardEl = document.querySelector('[data-testid="interactive-grid"]');
        if (!boardEl) {
          const selectors = [
            '[data-sudoku-grid="true"]',
            '.crossclimb__grid',
            '.pinpoint__board',
            '.game-board',
            '[data-testid$="-game-board"]',
            '[data-testid$="-game-container"]',
            'main'
          ];
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) {
              boardEl = el;
              break;
            }
          }
        }
        
        const root = boardEl || document;

        // 2. Query cells only inside the active board
        const cellSelectors = [
          '[data-testid^="cell-"]',
          '[id^="tango-cell-"]',
          '[data-cell-idx]',
          '.grid-board button',
          '.queens-cell',
          '.sudoku-cell'
        ];
        let cells = Array.from(root.querySelectorAll(cellSelectors.join(',')));
        
        // Filter out child icons or auxiliary labels that cause double-matching
        cells = cells.filter(cell => {
          const testId = (cell.getAttribute('data-testid') || '').toLowerCase();
          const id = (cell.id || '').toLowerCase();
          if (testId === 'cell-zero' || testId === 'cell-one' || testId === 'cell-empty') return false;
          if (id === 'cell-zero' || id === 'cell-one' || id === 'cell-empty') return false;
          if (id.includes('position') || id.includes('a11y') || id.includes('text')) return false;
          if (testId.includes('position') || testId.includes('a11y') || testId.includes('text')) return false;
          if (testId.includes('clue') || id.includes('clue') || testId.includes('number') || id.includes('number')) return false;
          return true;
        });

        const N = Math.round(Math.sqrt(cells.length));
        const entries = cells.slice(0, 100).map((cell, idx) => {
          // Clone cell to extract only visually visible text (removing hidden screen-reader elements)
          let cleanText = '';
          try {
            const clone = cell.cloneNode(true);
            const hidden = clone.querySelectorAll('.visually-hidden, .a11y-text, .visuallyhidden, [class*="hidden"], [class*="a11y"], p[class*="Interactive"], [aria-hidden="true"], [id*="a11y"], [id*="position"]');
            hidden.forEach(el => el.remove());
            cleanText = clone.textContent?.trim() || '';
          } catch (e) {
            cleanText = cell.textContent?.trim() || '';
          }

          // Extract aria-label of cell or any inner descendant (like Suns and Moons SVGs)
          let cellAriaLabel = cell.getAttribute('aria-label') || '';
          if (!cellAriaLabel) {
            const childWithLabel = cell.querySelector('[aria-label]');
            if (childWithLabel) {
              cellAriaLabel = childWithLabel.getAttribute('aria-label') || '';
            }
          }

          // Probe for inner SVGs denoting specific entities
          const innerSvg = cell.querySelector('svg[data-testid]');
          if (innerSvg) {
            const svgTestId = innerSvg.getAttribute('data-testid') || '';
            if (svgTestId === 'cell-zero') cellAriaLabel += ' sun günes güneş';
            if (svgTestId === 'cell-one') cellAriaLabel += ' moon ay';
          }

          const eqSvg = cell.querySelector('svg[data-testid="edge-equal"]');
          const crossSvg = cell.querySelector('svg[data-testid="edge-cross"]');
          if (eqSvg) cellAriaLabel += ' equal';
          if (crossSvg) cellAriaLabel += ' cross';

          return {
            id: cell.id || cell.getAttribute('data-testid') || cell.getAttribute('data-cell-idx') || \`cell-\${idx}\`,
            text: cleanText,
            ariaLabel: cellAriaLabel,
            disabled: cell.getAttribute('aria-disabled') === 'true' || cell.hasAttribute('disabled'),
            color: window.getComputedStyle(cell).backgroundColor || '',
            constraintRight: undefined,
            constraintBottom: undefined
          };
        });

        // Second pass: Extract edge constraints and map them between cells
        cells.slice(0, 100).forEach((cell, idx) => {
          const eqSvgs = Array.from(cell.querySelectorAll('svg[data-testid="edge-equal"]')).map(s => ({ svg: s, type: 'eq' }));
          const crossSvgs = Array.from(cell.querySelectorAll('svg[data-testid="edge-cross"]')).map(s => ({ svg: s, type: 'neq' }));
          const edgeSvgs = [...eqSvgs, ...crossSvgs];
          if (!edgeSvgs.length) return;

          const cellRect = cell.getBoundingClientRect();
          const cellCx = cellRect.left + cellRect.width / 2;
          const cellCy = cellRect.top + cellRect.height / 2;

          const r = Math.floor(idx / N);
          const c = idx % N;

          edgeSvgs.forEach(({ svg, type }) => {
            const svgRect = svg.getBoundingClientRect();
            const svgCx = svgRect.left + svgRect.width / 2;
            const svgCy = svgRect.top + svgRect.height / 2;

            const dx = svgCx - cellCx;
            const dy = svgCy - cellCy;

            let nr = r;
            let nc = c;

            if (Math.abs(dx) >= Math.abs(dy)) {
              nc = c + (dx >= 0 ? 1 : -1);
            } else {
              nr = r + (dy >= 0 ? 1 : -1);
            }

            if (nr >= 0 && nr < N && nc >= 0 && nc < N) {
              const neighborIdx = nr * N + nc;
              if (r === nr) {
                // Horizontal edge
                const leftIdx = Math.min(idx, neighborIdx);
                if (entries[leftIdx]) {
                  entries[leftIdx].constraintRight = type;
                }
              } else if (c === nc) {
                // Vertical edge
                const topIdx = Math.min(idx, neighborIdx);
                if (entries[topIdx]) {
                  entries[topIdx].constraintBottom = type;
                }
              }
            }
          });
        });

        return entries;
      })()
    `
    chrome.devtools.inspectedWindow.eval(
      cellInspectScript,
      (result: unknown, isException) => {
        if (!isException && Array.isArray(result)) {
          setGridCells(result as CellEntry[])
        }
      }
    )

    // 3. Fetch tab URL
    chrome.devtools.inspectedWindow.eval(
      "window.location.href",
      (result: unknown, isException) => {
        if (!isException && result) {
          setDebugTabUrl(result as string)
        }
      }
    )

    // 4. Fetch main outerHTML dynamically from F12 inspected context
    const mainHtmlScript = `
      (() => {
        const main = document.querySelector('main');
        if (main) return main.outerHTML;
        const app = document.querySelector('#app') || document.querySelector('#root') || document.querySelector('#__next');
        if (app) return app.outerHTML;
        return document.body.outerHTML;
      })()
    `
    chrome.devtools.inspectedWindow.eval(
      mainHtmlScript,
      (result: unknown, isException) => {
        if (!isException && result) {
          setMainHtml(result as string)
        }
      }
    )
  }, [])

  // Initialize and bind storage listeners for reactive telemetry
  useEffect(() => {
    // Enable F12 dark mode always
    document.documentElement.classList.add("dark")

    fetchSessionLogs()
    inspectTabDOM()

    // Query periodic updates for live telemetry
    const logInterval = setInterval(fetchSessionLogs, 1000)
    const domInterval = setInterval(inspectTabDOM, 1500)

    // Register storage change listener to trigger instant refreshes
    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName === "session" && changes.solverLogs) {
        setLogs(changes.solverLogs.newValue || [])
      }
    }

    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.onChanged.addListener(handleStorageChange)
    }

    return () => {
      clearInterval(logInterval)
      clearInterval(domInterval)
      if (typeof chrome !== "undefined" && chrome.storage) {
        chrome.storage.onChanged.removeListener(handleStorageChange)
      }
    }
  }, [fetchSessionLogs, inspectTabDOM])

  const handleClearLogs = () => {
    if (typeof chrome !== "undefined" && chrome.storage?.session) {
      chrome.storage.session.remove("solverLogs").then(() => {
        setLogs([])
      })
    } else {
      setLogs([])
    }
  }

  const triggerCopyToast = (message: string) => {
    setCopyMessage(message)
    setTimeout(() => setCopyMessage(null), 2000)
  }

  const handleCopyLogs = () => {
    if (logs.length === 0) return
    const text = logs
      .map(
        (log) => `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`
      )
      .join("\n")
    navigator.clipboard
      .writeText(text)
      .then(() => {
        triggerCopyToast(getMessage("debugLogsCopied") || "Logs Copied!")
      })
      .catch((err) => console.error("Failed to copy DevTools logs:", err))
  }

  const handleCopyHtml = () => {
    if (!mainHtml) return
    navigator.clipboard
      .writeText(mainHtml)
      .then(() => {
        triggerCopyToast(getMessage("debugHtmlCopied") || "HTML Copied!")
      })
      .catch((err) => console.error("Failed to copy DOM HTML:", err))
  }

  const handleCopyBoth = () => {
    const logsText = logs
      .map(
        (log) => `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`
      )
      .join("\n")
    const combinedText = `=== CONSOLE LOGS ===\n${logsText || "(No logs captured)"}\n\n=== <main> HTML CONTENT ===\n${mainHtml || "(No HTML captured)"}`
    navigator.clipboard
      .writeText(combinedText)
      .then(() => {
        triggerCopyToast(getMessage("debugBothCopied") || "Both Copied!")
      })
      .catch((err) => console.error("Failed to copy combined info:", err))
  }

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      !searchQuery ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.type.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === "all" || log.type === filterType
    return matchesSearch && matchesType
  })

  // Helper to extract clean meaningful cell symbols/emojis
  const getCleanCellSymbol = (cell: CellEntry, game: string | null) => {
    const label = (cell.ariaLabel || "").toLowerCase()
    const text = (cell.text || "").toLowerCase()

    // 1. Queens Game - Queen & X Markers
    if (
      label.includes("kraliçe") ||
      label.includes("queen") ||
      text.includes("queen") ||
      text.includes("kraliçe") ||
      text.includes("👑")
    ) {
      return "👑"
    }
    if (
      text === "x" ||
      label.includes("çarpı") ||
      label.includes("marker") ||
      label.includes("empty") ||
      text.includes("empty")
    ) {
      if (game === "Queens") return "❌"
    }

    // 2. Tango Game - Sun & Moon Emojis
    if (
      label.includes("güneş") ||
      label.includes("günes") ||
      label.includes("sun") ||
      text.includes("sun") ||
      text.includes("güneş") ||
      text.includes("günes") ||
      text.includes("☀️")
    ) {
      return "☀️"
    }
    if (
      label.includes("ay") ||
      label.includes("moon") ||
      text.includes("moon") ||
      text.includes("ay") ||
      text.includes("🌙")
    ) {
      return "🌙"
    }

    // 2b. Tango Game - Equal & Cross Constraint Overlays
    if (label.includes("equal")) {
      return "="
    }
    if (label.includes("cross")) {
      return "x"
    }

    // 3. Digits/Numbers (Zip, Patches, Sudoku, Pinpoint, Crossclimb)
    const numbers = text.match(/\d+/) || label.match(/\d+/)
    if (numbers) {
      return numbers[0]
    }

    // 4. Fallback to clean short symbols
    const clean = cell.text.trim()
    if (clean.length === 1) {
      return clean.toUpperCase()
    }

    return ""
  }

  // Helper to resolve dynamically computed true background and border color
  const getCellStyles = (cell: CellEntry) => {
    const styles: React.CSSProperties = {}
    const hasColor =
      cell.color &&
      cell.color !== "rgba(0, 0, 0, 0)" &&
      cell.color !== "transparent" &&
      cell.color !== "rgba(0,0,0,0)"

    if (hasColor) {
      styles.backgroundColor = cell.color
      // Sharpen boundary line border color dynamically
      styles.borderColor = cell.color.replace(/[\d.]+\)$/g, "0.85)")
    }
    return styles
  }

  // Format background color styles beautifully
  const getCellClassName = (cell: CellEntry) => {
    const base =
      "w-full h-auto min-w-0 min-h-0 aspect-square rounded-md border flex items-center justify-center font-bold text-[10px] sm:text-xs transition-all duration-200 select-none shadow-sm "
    if (cell.disabled) {
      return base + "bg-muted/30 text-muted-foreground border-dashed border-border"
    }
    const hasColor =
      cell.color &&
      cell.color !== "rgba(0, 0, 0, 0)" &&
      cell.color !== "transparent" &&
      cell.color !== "rgba(0,0,0,0)"
    if (hasColor) {
      return base + "text-foreground font-black"
    }
    return base + "bg-card hover:bg-muted/10 text-foreground border-border"
  }

  return (
    <div className="flex flex-col h-screen select-none overflow-hidden bg-background text-foreground font-sans">
      {/* Top Header Controls bar */}
      <header className="flex items-center justify-between px-4 border-b border-border bg-card h-12 shrink-0 shadow-sm">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-[18px] h-[18px] rounded bg-primary flex items-center justify-center font-black text-primary-foreground text-[8px] tracking-tighter leading-none select-none">
            win
          </div>
          <span className="text-[11px] font-extrabold tracking-tight text-foreground uppercase">
            {getMessage("diagnosticsEngine")}
          </span>
          {isLive ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-500/15 text-emerald-400 uppercase tracking-wider gap-1 border border-emerald-500/20">
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
              {getMessage("liveInspected")}
            </span>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-muted text-muted-foreground uppercase tracking-wider border border-border">
              {getMessage("offline")}
            </span>
          )}
        </div>

        {tabUrl && (
          <div className="hidden md:flex items-center gap-1.5 text-[9px] font-medium text-muted-foreground max-w-[40%] truncate">
            <span className="shrink-0 font-bold uppercase">
              {getMessage("urlLabel")}
            </span>
            <span className="truncate underline select-text">{tabUrl}</span>
            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-semibold text-muted-foreground">
            {getMessage("inspectedTab")}{" "}
            <span className="font-mono text-foreground font-bold">
              {chrome.devtools?.inspectedWindow?.tabId ||
                getMessage("notAvailable")}
            </span>
          </span>
        </div>
      </header>

      {/* Main Workspace Panels grid */}
      <div className="flex flex-1 overflow-hidden min-h-0 bg-neutral-900/5">
        {/* Left Column: Visual Inspector */}
        <div className="w-1/2 border-r border-border p-2.5 overflow-y-auto space-y-2.5 flex flex-col min-h-0">
          <div className="bg-card border border-border rounded-xl p-3 shadow-sm space-y-2 flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between border-b border-border pb-2 shrink-0">
              <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <Grid className="w-3.5 h-3.5 text-primary" />
                {getMessage("liveMatrixGridInspector")}
              </span>
              {gameName && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-primary/10 text-primary uppercase">
                  {gameName}
                </span>
              )}
            </div>

            {gameName ? (
              <div className="flex-1 flex flex-col justify-center items-center overflow-auto min-h-0 p-4">
                {gridCells.length > 0 ? (
                  <div
                    className="grid gap-1.5 p-2 rounded-xl bg-neutral-950/40 border border-border/40 backdrop-blur-sm max-w-[280px] w-full h-fit shadow-inner animate-in fade-in zoom-in-95 duration-300"
                    style={{
                      gridTemplateColumns: `repeat(${Math.round(Math.sqrt(gridCells.length))}, minmax(0, 1fr))`
                    }}>
                    {gridCells.map((cell, cellIdx) => {
                      const cleanSymbol = getCleanCellSymbol(cell, gameName)
                      const styles = getCellStyles(cell)
                      const N = Math.round(Math.sqrt(gridCells.length))
                      const r = Math.floor(cellIdx / N)
                      const c = cellIdx % N
                      return (
                        <div key={cell.id} className="relative w-full aspect-square">
                          <div
                            className={getCellClassName(cell)}
                            style={styles}
                            title={`ID: ${cell.id}\nDisabled: ${cell.disabled}\nCSS Color: ${cell.color}\nSymbol: ${cleanSymbol}`}>
                            {cleanSymbol}
                          </div>
                          {gameName === "Tango" && c < N - 1 && cell.constraintRight && (
                            <div
                              className="absolute top-1/2 left-full -translate-y-1/2 -translate-x-1/2 ml-[3px] z-20 bg-neutral-950/90 text-foreground border border-border/60 w-3.5 h-3.5 flex items-center justify-center rounded text-[8px] font-black shadow-sm select-none pointer-events-none scale-90 backdrop-blur-sm hover:scale-100 transition-transform duration-150"
                              title={cell.constraintRight === "eq" ? "Equals (=)" : "Opposite (x)"}>
                              {cell.constraintRight === "eq" ? "=" : "×"}
                            </div>
                          )}
                          {gameName === "Tango" && r < N - 1 && cell.constraintBottom && (
                            <div
                              className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2 mt-[3px] z-20 bg-neutral-950/90 text-foreground border border-border/60 w-3.5 h-3.5 flex items-center justify-center rounded text-[8px] font-black shadow-sm select-none pointer-events-none scale-90 backdrop-blur-sm hover:scale-100 transition-transform duration-150"
                              title={cell.constraintBottom === "eq" ? "Equals (=)" : "Opposite (x)"}>
                              {cell.constraintBottom === "eq" ? "=" : "×"}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-[10px] text-muted-foreground italic text-center py-8">
                    {getMessage("parsingGameGridCells")}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 min-h-0">
                <Cpu className="w-8 h-8 text-muted-foreground/35 mb-2.5 animate-pulse" />
                <h4 className="text-xs font-bold text-foreground">
                  {getMessage("waitingForLinkedInGamePage")}
                </h4>
                <p className="text-[10px] text-muted-foreground max-w-[220px] leading-relaxed mt-1">
                  {getMessage("waitingForLinkedInGamePageDesc")}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Console/Telemetry logs */}
        <div className="w-1/2 p-2.5 overflow-y-auto flex flex-col min-h-0">
          <div className="bg-card border border-border rounded-xl p-3 shadow-sm space-y-2 flex flex-col flex-1 min-h-0">
            {/* Logs Toolbar */}
            <div className="flex flex-col gap-2 shrink-0 border-b border-border pb-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-[#0a66c2] dark:text-[#70b5f9]" />
                  {getMessage("telemetryLogsStreamer")}
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-muted text-muted-foreground uppercase tracking-wider">
                    {filteredLogs.length} {getMessage("matchesLabel")}
                  </span>
                </span>

                <div className="flex items-center gap-1.5">
                  {copyMessage && (
                    <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-0.5 animate-in fade-in slide-in-from-right-1 duration-200">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      {copyMessage}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={handleCopyHtml}
                    disabled={!mainHtml}
                    title={getMessage("debugCopyHtml")}>
                    <FileCode />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={handleCopyLogs}
                    disabled={logs.length === 0}
                    title={getMessage("debugCopyLogs")}>
                    <Copy />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={handleCopyBoth}
                    disabled={!mainHtml && logs.length === 0}
                    title={getMessage("debugCopyBoth")}>
                    <Share2 />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={handleClearLogs}
                    className="hover:text-destructive hover:bg-destructive/10 text-muted-foreground"
                    title={getMessage("clearLogSpaceTooltip")}>
                    <Trash2 />
                  </Button>
                </div>
              </div>

              {/* Search & Filter widgets */}
              <div className="flex gap-2 items-center w-full">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 w-3 h-3 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={getMessage("searchLogsPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-[10px] pl-8 h-8 rounded-lg border border-border bg-muted hover:border-primary/20 focus-visible:ring-1 focus-visible:ring-primary/20 text-foreground"
                  />
                </div>

                <div className="w-[110px] shrink-0">
                  <Select
                    value={filterType || "all"}
                    onValueChange={(val) => setFilterType(val)}>
                    <SelectTrigger className="w-full text-[10px] h-8 bg-card border border-border hover:border-primary/20 focus:ring-1 focus:ring-primary/20 justify-between">
                      <SelectValue
                        placeholder={getMessage("selectTypePlaceholder")}>
                        {getTypeLabel(filterType)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-card border border-border text-foreground">
                      <SelectItem value="all" className="text-[10px]">
                        {getMessage("allTypes")}
                      </SelectItem>
                      <SelectItem value="log" className="text-[10px]">
                        {getMessage("logsType")}
                      </SelectItem>
                      <SelectItem value="info" className="text-[10px]">
                        {getMessage("infoType")}
                      </SelectItem>
                      <SelectItem value="warn" className="text-[10px]">
                        {getMessage("warnsType")}
                      </SelectItem>
                      <SelectItem value="error" className="text-[10px]">
                        {getMessage("errorsType")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Stream Console View */}
            <div className="flex-1 overflow-hidden min-h-0 relative">
              {filteredLogs.length > 0 ? (
                <div className="h-full rounded-lg border border-border/80 bg-neutral-950 dark:bg-black p-3 font-mono text-[9px] leading-relaxed text-slate-300 overflow-y-auto space-y-1.5 scrollbar-thin select-text">
                  {filteredLogs.map((log, idx) => {
                    const isError = log.type === "error"
                    const isWarn = log.type === "warn"
                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-1 pb-1 border-b border-white/5 break-all ${isError ? "text-red-400 bg-red-950/20 px-1.5 py-0.5 rounded" : ""} ${isWarn ? "text-amber-400 bg-amber-950/15 px-1.5 py-0.5 rounded" : ""}`}>
                        <span className="text-slate-500 select-none shrink-0">
                          {log.timestamp}
                        </span>
                        <span
                          className={`font-bold uppercase select-none shrink-0 px-1 rounded text-[7.5px] ${isError ? "bg-red-500/20 text-red-500" : ""} ${isWarn ? "bg-amber-500/20 text-amber-500" : ""} ${log.type === "log" ? "bg-blue-500/10 text-blue-400" : ""} ${log.type === "info" ? "bg-teal-500/10 text-teal-400" : ""}`}>
                          [{log.type}]
                        </span>
                        <span className="whitespace-pre-wrap select-text">
                          {log.message}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-lg bg-muted/5 min-h-0">
                  <Terminal className="w-8 h-8 text-muted-foreground/35 mb-2.5 animate-pulse" />
                  <h4 className="text-xs font-bold text-foreground">
                    {getMessage("consoleStreamEmpty")}
                  </h4>
                  <p className="text-[10px] text-muted-foreground max-w-[200px] leading-relaxed mt-1">
                    {getMessage("consoleStreamEmptyDesc")}
                  </p>
                </div>
              )}
            </div>

            {/* Panel footer */}
            <div className="flex items-center gap-1.5 justify-center text-[8px] font-semibold text-muted-foreground pt-1.5 select-none shrink-0 border-t border-border">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {getMessage("subscribedToStorageSession")}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
