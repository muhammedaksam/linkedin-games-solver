import * as fs from "fs"
import * as path from "path"

import {
  validateCrossclimbPuzzle,
  validatePinpointPuzzle
} from "./validate-registry"

interface ParseResult {
  game: "pinpoint" | "crossclimb"
  puzzleId: string
  puzzleData: any
}

export function parseIssueBody(body: string): Record<string, string> {
  const sections: Record<string, string> = {}
  let currentHeader = ""
  let currentContent: string[] = []

  const lines = body.replace(/\r\n/g, "\n").split("\n")
  for (const line of lines) {
    if (line.startsWith("### ")) {
      if (currentHeader) {
        sections[currentHeader] = currentContent.join("\n").trim()
      }
      currentHeader = line.substring(4).trim()
      currentContent = []
    } else {
      if (currentHeader) {
        currentContent.push(line)
      }
    }
  }
  if (currentHeader) {
    sections[currentHeader] = currentContent.join("\n").trim()
  }
  return sections
}

export function extractPuzzle(sections: Record<string, string>): ParseResult {
  const rawGame = sections["Game Type"] || ""
  const puzzleId = (sections["Puzzle Number / Date Identifier"] || "").trim()

  if (!rawGame) {
    throw new Error("Missing 'Game Type' in submission form.")
  }
  if (!puzzleId) {
    throw new Error(
      "Missing 'Puzzle Number / Date Identifier' in submission form."
    )
  }

  const game = rawGame.toLowerCase().includes("pinpoint")
    ? "pinpoint"
    : "crossclimb"

  if (game === "pinpoint") {
    const category = sections["Pinpoint Category"] || ""
    const rawClues = sections["Pinpoint Clues"] || ""
    const clues = rawClues
      .split("\n")
      .map((c) => c.trim())
      .filter(Boolean)

    return {
      game,
      puzzleId,
      puzzleData: {
        category,
        clues
      }
    }
  } else {
    const topWord = (sections["Crossclimb Top Word"] || "").trim().toUpperCase()
    const bottomWord = (sections["Crossclimb Bottom Word"] || "")
      .trim()
      .toUpperCase()

    const rawClues = sections["Crossclimb Clues"] || ""
    const clues = rawClues
      .split("\n")
      .map((c) => c.trim())
      .filter(Boolean)

    const rawAnswers = sections["Crossclimb Answers"] || ""
    const answers = rawAnswers
      .split("\n")
      .map((a) => a.trim().toUpperCase())
      .filter(Boolean)

    return {
      game,
      puzzleId,
      puzzleData: {
        clues,
        answers,
        topWord,
        bottomWord
      }
    }
  }
}
function writeSummary(content: string) {
  // Always write locally to submission-summary.md so that next steps can read it
  fs.writeFileSync("submission-summary.md", content)
  // Also write to GITHUB_STEP_SUMMARY if available to show in Actions run overview
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.writeFileSync(process.env.GITHUB_STEP_SUMMARY, content)
  }
}

function runProcessor() {
  const issueBody = process.env.ISSUE_BODY

  if (!issueBody) {
    console.error("Error: ISSUE_BODY environment variable is empty.")
    process.exit(1)
  }

  try {
    const sections = parseIssueBody(issueBody)
    const { game, puzzleId, puzzleData } = extractPuzzle(sections)

    // Run deep validation
    let validationErrors: string[] = []
    if (game === "pinpoint") {
      validationErrors = validatePinpointPuzzle(puzzleId, puzzleData)
    } else {
      validationErrors = validateCrossclimbPuzzle(puzzleId, puzzleData)
    }

    if (validationErrors.length > 0) {
      const errorMsg =
        `### ❌ Validation Failed\n\nYour puzzle submission for **${game}** (ID: \`${puzzleId}\`) has validation errors:\n\n` +
        validationErrors.map((err) => `- ${err}`).join("\n") +
        "\n\n_Please edit your issue with the correct values to trigger validation again._"

      writeSummary(errorMsg)
      console.error("Validation failed:\n", validationErrors.join("\n"))
      process.exit(1)
    }

    // Validation succeeded, write to file
    const workspaceRoot = path.resolve(__dirname, "..")
    const registryFilePath = path.join(
      workspaceRoot,
      "registry",
      `${game}.json`
    )

    let registry: Record<string, any> = {}
    if (fs.existsSync(registryFilePath)) {
      registry = JSON.parse(fs.readFileSync(registryFilePath, "utf8"))
    }

    // Append / overwrite key
    registry[puzzleId] = puzzleData

    // Sort registry keys if they are numeric so the file stays sorted
    const sortedRegistry: Record<string, any> = {}
    const keys = Object.keys(registry).sort((a, b) => {
      const aNum = parseInt(a, 10)
      const bNum = parseInt(b, 10)
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum
      }
      return a.localeCompare(b)
    })

    for (const key of keys) {
      sortedRegistry[key] = registry[key]
    }

    // Write back pretty-printed with 2 spaces
    fs.writeFileSync(
      registryFilePath,
      JSON.stringify(sortedRegistry, null, 2) + "\n"
    )

    const summaryContent =
      `### 🎉 Submission Successfully Validated!\n\n` +
      `A Pull Request has been automatically opened to merge your **${game}** puzzle **#${puzzleId}** into the registry.\n\n` +
      `#### Proposed Entry details:\n` +
      `\`\`\`json\n` +
      `"${puzzleId}": ${JSON.stringify(puzzleData, null, 2)}\n` +
      `\`\`\`\n\n` +
      `Once reviewed and approved by the maintainers, it will be merged and deployed instantly. Thank you for your active contribution! 🚀`

    fs.writeFileSync("vars.env", `GAME=${game}\nPUZZLE_ID=${puzzleId}\n`)
    writeSummary(summaryContent)
    console.log(`Success: Appended and validated ${game} puzzle #${puzzleId}`)
    process.exit(0)
  } catch (err: any) {
    const errorMsg = `### ❌ Processing Error\n\nAn unexpected error occurred while parsing your submission:\n- **${err.message}**\n\n_Ensure you filled out the form fields correctly._`
    writeSummary(errorMsg)
    console.error("Unexpected processor error:", err)
    process.exit(1)
  }
}

// Run immediately if executed
if (require.main === module) {
  runProcessor()
}
