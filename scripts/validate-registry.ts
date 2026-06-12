import * as fs from "fs"
import * as path from "path"

export interface ValidationError {
  file: string
  key: string
  message: string
}

interface RawPinpointPuzzle {
  category?: unknown
  clues?: unknown
}

export function validatePinpointPuzzle(key: string, puzzle: unknown): string[] {
  const errors: string[] = []

  // Validate Key
  if (!/^\d+$/.test(key) && !/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    errors.push(
      `Invalid key format. Must be a numeric string (puzzle ID) or a date in YYYY-MM-DD format. Got: "${key}"`
    )
  }

  if (!puzzle || typeof puzzle !== "object") {
    errors.push("Puzzle entry must be a JSON object.")
    return errors
  }

  const p = puzzle as RawPinpointPuzzle

  // Validate category
  if (typeof p.category !== "string" || p.category.trim() === "") {
    errors.push("Property 'category' must be a non-empty string.")
  }

  // Validate clues
  if (!Array.isArray(p.clues)) {
    errors.push("Property 'clues' must be an array.")
  } else {
    if (p.clues.length !== 5) {
      errors.push(
        `Property 'clues' must contain exactly 5 clues. Got: ${p.clues.length}`
      )
    }
    p.clues.forEach((clue: unknown, index: number) => {
      if (typeof clue !== "string" || clue.trim() === "") {
        errors.push(`Clue at index ${index} must be a non-empty string.`)
      }
    })
  }

  return errors
}

interface RawWendPuzzle {
  words?: unknown
}

export function validateWendPuzzle(key: string, puzzle: unknown): string[] {
  const errors: string[] = []

  // Validate Key
  if (!/^\d+$/.test(key) && !/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    errors.push(
      `Invalid key format. Must be a numeric string (puzzle ID) or a date in YYYY-MM-DD format. Got: "${key}"`
    )
  }

  if (!puzzle || typeof puzzle !== "object") {
    errors.push("Puzzle entry must be a JSON object.")
    return errors
  }

  const p = puzzle as RawWendPuzzle

  // Validate words array
  if (!Array.isArray(p.words)) {
    errors.push("Property 'words' must be an array.")
  } else {
    if (p.words.length < 2 || p.words.length > 10) {
      errors.push(
        `Property 'words' must contain between 2 and 10 words. Got: ${p.words.length}`
      )
    }
    p.words.forEach((word: unknown, index: number) => {
      if (typeof word !== "string" || !/^[A-Z]+$/.test(word)) {
        errors.push(
          `Word at index ${index} must be an uppercase alphabetic string. Got: "${word}"`
        )
      }
    })
  }

  return errors
}

interface RawCrossclimbPuzzle {
  topWord?: unknown
  bottomWord?: unknown
  clues?: unknown
  answers?: unknown
}

export function validateCrossclimbPuzzle(
  key: string,
  puzzle: unknown
): string[] {
  const errors: string[] = []

  // Validate Key
  if (!/^\d+$/.test(key) && !/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    errors.push(
      `Invalid key format. Must be a numeric string (puzzle ID) or a date in YYYY-MM-DD format. Got: "${key}"`
    )
  }

  if (!puzzle || typeof puzzle !== "object") {
    errors.push("Puzzle entry must be a JSON object.")
    return errors
  }

  const p = puzzle as RawCrossclimbPuzzle

  // Validate topWord
  if (typeof p.topWord !== "string" || !/^[A-Z0-9]+$/.test(p.topWord)) {
    errors.push("Property 'topWord' must be an uppercase alphanumeric string.")
  }

  // Validate bottomWord
  if (typeof p.bottomWord !== "string" || !/^[A-Z0-9]+$/.test(p.bottomWord)) {
    errors.push(
      "Property 'bottomWord' must be an uppercase alphanumeric string."
    )
  }

  // Validate clues
  if (!Array.isArray(p.clues)) {
    errors.push("Property 'clues' must be an array.")
  } else {
    if (p.clues.length !== 5) {
      errors.push(
        `Property 'clues' must contain exactly 5 clues. Got: ${p.clues.length}`
      )
    }
    p.clues.forEach((clue: unknown, index: number) => {
      if (typeof clue !== "string" || clue.trim() === "") {
        errors.push(`Clue at index ${index} must be a non-empty string.`)
      }
    })
  }

  // Validate answers
  let answersValid = true
  if (!Array.isArray(p.answers)) {
    errors.push("Property 'answers' must be an array.")
    answersValid = false
  } else {
    if (p.answers.length !== 5) {
      errors.push(
        `Property 'answers' must contain exactly 5 answers. Got: ${p.answers.length}`
      )
      answersValid = false
    }
    p.answers.forEach((ans: unknown, index: number) => {
      if (typeof ans !== "string" || !/^[A-Z0-9]+$/.test(ans)) {
        errors.push(
          `Answer at index ${index} must be an uppercase alphanumeric string. Got: "${ans}"`
        )
        answersValid = false
      }
    })
  }

  // Word Ladder Validation
  if (
    answersValid &&
    typeof p.topWord === "string" &&
    typeof p.bottomWord === "string"
  ) {
    const topWord = p.topWord
    const bottomWord = p.bottomWord
    const answers = p.answers as string[]
    const ladder = [topWord, ...answers, bottomWord]

    // Check lengths match
    const targetLength = topWord.length
    if (targetLength < 3) {
      errors.push(
        `Word length must be at least 3 characters. Got: ${targetLength}`
      )
    }

    ladder.forEach((word, idx) => {
      if (word.length !== targetLength) {
        errors.push(
          `Word size mismatch in ladder: "${word}" at position ${idx} has length ${word.length}, expected ${targetLength} (matching topWord).`
        )
      }
    })

    // Check single-letter differences
    for (let i = 0; i < ladder.length - 1; i++) {
      const w1 = ladder[i]
      const w2 = ladder[i + 1]
      if (w1.length === targetLength && w2.length === targetLength) {
        let diffCount = 0
        for (let charIdx = 0; charIdx < targetLength; charIdx++) {
          if (w1[charIdx] !== w2[charIdx]) {
            diffCount++
          }
        }
        if (diffCount !== 1) {
          errors.push(
            `Invalid word ladder transition between "${w1}" and "${w2}" (diff is ${diffCount}, expected exactly 1 change).`
          )
        }
      }
    }
  }

  return errors
}

export function checkFileFormat(filePath: string): string[] {
  const errors: string[] = []
  try {
    if (!fs.existsSync(filePath)) {
      errors.push(`File does not exist: ${filePath}`)
      return errors
    }
    const rawContent = fs.readFileSync(filePath, "utf8")
    JSON.parse(rawContent)
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    errors.push(
      `JSON structure or parsing error in ${path.basename(filePath)}: ${errMsg}`
    )
  }
  return errors
}

// Runnable entry point for manual & CI verification
export function runValidationPipeline(): ValidationError[] {
  const errors: ValidationError[] = []
  const workspaceRoot = path.resolve(__dirname, "..")

  const pinpointPath = path.join(workspaceRoot, "registry", "pinpoint.json")
  const crossclimbPath = path.join(workspaceRoot, "registry", "crossclimb.json")
  const wendPath = path.join(workspaceRoot, "registry", "wend.json")

  console.log("=== Starting Registry Integrity Verification ===")

  // 1. Check file existence & valid format
  const pinpointFormatErrors = checkFileFormat(pinpointPath)
  pinpointFormatErrors.forEach((err) => {
    errors.push({ file: "registry/pinpoint.json", key: "Global", message: err })
  })

  const crossclimbFormatErrors = checkFileFormat(crossclimbPath)
  crossclimbFormatErrors.forEach((err) => {
    errors.push({
      file: "registry/crossclimb.json",
      key: "Global",
      message: err
    })
  })

  const wendFormatErrors = checkFileFormat(wendPath)
  wendFormatErrors.forEach((err) => {
    errors.push({
      file: "registry/wend.json",
      key: "Global",
      message: err
    })
  })

  // 2. Validate Pinpoint entry contents
  if (fs.existsSync(pinpointPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(pinpointPath, "utf8"))
      for (const [key, puzzle] of Object.entries(data)) {
        const itemErrors = validatePinpointPuzzle(key, puzzle)
        itemErrors.forEach((err) => {
          errors.push({ file: "registry/pinpoint.json", key, message: err })
        })
      }
    } catch {
      // JSON format error is already caught by checkFileFormat
    }
  }

  // 3. Validate Crossclimb entry contents
  if (fs.existsSync(crossclimbPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(crossclimbPath, "utf8"))
      for (const [key, puzzle] of Object.entries(data)) {
        const itemErrors = validateCrossclimbPuzzle(key, puzzle)
        itemErrors.forEach((err) => {
          errors.push({ file: "registry/crossclimb.json", key, message: err })
        })
      }
    } catch {
      // JSON format error is already caught by checkFileFormat
    }
  }

  // 4. Validate Wend entry contents
  if (fs.existsSync(wendPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(wendPath, "utf8"))
      for (const [key, puzzle] of Object.entries(data)) {
        const itemErrors = validateWendPuzzle(key, puzzle)
        itemErrors.forEach((err) => {
          errors.push({ file: "registry/wend.json", key, message: err })
        })
      }
    } catch {
      // JSON format error is already caught by checkFileFormat
    }
  }

  console.log(
    `Verification Complete. Status: ${errors.length === 0 ? "SUCCESS (0 Errors)" : `FAILED (${errors.length} Errors)`}`
  )
  if (errors.length > 0) {
    errors.forEach((err) => {
      console.error(`[ERROR] [${err.file}] (Key: "${err.key}"): ${err.message}`)
    })
  }

  return errors
}

// Execute immediately if run directly
if (require.main === module) {
  const errors = runValidationPipeline()
  if (errors.length > 0) {
    process.exit(1)
  }
  process.exit(0)
}
