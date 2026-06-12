import { describe, expect, it } from "vitest"

import {
  validateCrossclimbPuzzle,
  validatePinpointPuzzle,
  validateWendPuzzle
} from "./validate-registry"

describe("Pinpoint Registry Validation", () => {
  it("should pass validation for a valid pinpoint puzzle entry", () => {
    const validPuzzle = {
      category: "Types of pool",
      clues: ["Car", "Dating", "Jury", "Gene", "Swimming"]
    }
    const errors = validatePinpointPuzzle("757", validPuzzle)
    expect(errors).toEqual([])
  })

  it("should fail if the category is missing or empty", () => {
    const badPuzzle = {
      category: "",
      clues: ["Car", "Dating", "Jury", "Gene", "Swimming"]
    }
    const errors = validatePinpointPuzzle("757", badPuzzle)
    expect(errors.some((e) => e.includes("category"))).toBe(true)
  })

  it("should fail if there are not exactly 5 clues", () => {
    const badPuzzle = {
      category: "Types of pool",
      clues: ["Car", "Dating", "Jury"]
    }
    const errors = validatePinpointPuzzle("757", badPuzzle)
    expect(errors.some((e) => e.includes("contain exactly 5 clues"))).toBe(true)
  })

  it("should fail if key format is invalid", () => {
    const validPuzzle = {
      category: "Types of pool",
      clues: ["Car", "Dating", "Jury", "Gene", "Swimming"]
    }
    const errors = validatePinpointPuzzle("abc", validPuzzle)
    expect(errors.some((e) => e.includes("Invalid key format"))).toBe(true)
  })
})

describe("Crossclimb Registry Validation", () => {
  it("should pass validation for a valid crossclimb puzzle entry (4-letter ladder)", () => {
    const validPuzzle = {
      clues: [
        "Type of bed",
        "Financial institution",
        "Musical group",
        "Very tight connection",
        "Pleasant, as memories"
      ],
      answers: ["BUNK", "BANK", "BAND", "BOND", "FOND"],
      topWord: "JUNK",
      bottomWord: "FOOD"
    }
    const errors = validateCrossclimbPuzzle("758", validPuzzle)
    expect(errors).toEqual([])
  })

  it("should pass validation for a valid crossclimb puzzle entry (5-letter ladder)", () => {
    const validPuzzle = {
      clues: ["Jabs", "Holes", "Makes yawn", "Exposes", "Is interested"],
      answers: ["POKES", "PORES", "BORES", "BARES", "CARES"],
      topWord: "POKER",
      bottomWord: "CARDS"
    }
    const errors = validateCrossclimbPuzzle("757", validPuzzle)
    expect(errors).toEqual([])
  })

  it("should fail if the topWord or bottomWord contains lowercase letters", () => {
    const badPuzzle = {
      clues: ["Jabs", "Holes", "Makes yawn", "Exposes", "Is interested"],
      answers: ["POKES", "PORES", "BORES", "BARES", "CARES"],
      topWord: "poker",
      bottomWord: "CARDS"
    }
    const errors = validateCrossclimbPuzzle("757", badPuzzle)
    expect(errors.some((e) => e.includes("topWord"))).toBe(true)
  })

  it("should fail if there is a word length size mismatch in the ladder", () => {
    const badPuzzle = {
      clues: ["Jabs", "Holes", "Makes yawn", "Exposes", "Is interested"],
      answers: ["POKES", "PORES", "BORES", "BARES", "CARES"],
      topWord: "POKE", // 4 chars
      bottomWord: "CARDS" // 5 chars
    }
    const errors = validateCrossclimbPuzzle("757", badPuzzle)
    expect(errors.some((e) => e.includes("Word size mismatch"))).toBe(true)
  })

  it("should fail if the word ladder has invalid transitions (diff > 1)", () => {
    const badPuzzle = {
      clues: ["Jabs", "Holes", "Makes yawn", "Exposes", "Is interested"],
      answers: ["POKES", "PORES", "BORES", "BARES", "CARES"],
      topWord: "JUMPS", // Diff between JUMPS and POKES is > 1
      bottomWord: "CARDS"
    }
    const errors = validateCrossclimbPuzzle("757", badPuzzle)
    expect(
      errors.some((e) => e.includes("Invalid word ladder transition"))
    ).toBe(true)
  })

  it("should fail if answers contain invalid special characters", () => {
    const badPuzzle = {
      clues: ["Jabs", "Holes", "Makes yawn", "Exposes", "Is interested"],
      answers: ["POK@S", "PORES", "BORES", "BARES", "CARES"],
      topWord: "POKER",
      bottomWord: "CARDS"
    }
    const errors = validateCrossclimbPuzzle("757", badPuzzle)
    expect(
      errors.some((e) => e.includes("uppercase alphanumeric string"))
    ).toBe(true)
  })

  it("should pass validation for a valid crossclimb puzzle entry with numbers (e.g. Orwell 1984 puzzle)", () => {
    const validPuzzle = {
      clues: [
        'Answer that can be formed from homophones of "Won", "Too", "Ate", and "For" in order',
        'George Orwell novel that includes the concepts of Big Brother, Newspeak, and "2 + 2 = 5',
        "Year that Seoul, South Korea hosted the Summer Olympics (officially the Games of the XXIV Olympiad); the Games of the XXXIV Olympiad will be in Los Angeles in 2028.",
        'When England had its "Glorious Revolution" (hint: the first two digits are 2^4, and the remaining two digits are each 2^3)',
        "7 × 800 + 8 × 11"
      ],
      answers: ["1284", "1984", "1988", "1688", "5688"],
      topWord: "1234",
      bottomWord: "5678"
    }
    const errors = validateCrossclimbPuzzle("701", validPuzzle)
    expect(errors).toEqual([])
  })
})

describe("Wend Registry Validation", () => {
  it("should pass validation for a valid wend puzzle entry", () => {
    const validPuzzle = {
      words: ["WIN", "HOLD", "ALIGN", "ENGINE"]
    }
    const errors = validateWendPuzzle("3", validPuzzle)
    expect(errors).toEqual([])
  })

  it("should fail if words array is missing", () => {
    const badPuzzle = {}
    const errors = validateWendPuzzle("3", badPuzzle)
    expect(errors.some((e) => e.includes("words"))).toBe(true)
  })

  it("should fail if words contain non-uppercase characters", () => {
    const badPuzzle = {
      words: ["Win", "HOLD", "ALIGN", "ENGINE"]
    }
    const errors = validateWendPuzzle("3", badPuzzle)
    expect(errors.some((e) => e.includes("uppercase"))).toBe(true)
  })

  it("should fail if key format is invalid", () => {
    const validPuzzle = {
      words: ["WIN", "HOLD", "ALIGN", "ENGINE"]
    }
    const errors = validateWendPuzzle("abc", validPuzzle)
    expect(errors.some((e) => e.includes("Invalid key format"))).toBe(true)
  })

  it("should fail if there are too few words", () => {
    const badPuzzle = {
      words: ["HI"]
    }
    const errors = validateWendPuzzle("3", badPuzzle)
    expect(errors.some((e) => e.includes("between 2 and 10"))).toBe(true)
  })
})
