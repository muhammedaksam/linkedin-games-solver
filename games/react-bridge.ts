export interface ReactQueensCell {
  idx: number
  regionId: string | number
  state: number // -1=empty, 0=X, 1=Queen
  isGiven: boolean
}

export interface ReactQueensBoard {
  game: "queens"
  boardSize: number
  cells: ReactQueensCell[]
  solution?: number[]
}

export interface ReactTangoCell {
  idx: number
  value: number // -1=empty, 0=Sun, 1=Moon
  isGiven: boolean
}

export interface ReactTangoConstraint {
  a: number
  b: number
  type: "eq" | "neq"
}

export interface ReactTangoBoard {
  game: "tango"
  size: number
  cells: ReactTangoCell[] | null
  constraints: ReactTangoConstraint[] | null
  solution?: number[]
}

export interface ReactZipCheckpoint {
  value: number
  idx: number
}

export interface ReactZipWall {
  a: number
  b: number
}

export interface ReactZipBoard {
  game: "zip"
  size: number
  checkpoints: ReactZipCheckpoint[]
  walls: ReactZipWall[]
  solution?: number[]
}

export interface ReactPatchesClue {
  idx: number
  r: number
  c: number
  size: number | null
  type: "square" | "tall" | "wide" | "any"
}

export interface ReactPatchesBoard {
  game: "patches"
  gridRows: number
  gridCols: number
  clues: ReactPatchesClue[]
  solution?: number[][]
}

export interface ReactWendCell {
  idx: number
  letter: string
  row: number
  col: number
  isHole: boolean
  isLocked: boolean
}

export interface ReactWendBoard {
  game: "wend"
  gridCols: number
  gridRows: number
  cells: ReactWendCell[]
  wordLengths: number[]
  solvedFlags: boolean[]
  solution?: string[]
}

export async function fetchReactBoardState<
  T extends "queens" | "tango" | "zip" | "patches" | "wend"
>(
  gameName: T
): Promise<
  T extends "queens"
    ? ReactQueensBoard
    : T extends "tango"
      ? ReactTangoBoard
      : T extends "zip"
        ? ReactZipBoard
        : T extends "patches"
          ? ReactPatchesBoard
          : ReactWendBoard
> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("DOM/Window context is unavailable."))
      return
    }

    const requestId = Math.random().toString(36).substring(7)

    const listener = (event: MessageEvent) => {
      if (event.source !== window) return
      if (
        event.data?.source === "linkedin-games-solver-main" &&
        event.data?.action === "REACT_STATE_EXTRACTED" &&
        event.data?.requestId === requestId
      ) {
        window.removeEventListener("message", listener)
        if (event.data.success) {
          resolve(event.data.data)
        } else {
          reject(new Error(event.data.error))
        }
      }
    }

    window.addEventListener("message", listener)

    // Safety timeout of 1.5s
    setTimeout(() => {
      window.removeEventListener("message", listener)
      reject(
        new Error(
          "React Fiber State extraction request timed out. Falling back to DOM parsing."
        )
      )
    }, 1500)

    window.postMessage(
      {
        source: "linkedin-games-solver-content",
        action: "EXTRACT_REACT_STATE",
        requestId,
        gameName
      },
      "*"
    )
  })
}
