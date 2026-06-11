import crossclimbIcon from "~assets/crossclimb.svg"
import patchesIcon from "~assets/patches.svg"
import pinpointIcon from "~assets/pinpoint.svg"
import queensIcon from "~assets/queens.svg"
import sudokuIcon from "~assets/sudoku.svg"
import tangoIcon from "~assets/tango.svg"
import wendIcon from "~assets/wend.svg"
import zipIcon from "~assets/zip.svg"

export interface GameMetadata {
  id: string
  title: string
  description: string
  icon: string
  path: string
  illustrationBg: string
  illustrationColor: string
  color: {
    // Dashboard styling (Cards, logs, stats list)
    gradient: string
    text: string
    border: string
    badge: string

    // Popup list styling
    popupActive: string
    popupCompleted: string
    popupIconBg: string
    popupTextAccent: string
    popupIndicatorDot: string
  }
}

export const GAMES_CONFIG: GameMetadata[] = [
  {
    id: "patches",
    title: "Patches",
    description: "Piece it together",
    icon: patchesIcon,
    path: "patches",
    illustrationBg: "bg-[#ffebee] dark:bg-[#3e1f24]",
    illustrationColor: "text-[#c62828] dark:text-[#ef9a9a]",
    color: {
      gradient: "from-rose-500/10 to-pink-500/10",
      text: "text-rose-500",
      border: "border-rose-500/20",
      badge: "bg-rose-500/10 text-rose-500",
      popupActive:
        "border-rose-500 bg-rose-500/5 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 shadow-[0_2px_8px_rgba(244,63,94,0.08)]",
      popupCompleted:
        "border-rose-500/30 bg-rose-500/[0.02] hover:bg-rose-500/[0.05]",
      popupIconBg: "bg-rose-500/10 text-rose-500",
      popupTextAccent: "text-rose-600 dark:text-rose-400",
      popupIndicatorDot: "bg-rose-500"
    }
  },
  {
    id: "zip",
    title: "Zip",
    description: "Complete the path",
    icon: zipIcon,
    path: "zip",
    illustrationBg: "bg-[#fff3e0] dark:bg-[#3c2415]",
    illustrationColor: "text-[#e65100] dark:text-[#ffb74d]",
    color: {
      gradient: "from-orange-500/10 to-amber-500/10",
      text: "text-orange-500",
      border: "border-orange-500/20",
      badge: "bg-orange-500/10 text-orange-500",
      popupActive:
        "border-orange-500 bg-orange-500/5 hover:bg-orange-500/10 text-orange-600 dark:text-orange-400 shadow-[0_2px_8px_rgba(249,115,22,0.08)]",
      popupCompleted:
        "border-orange-500/30 bg-orange-500/[0.02] hover:bg-orange-500/[0.05]",
      popupIconBg: "bg-orange-500/10 text-orange-500",
      popupTextAccent: "text-orange-600 dark:text-orange-400",
      popupIndicatorDot: "bg-orange-500"
    }
  },
  {
    id: "sudoku",
    title: "Mini Sudoku",
    description: "The classic game, made mini",
    icon: sudokuIcon,
    path: "mini-sudoku",
    illustrationBg: "bg-[#e8f5e9] dark:bg-[#162e20]",
    illustrationColor: "text-[#2e7d32] dark:text-[#a5d6a7]",
    color: {
      gradient: "from-emerald-500/10 to-teal-500/10",
      text: "text-emerald-500",
      border: "border-emerald-500/20",
      badge: "bg-emerald-500/10 text-emerald-500",
      popupActive:
        "border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-[0_2px_8px_rgba(16,185,129,0.08)]",
      popupCompleted:
        "border-emerald-500/30 bg-emerald-500/[0.02] hover:bg-emerald-500/[0.05]",
      popupIconBg: "bg-emerald-500/10 text-emerald-500",
      popupTextAccent: "text-emerald-600 dark:text-emerald-400",
      popupIndicatorDot: "bg-emerald-500"
    }
  },
  {
    id: "tango",
    title: "Tango",
    description: "Harmonize the grid",
    icon: tangoIcon,
    path: "tango",
    illustrationBg: "bg-[#e3f2fd] dark:bg-[#15293c]",
    illustrationColor: "text-[#1565c0] dark:text-[#90caf9]",
    color: {
      gradient: "from-blue-500/10 to-indigo-500/10",
      text: "text-blue-500",
      border: "border-blue-500/20",
      badge: "bg-blue-500/10 text-blue-500",
      popupActive:
        "border-blue-500 bg-blue-500/5 hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-[0_2px_8px_rgba(59,130,246,0.08)]",
      popupCompleted:
        "border-blue-500/30 bg-blue-500/[0.02] hover:bg-blue-500/[0.05]",
      popupIconBg: "bg-blue-500/10 text-blue-500",
      popupTextAccent: "text-blue-600 dark:text-blue-400",
      popupIndicatorDot: "bg-blue-500"
    }
  },
  {
    id: "queens",
    title: "Queens",
    description: "Crown each region",
    icon: queensIcon,
    path: "queens",
    illustrationBg: "bg-[#f3e5f5] dark:bg-[#2d1a3c]",
    illustrationColor: "text-[#6a1b9a] dark:text-[#ce93d8]",
    color: {
      gradient: "from-violet-500/10 to-fuchsia-500/10",
      text: "text-violet-500",
      border: "border-violet-500/20",
      badge: "bg-violet-500/10 text-violet-500",
      popupActive:
        "border-violet-500 bg-violet-500/5 hover:bg-violet-500/10 text-violet-600 dark:text-violet-400 shadow-[0_2px_8px_rgba(139,92,246,0.08)]",
      popupCompleted:
        "border-violet-500/30 bg-violet-500/[0.02] hover:bg-violet-500/[0.05]",
      popupIconBg: "bg-violet-500/10 text-violet-500",
      popupTextAccent: "text-violet-600 dark:text-violet-400",
      popupIndicatorDot: "bg-violet-500"
    }
  },
  {
    id: "crossclimb",
    title: "Crossclimb",
    description: "Unlock a trivia ladder",
    icon: crossclimbIcon,
    path: "crossclimb",
    illustrationBg: "bg-[#e0f7fa] dark:bg-[#122e38]",
    illustrationColor: "text-[#00838f] dark:text-[#80deea]",
    color: {
      gradient: "from-cyan-500/10 to-teal-500/10",
      text: "text-cyan-500",
      border: "border-cyan-500/20",
      badge: "bg-cyan-500/10 text-cyan-500",
      popupActive:
        "border-cyan-500 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shadow-[0_2px_8px_rgba(6,182,212,0.08)]",
      popupCompleted:
        "border-cyan-500/30 bg-cyan-500/[0.02] hover:bg-cyan-500/[0.05]",
      popupIconBg: "bg-cyan-500/10 text-cyan-500",
      popupTextAccent: "text-cyan-600 dark:text-cyan-400",
      popupIndicatorDot: "bg-emerald-500"
    }
  },
  {
    id: "pinpoint",
    title: "Pinpoint",
    description: "Guess the category",
    icon: pinpointIcon,
    path: "pinpoint",
    illustrationBg: "bg-[#e8eaf6] dark:bg-[#1c203b]",
    illustrationColor: "text-[#283593] dark:text-[#9fa8da]",
    color: {
      gradient: "from-blue-500/10 to-indigo-500/10",
      text: "text-blue-500",
      border: "border-blue-500/20",
      badge: "bg-blue-500/10 text-blue-500",
      popupActive:
        "border-blue-500 bg-blue-500/5 hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-[0_2px_8px_rgba(59,130,246,0.08)]",
      popupCompleted:
        "border-blue-500/30 bg-blue-500/[0.02] hover:bg-blue-500/[0.05]",
      popupIconBg: "bg-blue-500/10 text-blue-500",
      popupTextAccent: "text-blue-600 dark:text-blue-400",
      popupIndicatorDot: "bg-emerald-500"
    }
  },
  {
    id: "wend",
    title: "Wend",
    description: "Weave through words",
    icon: wendIcon,
    path: "wend",
    illustrationBg: "bg-[#fbf1cc] dark:bg-[#3c3015]",
    illustrationColor: "text-[#eeb500] dark:text-[#ffd54f]",
    color: {
      gradient: "from-amber-500/10 to-yellow-500/10",
      text: "text-amber-500",
      border: "border-amber-500/20",
      badge: "bg-amber-500/10 text-amber-500",
      popupActive:
        "border-amber-500 bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-[0_2px_8px_rgba(245,158,11,0.08)]",
      popupCompleted:
        "border-amber-500/30 bg-amber-500/[0.02] hover:bg-amber-500/[0.05]",
      popupIconBg: "bg-amber-500/10 text-amber-500",
      popupTextAccent: "text-amber-600 dark:text-amber-400",
      popupIndicatorDot: "bg-amber-500"
    }
  }
]
