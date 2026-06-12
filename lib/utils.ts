import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface SolveRecord {
  solved: boolean
  time: number
  solvedAt?: string
}

export type SolveHistory = Record<string, Record<string, SolveRecord>>

// Generate local YYYY-MM-DD date key
export function getLocalDateString(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Generate daily puzzle numbers dynamically based on reference dates
export function getPuzzleNumber(gameId: string): number {
  const referenceDate = new Date(2026, 4, 18) // May 18, 2026
  const today = new Date()

  // Reset times to midnight for precise day calculation
  referenceDate.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)

  const diffTime = today.getTime() - referenceDate.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

  const baseNumbers: Record<string, number> = {
    queens: 748,
    patches: 62,
    zip: 427,
    sudoku: 280,
    tango: 588,
    crossclimb: 748,
    pinpoint: 748,
    wend: -21
  }

  const base = baseNumbers[gameId] || 748
  return base + diffDays
}
