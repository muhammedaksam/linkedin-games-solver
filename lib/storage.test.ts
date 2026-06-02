import { beforeEach, describe, expect, it, vi } from "vitest"

// Now import the module
import { localStorage, secureStorage, syncStorage } from "./storage"

// Mock globals before importing the file under test
const mockWxtStorage: Record<string, unknown> = {}
const mockChromeStorageLocal: Record<string, unknown> = {}
const mockChromeStorageSync: Record<string, unknown> = {}

const customGlobal = globalThis as unknown as {
  storage: unknown
  chrome: unknown
}

customGlobal.storage = {
  getItem: vi.fn(async (key: string) => {
    return mockWxtStorage[key] ?? null
  }),
  setItem: vi.fn(async (key: string, val: unknown) => {
    mockWxtStorage[key] = val
  }),
  removeItem: vi.fn(async (key: string) => {
    delete mockWxtStorage[key]
  }),
  watch: vi.fn((_key: string, _cb: unknown) => {
    return () => {}
  })
}

customGlobal.chrome = {
  storage: {
    local: {
      get: vi.fn(async (keys?: unknown) => {
        if (!keys) return mockChromeStorageLocal
        if (typeof keys === "string")
          return { [keys]: mockChromeStorageLocal[keys] }
        if (Array.isArray(keys)) {
          const res: Record<string, unknown> = {}
          for (const k of keys) res[k] = mockChromeStorageLocal[k]
          return res
        }
        return mockChromeStorageLocal
      }),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(mockChromeStorageLocal, items)
      }),
      remove: vi.fn(async (keys: unknown) => {
        if (typeof keys === "string") delete mockChromeStorageLocal[keys]
        if (Array.isArray(keys)) {
          for (const k of keys) delete mockChromeStorageLocal[k]
        }
      })
    },
    sync: {
      get: vi.fn(async (keys?: unknown) => {
        if (!keys) return mockChromeStorageSync
        if (typeof keys === "string")
          return { [keys]: mockChromeStorageSync[keys] }
        if (Array.isArray(keys)) {
          const res: Record<string, unknown> = {}
          for (const k of keys) res[k] = mockChromeStorageSync[k]
          return res
        }
        return mockChromeStorageSync
      }),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(mockChromeStorageSync, items)
      }),
      remove: vi.fn(async (keys: unknown) => {
        if (typeof keys === "string") delete mockChromeStorageSync[keys]
        if (Array.isArray(keys)) {
          for (const k of keys) delete mockChromeStorageSync[k]
        }
      })
    }
  }
}

// We can encrypt legacy Plasmo values using the verified Web Crypto encryption algorithm
async function encryptPlasmoSecure(
  plaintext: string,
  password: string
): Promise<string> {
  const encoder = new TextEncoder()
  const rawBytes = encoder.encode(plaintext)

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(32))

  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  )

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: salt,
      iterations: 147000
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  )

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      derivedKey,
      rawBytes
    )
  )

  const out = new Uint8Array(
    salt.byteLength + iv.byteLength + ciphertext.byteLength
  )
  out.set(salt, 0)
  out.set(iv, salt.byteLength)
  out.set(ciphertext, salt.byteLength + iv.byteLength)

  // Convert binary to base64 safely
  return btoa(String.fromCharCode(...Array.from(out)))
}

describe("WXT Storage Wrapper & Migration Tests", () => {
  beforeEach(() => {
    // Clear mock storages
    for (const key of Object.keys(mockWxtStorage)) delete mockWxtStorage[key]
    for (const key of Object.keys(mockChromeStorageLocal))
      delete mockChromeStorageLocal[key]
    for (const key of Object.keys(mockChromeStorageSync))
      delete mockChromeStorageSync[key]
    vi.clearAllMocks()
  })

  it("should get and set local/sync values normally", async () => {
    await localStorage.set("theme", "dark")
    expect(mockWxtStorage["local:theme"]).toBe("dark")

    const val = await localStorage.get("theme")
    expect(val).toBe("dark")
  })

  it("should migrate unprefixed legacy key from chrome.storage on miss", async () => {
    // Write legacy data directly to mock chrome.storage.sync
    mockChromeStorageSync.theme = "light"

    // Attempting to read "theme" from WxtStorageWrapper
    const val = await syncStorage.get("theme")
    expect(val).toBe("light")

    // It should migrate the data to Wxt storage (prefixed)
    expect(mockWxtStorage["sync:theme"]).toBe("light")

    // And delete the old key in chrome storage
    expect(mockChromeStorageSync.theme).toBeUndefined()
  })

  it("should encrypt and decrypt values using secure storage wrapper", async () => {
    await secureStorage.set("aiApiKey", "testing-secret-xyz")
    expect(mockWxtStorage["local:secure_aiApiKey"]).toBeDefined()
    expect(mockWxtStorage["local:secure_aiApiKey"]).not.toBe(
      "testing-secret-xyz"
    )

    const val = await secureStorage.get("aiApiKey")
    expect(val).toBe("testing-secret-xyz")
  })

  it("should migrate encrypted Plasmo secure storage key to WXT secure storage", async () => {
    const password = "linkedin-games-solver-secure-storage-password-v1-key"
    const legacyEncryptedValue = await encryptPlasmoSecure(
      JSON.stringify("legacy-gemini-key"),
      password
    )

    // Place legacy encrypted key into raw chrome.storage.local
    mockChromeStorageLocal["d76fda97|:|aiApiKey"] = legacyEncryptedValue

    // WXT secureStorage get should intercept, decrypt, store, and remove the legacy key
    const val = await secureStorage.get("aiApiKey")
    expect(val).toBe("legacy-gemini-key")

    // WXT secure storage should now hold the migrated, XOR-encrypted value
    expect(mockWxtStorage["local:secure_aiApiKey"]).toBeDefined()

    // Legacy key in chrome storage should be deleted
    expect(mockChromeStorageLocal["d76fda97|:|aiApiKey"]).toBeUndefined()
  })

  it("should migrate unencrypted legacy key (aiApiKey or geminiApiKey) to WXT secure storage", async () => {
    mockChromeStorageLocal.geminiApiKey = "raw-unencrypted-key"

    const val = await secureStorage.get("aiApiKey")
    expect(val).toBe("raw-unencrypted-key")

    expect(mockWxtStorage["local:secure_aiApiKey"]).toBeDefined()
    expect(mockChromeStorageLocal.geminiApiKey).toBeUndefined()
  })
})
