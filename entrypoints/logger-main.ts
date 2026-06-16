import type {
  ReactPatchesBoard,
  ReactQueensBoard,
  ReactTangoBoard,
  ReactWendBoard,
  ReactWendCell,
  ReactZipBoard
} from "../games/react-bridge"

declare global {
  interface Window {
    __SOLVER_LOGGER_INITIALIZED__?: boolean
    testReactExtraction?: (
      gameName: string
    ) =>
      | ReactQueensBoard
      | ReactTangoBoard
      | ReactZipBoard
      | ReactPatchesBoard
      | ReactWendBoard
      | undefined
  }
}

export default defineUnlistedScript(() => {
  // Check to prevent double-initialization
  if (window.__SOLVER_LOGGER_INITIALIZED__) return
  window.__SOLVER_LOGGER_INITIALIZED__ = true

  const originalLog = console.log
  const originalError = console.error
  const originalWarn = console.warn
  const originalInfo = console.info

  const sendToIsolated = (type: string, args: unknown[]) => {
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
      } catch {
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

  console.log = (...args: unknown[]) => {
    originalLog.apply(console, args)
    sendToIsolated("log", args)
  }

  console.error = (...args: unknown[]) => {
    originalError.apply(console, args)
    sendToIsolated("error", args)
  }

  console.warn = (...args: unknown[]) => {
    originalWarn.apply(console, args)
    sendToIsolated("warn", args)
  }

  console.info = (...args: unknown[]) => {
    originalInfo.apply(console, args)
    sendToIsolated("info", args)
  }

  // React Fiber Extraction Bridge
  window.addEventListener("message", (event) => {
    if (event.source !== window) return
    if (
      event.data?.source === "linkedin-games-solver-content" &&
      event.data?.action === "EXTRACT_REACT_STATE"
    ) {
      try {
        const data = extractReactState(event.data.gameName)
        window.postMessage(
          {
            source: "linkedin-games-solver-main",
            action: "REACT_STATE_EXTRACTED",
            requestId: event.data.requestId,
            success: true,
            data
          },
          "*"
        )
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        window.postMessage(
          {
            source: "linkedin-games-solver-main",
            action: "REACT_STATE_EXTRACTED",
            requestId: event.data.requestId,
            success: false,
            error: errMsg
          },
          "*"
        )
      }
    }
  })

  // LinkedIn Games Internal Protobuf/React Schemas
  interface LotkaEdge {
    $type?: string
    startIdx?: number
    endIdx?: number
    isEqual?: boolean
    from?: number
    to?: number
    type?: string
  }

  interface LotkaGamePuzzle {
    $type?: string
    gridSize?: number
    presetCellIdxes?: number[]
    edges?: LotkaEdge[]
    solution?: string[]
    board?: {
      cells?: LinkedInRawCell[]
      constraints?: LinkedInRawConstraint[]
      edges?: LinkedInRawConstraint[]
    }
    grid?: {
      cells?: LinkedInRawCell[]
      constraints?: LinkedInRawConstraint[]
      edges?: LinkedInRawConstraint[]
    }
    constraints?: LinkedInRawConstraint[]
  }

  interface LotkaGameState {
    $type?: string
    cellValues?: string[]
  }

  interface GridPosition {
    $type?: string
    row: number
    col: number
  }

  interface QueensGameColorRow {
    $type?: string
    colors: number[]
  }

  interface QueensGamePuzzle {
    $type?: string
    gridSize?: number
    solution?: GridPosition[]
    colorGrid?: QueensGameColorRow[]
  }

  interface QueenGameCellGuess {
    $type?: string
    gridPosition: GridPosition
    queensGameCellType:
      | "QueensGameCellType_CLEARED"
      | "QueensGameCellType_QUEEN"
      | string
  }

  interface QueensGameState {
    $type?: string
    guesses?: QueenGameCellGuess[]
  }

  interface TrailWall {
    $type?: string
    startIdx?: number
    endIdx?: number
    from?: number
    to?: number
    cellA?: number
    cellB?: number
  }

  interface TrailGamePuzzle {
    $type?: string
    gridSize?: number
    orderedSequence?: number[]
    solution?: number[]
    walls?: TrailWall[]
    wallHints?: unknown[]
    orderedSequencePositions?: unknown[]
  }

  interface TrailSegment {
    $type?: string
    cells?: number[]
  }

  interface TrailGameState {
    $type?: string
    trailSegments?: TrailSegment[]
  }

  interface PatchesClueCell {
    $type?: string
    cellIdx: number
    shapeConstraint:
      | "PatchesShapeConstraint_UNKNOWN"
      | "PatchesShapeConstraint_SQUARE"
      | "PatchesShapeConstraint_HORIZONTAL_RECT"
      | "PatchesShapeConstraint_VERTICAL_RECT"
      | string
    numberConstraint?: number
  }

  interface PatchesRegion {
    $type?: string
    cellIdxes: number[]
  }

  interface PatchesGamePuzzle {
    $type?: string
    gridRows: number
    gridCols: number
    clueCells: PatchesClueCell[]
    solution: PatchesRegion[]
  }

  interface PatchesGameState {
    $type?: string
    drawnRegions: unknown[]
  }

  interface WendGamePuzzle {
    $type?: string
    gridRows?: number
    gridCols?: number
    rows?: number
    cols?: number
    words?: string[]
  }

  interface WendGameState {
    $type?: string
    solvedFlags?: boolean[]
  }

  interface LinkedInRawCell {
    idx: number
    regionId?: string | number
    colorId?: string | number
    color?: string | number
    state?: number
    hasQueen?: boolean
    hasMarker?: boolean
    isGiven?: boolean
    value?: number | string
    letter?: string
    isHole?: boolean
    isLocked?: boolean
    row?: number
    col?: number
  }

  interface LinkedInRawConstraint {
    cellA?: number
    cellB?: number
    startIdx?: number
    endIdx?: number
    from?: number
    to?: number
    type?: string
    isEqual?: boolean
  }

  interface LinkedInGameObj {
    $type?: string
    gameUrn?: string
    puzzle?: {
      $case?: string
      lotkaGamePuzzle?: LotkaGamePuzzle
      queensGamePuzzle?: QueensGamePuzzle
      trailGamePuzzle?: TrailGamePuzzle
      patchesGamePuzzle?: PatchesGamePuzzle
      wendGamePuzzle?: WendGamePuzzle
      weaveGamePuzzle?: WendGamePuzzle
      cells?: LinkedInRawCell[]
      board?: {
        cells?: LinkedInRawCell[]
        constraints?: LinkedInRawConstraint[]
        edges?: LinkedInRawConstraint[]
      }
      grid?: {
        cells?: LinkedInRawCell[]
        constraints?: LinkedInRawConstraint[]
        edges?: LinkedInRawConstraint[]
      }
      constraints?: LinkedInRawConstraint[]
      edges?: LinkedInRawConstraint[]
      [key: string]: unknown
    }
    gameState?: {
      $type?: string
      mostRecentGameState?: {
        $case?: string
        lotkaGameState?: LotkaGameState
        queensGameState?: QueensGameState
        trailGameState?: TrailGameState
        patchesGameState?: PatchesGameState
        wendGameState?: WendGameState
        weaveGameState?: WendGameState
        cells?: LinkedInRawCell[]
        board?: {
          cells?: LinkedInRawCell[]
          constraints?: LinkedInRawConstraint[]
          edges?: LinkedInRawConstraint[]
        }
        grid?: {
          cells?: LinkedInRawCell[]
          constraints?: LinkedInRawConstraint[]
          edges?: LinkedInRawConstraint[]
        }
        constraints?: LinkedInRawConstraint[]
        edges?: LinkedInRawConstraint[]
        [key: string]: unknown
      }
      completionAttributes?: unknown
      cells?: LinkedInRawCell[]
      board?: {
        cells?: LinkedInRawCell[]
        constraints?: LinkedInRawConstraint[]
        edges?: LinkedInRawConstraint[]
      }
      grid?: {
        cells?: LinkedInRawCell[]
        constraints?: LinkedInRawConstraint[]
        edges?: LinkedInRawConstraint[]
      }
      constraints?: LinkedInRawConstraint[]
      edges?: LinkedInRawConstraint[]
      [key: string]: unknown
    }
    cells?: LinkedInRawCell[]
    edges?: LinkedInRawConstraint[]
    constraints?: LinkedInRawConstraint[]
    board?: {
      cells?: LinkedInRawCell[]
      constraints?: LinkedInRawConstraint[]
      edges?: LinkedInRawConstraint[]
      boardSize?: number
      size?: number
      width?: number
      gridCols?: number
      [key: string]: unknown
    }
    grid?: {
      cells?: LinkedInRawCell[]
      constraints?: LinkedInRawConstraint[]
      edges?: LinkedInRawConstraint[]
      [key: string]: unknown
    }
    [key: string]: unknown
  }

  interface ReactFiberNode {
    memoizedProps?: Record<string, unknown> & {
      game?: LinkedInGameObj
    }
    memoizedState?: ReactFiberStateNode
    return?: ReactFiberNode
  }

  interface ReactFiberStateNode {
    memoizedState?: Record<string, unknown>
    next?: ReactFiberStateNode
  }

  const extractReactState = (
    gameName: "queens" | "tango" | "zip" | "patches" | "wend" | string
  ):
    | ReactQueensBoard
    | ReactTangoBoard
    | ReactZipBoard
    | ReactPatchesBoard
    | ReactWendBoard => {
    if (
      gameName === "sudoku" ||
      gameName === "pinpoint" ||
      gameName === "crossclimb"
    ) {
      throw new Error(
        `React Fiber state extraction is not implemented/supported for Ember-based game: ${gameName}`
      )
    }

    // 1. Locate board root element dynamically
    let gridEl = document.querySelector(
      '[data-testid="interactive-grid"]'
    ) as HTMLElement | null
    if (!gridEl) {
      const selectors = [
        '[data-sudoku-grid="true"]',
        ".crossclimb__grid",
        ".pinpoint__board",
        ".game-board",
        '[data-testid^="patches-"]',
        'main [class*="game"]',
        "main"
      ]
      for (const sel of selectors) {
        const el = document.querySelector(sel) as HTMLElement | null
        if (el) {
          gridEl = el
          break
        }
      }
    }

    if (!gridEl) {
      throw new Error(
        "Game board element not found in DOM (tried selectors for interactive-grid, sudoku, crossclimb, pinpoint, game-board)."
      )
    }

    // 2. Identify random React internal property key
    const fiberKey = Object.keys(gridEl).find(
      (key) =>
        key.startsWith("__reactFiber$") || key.startsWith("__reactContainer$")
    )
    if (!fiberKey) {
      throw new Error(
        "React Fiber keys not found on board element. Check if React is loaded."
      )
    }

    const fiber = (gridEl as unknown as Record<string, unknown>)[fiberKey] as
      | ReactFiberNode
      | null
      | undefined

    // Helper to deep traverse props/state looking for keys
    const findValueInFibers = (
      startFiber: ReactFiberNode | null | undefined,
      keyName: string
    ): unknown => {
      let curr = startFiber
      while (curr) {
        // Inspect props
        if (curr.memoizedProps && curr.memoizedProps[keyName] !== undefined) {
          return curr.memoizedProps[keyName]
        }
        // Inspect state
        if (curr.memoizedState) {
          let stateNode: ReactFiberStateNode | undefined = curr.memoizedState
          while (stateNode) {
            if (
              stateNode.memoizedState &&
              stateNode.memoizedState[keyName] !== undefined
            ) {
              return stateNode.memoizedState[keyName]
            }
            stateNode = stateNode.next
          }
        }
        curr = curr.return
      }
      return null
    }

    // 3. Search return tree for a "game" prop object
    let currFiber = fiber
    let gameObj: LinkedInGameObj | null = null
    while (currFiber) {
      if (
        currFiber.memoizedProps?.game &&
        typeof currFiber.memoizedProps.game === "object"
      ) {
        gameObj = currFiber.memoizedProps.game
        break
      }
      currFiber = currFiber.return
    }

    if (gameObj) {
      console.log(
        "[Test] Found parent React game state object! Properties:",
        Object.keys(gameObj)
      )
    }

    // Generic fallback helper to pull key from game object, then recursively up the fiber tree
    const getBoardProperty = (keyName: string): unknown => {
      if (gameObj) {
        if (gameObj[keyName] !== undefined) return gameObj[keyName]

        // lotkaGamePuzzle
        if (
          gameObj.puzzle?.lotkaGamePuzzle &&
          (gameObj.puzzle.lotkaGamePuzzle as Record<string, unknown>)[
            keyName
          ] !== undefined
        ) {
          return (gameObj.puzzle.lotkaGamePuzzle as Record<string, unknown>)[
            keyName
          ]
        }

        // mostRecentGameState
        if (
          gameObj.gameState?.mostRecentGameState &&
          (gameObj.gameState.mostRecentGameState as Record<string, unknown>)[
            keyName
          ] !== undefined
        ) {
          return (
            gameObj.gameState.mostRecentGameState as Record<string, unknown>
          )[keyName]
        }

        if (
          gameObj.puzzle &&
          (gameObj.puzzle as Record<string, unknown>)[keyName] !== undefined
        )
          return (gameObj.puzzle as Record<string, unknown>)[keyName]
        if (
          gameObj.gameState &&
          (gameObj.gameState as Record<string, unknown>)[keyName] !== undefined
        )
          return (gameObj.gameState as Record<string, unknown>)[keyName]
        if (
          gameObj.board &&
          (gameObj.board as Record<string, unknown>)[keyName] !== undefined
        )
          return (gameObj.board as Record<string, unknown>)[keyName]
        if (
          gameObj.grid &&
          (gameObj.grid as Record<string, unknown>)[keyName] !== undefined
        )
          return (gameObj.grid as Record<string, unknown>)[keyName]
      }
      return findValueInFibers(fiber, keyName)
    }

    // Multi-level robust board N size inference
    const getBoardSize = (): number => {
      const sizeVal =
        getBoardProperty("boardSize") ||
        getBoardProperty("size") ||
        getBoardProperty("width") ||
        getBoardProperty("gridCols")

      if (typeof sizeVal === "number" && sizeVal > 0) return sizeVal

      // Parse from computed custom variables (style="--_28d16da7: 6;")
      const inlineStyle = gridEl ? gridEl.getAttribute("style") || "" : ""
      const matches = inlineStyle.match(/--[\w-]+:\s*(\d+)/g)
      if (matches) {
        for (const m of matches) {
          const val = parseInt(m.split(":")[1], 10)
          if (val > 0 && val < 20) return val
        }
      }

      const cellsCount = gridEl
        ? gridEl.querySelectorAll('[data-testid^="cell-"]').length
        : 0
      if (cellsCount > 0) {
        return Math.round(Math.sqrt(cellsCount))
      }
      return 6
    }

    // Generic cells array lookup
    const getCellsArray = (): LinkedInRawCell[] | null => {
      if (gameObj) {
        if (Array.isArray(gameObj.cells)) return gameObj.cells

        // Nested under puzzle.lotkaGamePuzzle
        if (gameObj.puzzle?.lotkaGamePuzzle) {
          const l = gameObj.puzzle.lotkaGamePuzzle
          if (l.board && Array.isArray(l.board.cells)) return l.board.cells
          if (l.grid && Array.isArray(l.grid.cells)) return l.grid.cells
        }

        // Nested under gameState.mostRecentGameState
        if (gameObj.gameState?.mostRecentGameState) {
          const m = gameObj.gameState.mostRecentGameState
          if (m.board && Array.isArray(m.board.cells)) return m.board.cells
          if (m.grid && Array.isArray(m.grid.cells)) return m.grid.cells
        }

        // Nested under puzzle
        if (gameObj.puzzle) {
          if (Array.isArray(gameObj.puzzle.cells)) return gameObj.puzzle.cells
          if (gameObj.puzzle.board && Array.isArray(gameObj.puzzle.board.cells))
            return gameObj.puzzle.board.cells
          if (gameObj.puzzle.grid && Array.isArray(gameObj.puzzle.grid.cells))
            return gameObj.puzzle.grid.cells
        }

        // Nested under gameState
        if (gameObj.gameState) {
          if (Array.isArray(gameObj.gameState.cells))
            return gameObj.gameState.cells
          if (
            gameObj.gameState.board &&
            Array.isArray(gameObj.gameState.board.cells)
          )
            return gameObj.gameState.board.cells
          if (
            gameObj.gameState.grid &&
            Array.isArray(gameObj.gameState.grid.cells)
          )
            return gameObj.gameState.grid.cells
        }

        if (gameObj.board && Array.isArray(gameObj.board.cells))
          return gameObj.board.cells
        if (gameObj.grid && Array.isArray(gameObj.grid.cells))
          return gameObj.grid.cells
      }
      const raw = findValueInFibers(fiber, "cells")
      if (Array.isArray(raw)) return raw as LinkedInRawCell[]
      return null
    }

    // Compile schemas by game type
    if (gameName === "queens") {
      let boardSize = getBoardSize()
      let cells: ReactQueensBoard["cells"] | null = null
      let solution: number[] | undefined

      const queensPuzzle = gameObj?.puzzle?.queensGamePuzzle
      const queensState =
        gameObj?.gameState?.mostRecentGameState?.queensGameState

      if (queensPuzzle?.gridSize && Array.isArray(queensPuzzle.colorGrid)) {
        boardSize = queensPuzzle.gridSize
        const N = boardSize
        const guesses = queensState?.guesses || []

        cells = Array.from({ length: N * N }, (_, idx) => {
          const row = Math.floor(idx / N)
          const col = idx % N
          const regionId =
            queensPuzzle.colorGrid?.[row]?.colors?.[col] !== undefined
              ? queensPuzzle.colorGrid[row].colors[col]
              : 0

          const guess = guesses.find(
            (g) =>
              g.gridPosition &&
              g.gridPosition.row === row &&
              g.gridPosition.col === col
          )

          let state = -1
          if (guess) {
            if (guess.queensGameCellType === "QueensGameCellType_QUEEN") {
              state = 1
            } else if (
              guess.queensGameCellType === "QueensGameCellType_CLEARED" ||
              guess.queensGameCellType === "QueensGameCellType_MARKER"
            ) {
              state = 0
            }
          }

          return {
            idx,
            regionId,
            state,
            isGiven: false
          }
        })

        if (Array.isArray(queensPuzzle.solution)) {
          solution = queensPuzzle.solution.map((pos) => pos.row * N + pos.col)
        }
      }

      if (!cells) {
        const rawCells = getCellsArray()
        if (rawCells) {
          cells = rawCells.map((cell, idx) => ({
            idx,
            regionId:
              cell.regionId !== undefined
                ? cell.regionId
                : cell.colorId !== undefined
                  ? cell.colorId
                  : cell.color ?? 0,
            state:
              cell.state !== undefined
                ? cell.state
                : cell.hasQueen
                  ? 1
                  : cell.hasMarker
                    ? 0
                    : -1,
            isGiven: !!cell.isGiven
          }))
        }
      }

      if (cells && cells.length > 0) {
        return {
          game: "queens",
          boardSize,
          cells,
          solution
        }
      }

      throw new Error(
        "Unable to locate 'cells' array in Queens React Fiber tree."
      )
    }

    if (gameName === "tango") {
      let size = getBoardSize()
      let cells: ReactTangoBoard["cells"] = null
      let constraints: ReactTangoBoard["constraints"] = null
      let solution: number[] | undefined

      const lotkaPuzzle = gameObj?.puzzle?.lotkaGamePuzzle
      const lotkaState = gameObj?.gameState?.mostRecentGameState?.lotkaGameState

      if (lotkaPuzzle?.gridSize) {
        size = lotkaPuzzle.gridSize
        const presetCellIdxes = lotkaPuzzle.presetCellIdxes || []
        const cellValues = lotkaState?.cellValues || []
        cells = Array.from({ length: size * size }, (_, idx) => {
          const rawVal = cellValues[idx] || ""
          let val = -1
          if (rawVal.includes("ZERO")) val = 0
          else if (rawVal.includes("ONE")) val = 1

          return {
            idx,
            value: val,
            isGiven: presetCellIdxes.includes(idx)
          }
        })

        if (Array.isArray(lotkaPuzzle.edges)) {
          constraints = lotkaPuzzle.edges.map((e) => ({
            a: e.startIdx !== undefined ? e.startIdx : e.from ?? 0,
            b: e.endIdx !== undefined ? e.endIdx : e.to ?? 0,
            type:
              e.isEqual === true || e.type === "equal" || e.type === "eq"
                ? ("eq" as const)
                : ("neq" as const)
          }))
        }

        if (Array.isArray(lotkaPuzzle.solution)) {
          solution = lotkaPuzzle.solution.map((s) =>
            s.includes("ZERO") ? 0 : 1
          )
        }
      }

      if (!cells) {
        const rawCells = getCellsArray()
        if (rawCells) {
          cells = rawCells.map((cell, idx) => ({
            idx,
            value:
              typeof cell.value === "number"
                ? cell.value
                : typeof cell.value === "string"
                  ? parseInt(cell.value, 10) || -1
                  : -1,
            isGiven: !!cell.isGiven
          }))
        }
      }

      if (!constraints) {
        const getTangoConstraints = (): LinkedInRawConstraint[] | null => {
          if (gameObj) {
            if (Array.isArray(gameObj.constraints)) return gameObj.constraints
            if (Array.isArray(gameObj.edges)) return gameObj.edges

            if (gameObj.puzzle?.lotkaGamePuzzle) {
              const l = gameObj.puzzle.lotkaGamePuzzle
              if (Array.isArray(l.constraints))
                return l.constraints as LinkedInRawConstraint[]
              if (Array.isArray(l.edges)) return l.edges
              if (l.board && Array.isArray(l.board.constraints))
                return l.board.constraints as LinkedInRawConstraint[]
              if (l.board && Array.isArray(l.board.edges)) return l.board.edges
            }

            if (gameObj.puzzle) {
              if (Array.isArray(gameObj.puzzle.constraints))
                return gameObj.puzzle.constraints as LinkedInRawConstraint[]
              if (Array.isArray(gameObj.puzzle.edges))
                return gameObj.puzzle.edges
              if (
                gameObj.puzzle.board &&
                Array.isArray(gameObj.puzzle.board.constraints)
              )
                return gameObj.puzzle.board
                  .constraints as LinkedInRawConstraint[]
              if (
                gameObj.puzzle.board &&
                Array.isArray(gameObj.puzzle.board.edges)
              )
                return gameObj.puzzle.board.edges
            }

            if (gameObj.gameState?.mostRecentGameState) {
              const m = gameObj.gameState.mostRecentGameState
              if (Array.isArray(m.constraints))
                return m.constraints as LinkedInRawConstraint[]
              if (Array.isArray(m.edges)) return m.edges
            }

            if (gameObj.gameState) {
              if (Array.isArray(gameObj.gameState.constraints))
                return gameObj.gameState.constraints as LinkedInRawConstraint[]
              if (Array.isArray(gameObj.gameState.edges))
                return gameObj.gameState.edges
            }

            if (gameObj.board && Array.isArray(gameObj.board.constraints))
              return gameObj.board.constraints as LinkedInRawConstraint[]
            if (gameObj.grid && Array.isArray(gameObj.grid.constraints))
              return gameObj.grid.constraints as LinkedInRawConstraint[]
            if (gameObj.board && Array.isArray(gameObj.board.edges))
              return gameObj.board.edges
            if (gameObj.grid && Array.isArray(gameObj.grid.edges))
              return gameObj.grid.edges
          }
          const raw =
            findValueInFibers(fiber, "constraints") ||
            findValueInFibers(fiber, "edges")
          if (Array.isArray(raw)) return raw as LinkedInRawConstraint[]
          return null
        }

        const rawConstraints = getTangoConstraints()
        if (rawConstraints) {
          constraints = rawConstraints.map((c) => ({
            a:
              c.cellA !== undefined
                ? c.cellA
                : c.startIdx !== undefined
                  ? c.startIdx
                  : c.from ?? 0,
            b:
              c.cellB !== undefined
                ? c.cellB
                : c.endIdx !== undefined
                  ? c.endIdx
                  : c.to ?? 0,
            type:
              c.isEqual === true || c.type === "equal" || c.type === "eq"
                ? ("eq" as const)
                : ("neq" as const)
          }))
        }
      }

      return {
        game: "tango",
        size,
        cells,
        constraints,
        solution
      }
    }

    if (gameName === "zip") {
      let size = getBoardSize()
      let checkpoints: ReactZipBoard["checkpoints"] = []
      let walls: ReactZipBoard["walls"] = []
      let solution: number[] | undefined

      const trailPuzzle = gameObj?.puzzle?.trailGamePuzzle

      if (trailPuzzle?.gridSize) {
        size = trailPuzzle.gridSize
        if (Array.isArray(trailPuzzle.orderedSequence)) {
          checkpoints = trailPuzzle.orderedSequence.map(
            (idx: number, idxInSeq: number) => ({
              value: idxInSeq + 1,
              idx
            })
          )
        }

        if (Array.isArray(trailPuzzle.walls)) {
          walls = trailPuzzle.walls
            .map((w) => {
              const a =
                w.startIdx !== undefined
                  ? w.startIdx
                  : w.from !== undefined
                    ? w.from
                    : w.cellA
              const b =
                w.endIdx !== undefined
                  ? w.endIdx
                  : w.to !== undefined
                    ? w.to
                    : w.cellB
              if (a !== undefined && b !== undefined) {
                return { a, b }
              }
              return null
            })
            .filter((w): w is { a: number; b: number } => w !== null)
        }

        if (Array.isArray(trailPuzzle.solution)) {
          solution = trailPuzzle.solution
        }
      }

      return {
        game: "zip",
        size,
        checkpoints,
        walls,
        solution
      }
    }

    if (gameName === "patches") {
      const patchesPuzzle = gameObj?.puzzle?.patchesGamePuzzle
      if (!patchesPuzzle) {
        throw new Error(
          "Unable to locate 'patchesGamePuzzle' in Patches React Fiber tree."
        )
      }

      const gridRows = patchesPuzzle.gridRows || 6
      const gridCols = patchesPuzzle.gridCols || 6
      const clueCells = patchesPuzzle.clueCells || []

      const clues = clueCells.map((clue: PatchesClueCell) => {
        const idx = clue.cellIdx
        const r = Math.floor(idx / gridCols)
        const c = idx % gridCols
        const size =
          clue.numberConstraint && clue.numberConstraint > 0
            ? clue.numberConstraint
            : null

        let type: "square" | "tall" | "wide" | "any"
        switch (clue.shapeConstraint) {
          case "PatchesShapeConstraint_HORIZONTAL_RECT":
            type = "wide"
            break
          case "PatchesShapeConstraint_VERTICAL_RECT":
            type = "tall"
            break
          case "PatchesShapeConstraint_SQUARE":
            type = "square"
            break
          default:
            type = "any"
        }

        return {
          idx,
          r,
          c,
          size,
          type
        }
      })

      const solution = patchesPuzzle.solution
        ? patchesPuzzle.solution.map((r: PatchesRegion) => r.cellIdxes)
        : undefined

      return {
        game: "patches",
        gridRows,
        gridCols,
        clues,
        solution
      }
    }

    if (gameName === "wend") {
      const wendPuzzle =
        gameObj?.puzzle?.wendGamePuzzle || gameObj?.puzzle?.weaveGamePuzzle
      const wendState =
        gameObj?.gameState?.mostRecentGameState?.wendGameState ||
        gameObj?.gameState?.mostRecentGameState?.weaveGameState

      let gridRows = wendPuzzle?.gridRows || wendPuzzle?.rows || 5
      let gridCols = wendPuzzle?.gridCols || wendPuzzle?.cols || 5

      if (!gridRows || !gridCols) {
        gridCols = getBoardSize()
        gridRows = gridCols
      }

      let cells: ReactWendCell[] = []
      const rawCells = getCellsArray()
      if (rawCells && rawCells.length > 0) {
        cells = rawCells.map((cell, idx) => {
          const row =
            cell.row !== undefined ? cell.row : Math.floor(idx / gridCols)
          const col = cell.col !== undefined ? cell.col : idx % gridCols
          return {
            idx,
            letter: String(cell.value || cell.letter || "").toUpperCase(),
            row,
            col,
            isHole: !!cell.isHole || cell.state === 2,
            isLocked: !!cell.isGiven || !!cell.isLocked || cell.state === 1
          }
        })
      }

      if (cells.length === 0) {
        const grid = document.querySelector('[data-testid="interactive-grid"]')
        if (grid) {
          const cellEls = grid.querySelectorAll("[data-cell-idx]")
          cells = Array.from(cellEls).map((el) => {
            const idx = parseInt(el.getAttribute("data-cell-idx") || "0", 10)
            const isHole = el.getAttribute("data-cell-is-hole") === "true"
            const isLocked = el.getAttribute("data-cell-is-locked") === "true"
            let letter = ""
            if (!isHole) {
              const span = el.querySelector("span[class*='_08ba2e12']")
              if (span) {
                letter = (span.textContent || "").trim().toUpperCase()
              }
              if (!letter) {
                const spans = el.querySelectorAll("span")
                for (const s of Array.from(spans)) {
                  const txt = (s.textContent || "").trim()
                  if (txt.length === 1 && /[A-Z]/i.test(txt)) {
                    letter = txt.toUpperCase()
                    break
                  }
                }
              }
            }
            return {
              idx,
              letter,
              row: Math.floor(idx / gridCols),
              col: idx % gridCols,
              isHole,
              isLocked
            }
          })
        }
      }

      let wordLengths: number[] = []
      let solvedFlags: boolean[] = []

      if (wendPuzzle && Array.isArray(wendPuzzle.words)) {
        wordLengths = wendPuzzle.words.map((w: string) => w.length)
      }
      if (wendState && Array.isArray(wendState.solvedFlags)) {
        solvedFlags = wendState.solvedFlags
      }

      if (wordLengths.length === 0) {
        let rowIdx = 0
        while (true) {
          const row = document.querySelector(
            `[data-testid="wend-word-list-row-${rowIdx}"]`
          )
          if (!row) break

          let slotIdx = 0
          while (
            row.querySelector(
              `[data-testid="wend-word-list-slot-${rowIdx}-${slotIdx}"]`
            )
          ) {
            slotIdx++
          }
          if (slotIdx > 0) wordLengths.push(slotIdx)
          solvedFlags.push(row.getAttribute("data-locked") === "true")
          rowIdx++
        }
      }

      while (solvedFlags.length < wordLengths.length) {
        solvedFlags.push(false)
      }

      const solution =
        wendPuzzle && Array.isArray(wendPuzzle.words)
          ? wendPuzzle.words
          : undefined

      let edition: number | undefined
      if (typeof gameObj?.todaysGameEditionText === "string") {
        const m = gameObj.todaysGameEditionText.match(/\d+/)
        if (m) {
          edition = parseInt(m[0], 10)
        }
      }

      return {
        game: "wend",
        gridCols,
        gridRows,
        cells,
        wordLengths,
        solvedFlags,
        solution,
        edition
      }
    }

    throw new Error(
      `State extraction not implemented yet for game: ${gameName}`
    )
  }

  // Expose direct console test function
  window.testReactExtraction = (gameName: string) => {
    try {
      console.log(`[Test] Running React Fiber extraction for '${gameName}'...`)
      const state = extractReactState(gameName)
      console.log(`[Test] Extraction Successful:`, state)
      return state
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error(`[Test] Extraction Failed:`, errMsg)
    }
  }
})
