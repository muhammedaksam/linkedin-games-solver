import {
  ChevronsUp,
  Crown,
  Grid3X3,
  Layers,
  Sun,
  Target,
  Zap
} from "lucide-react"

export interface GameMetadata {
  id: string
  title: string
  icon: typeof Grid3X3
  path: string
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
    id: "sudoku",
    title: "Mini Sudoku",
    icon: Grid3X3,
    path: "mini-sudoku",
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
    icon: Sun,
    path: "tango",
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
    icon: Crown,
    path: "queens",
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
    id: "zip",
    title: "Zip",
    icon: Zap,
    path: "zip",
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
    id: "patches",
    title: "Patches",
    icon: Layers,
    path: "patches",
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
    id: "crossclimb",
    title: "Crossclimb",
    icon: ChevronsUp,
    path: "crossclimb",
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
      popupIndicatorDot: "bg-cyan-500"
    }
  },
  {
    id: "pinpoint",
    title: "Pinpoint",
    icon: Target,
    path: "pinpoint",
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
  }
]
