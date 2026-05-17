import {
  Crown,
  Grid3X3,
  Layers,
  Sun,
  Zap
} from "lucide-react"

export interface GameMetadata {
  id: string
  title: string
  icon: typeof Grid3X3
  path: string
  color: {
    // Dashboard styling (Cards, logs, stats list)
    gradient: string // e.g., "from-emerald-500/10 to-teal-500/10"
    text: string // e.g., "text-emerald-500"
    border: string // e.g., "border-emerald-500/20"
    badge: string // e.g., "bg-emerald-500/10 text-emerald-500"
    
    // Popup cards interactive state styling
    popupActive: string // active tab styling for this game
    popupCompleted: string // completed today state styling
    popupIconBg: string // background highlight for icon
    popupTextAccent: string // text color accent
    popupIndicatorDot: string // status indicator dot color
  }
}

export const GAMES_CONFIG: GameMetadata[] = [
  {
    id: "sudoku",
    title: "Sudoku",
    icon: Grid3X3,
    path: "mini-sudoku",
    color: {
      gradient: "from-emerald-500/10 to-teal-500/10",
      text: "text-emerald-500",
      border: "border-emerald-500/20",
      badge: "bg-emerald-500/10 text-emerald-500",
      popupActive: "border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-[0_2px_8px_rgba(16,185,129,0.08)]",
      popupCompleted: "border-emerald-500/30 bg-emerald-500/[0.02] hover:bg-emerald-500/[0.05]",
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
      gradient: "from-slate-500/10 to-slate-400/10",
      text: "text-slate-500 dark:text-slate-400",
      border: "border-slate-500/20",
      badge: "bg-slate-500/10 text-slate-500 dark:text-slate-400",
      popupActive: "border-slate-500 bg-slate-500/5 hover:bg-slate-500/10 text-slate-600 dark:text-slate-400 shadow-[0_2px_8px_rgba(100,116,139,0.08)]",
      popupCompleted: "border-slate-500/30 bg-slate-500/[0.02] hover:bg-slate-500/[0.05]",
      popupIconBg: "bg-slate-500/10 text-slate-500 dark:text-slate-400",
      popupTextAccent: "text-slate-600 dark:text-slate-400",
      popupIndicatorDot: "bg-slate-500"
    }
  },
  {
    id: "queens",
    title: "Queens",
    icon: Crown,
    path: "queens",
    color: {
      gradient: "from-purple-500/10 to-fuchsia-500/10",
      text: "text-purple-500",
      border: "border-purple-500/20",
      badge: "bg-purple-500/10 text-purple-500",
      popupActive: "border-purple-500 bg-purple-500/5 hover:bg-purple-500/10 text-purple-600 dark:text-purple-400 shadow-[0_2px_8px_rgba(168,85,247,0.08)]",
      popupCompleted: "border-purple-500/30 bg-purple-500/[0.02] hover:bg-emerald-500/[0.05]",
      popupIconBg: "bg-purple-500/10 text-purple-500",
      popupTextAccent: "text-purple-600 dark:text-purple-400",
      popupIndicatorDot: "bg-purple-500"
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
      popupActive: "border-orange-500 bg-orange-500/5 hover:bg-orange-500/10 text-orange-600 dark:text-orange-400 shadow-[0_2px_8px_rgba(249,115,22,0.08)]",
      popupCompleted: "border-orange-500/30 bg-orange-500/[0.02] hover:bg-orange-500/[0.05]",
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
      gradient: "from-red-500/10 to-rose-500/10",
      text: "text-red-500",
      border: "border-red-500/20",
      badge: "bg-red-500/10 text-red-500",
      popupActive: "border-red-500 bg-red-500/5 hover:bg-red-500/10 text-red-600 dark:text-red-400 shadow-[0_2px_8px_rgba(239,68,68,0.08)]",
      popupCompleted: "border-red-500/30 bg-red-500/[0.02] hover:bg-red-500/[0.05]",
      popupIconBg: "bg-red-500/10 text-red-500",
      popupTextAccent: "text-red-600 dark:text-red-400",
      popupIndicatorDot: "bg-red-500"
    }
  }
]
