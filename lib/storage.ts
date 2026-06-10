import { useEffect, useState } from "react"

type StorageKey = Parameters<typeof storage.getItem>[0]

async function decryptPlasmoSecure(
  encryptedBase64: string,
  password: string
): Promise<string> {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const rawBytes = Uint8Array.from(atob(encryptedBase64), (c) =>
    c.charCodeAt(0)
  )
  const salt = rawBytes.slice(0, 16)
  const iv = rawBytes.slice(16, 48)
  const ciphertext = rawBytes.slice(48)

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
    ["decrypt"]
  )

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    derivedKey,
    ciphertext
  )

  return decoder.decode(decrypted)
}

export class WxtStorageWrapper {
  public prefix: string

  constructor(area: "local" | "sync" | "session") {
    this.prefix = `${area}:`
  }

  async get<T>(key: string): Promise<T | null> {
    const prefixedKey = (this.prefix + key) as StorageKey
    const val = await storage.getItem<T>(prefixedKey)
    if (val !== null && val !== undefined) {
      return val
    }

    // Fallback/Migration check for legacy unprefixed Plasmo key in chrome.storage
    const areaName = this.prefix.slice(0, -1) as "local" | "sync" | "session"
    if (typeof chrome !== "undefined" && chrome.storage) {
      const rawStorage = chrome.storage[areaName]
      if (rawStorage) {
        try {
          const res = await rawStorage.get(key)
          const legacyVal = res ? res[key] : null
          if (legacyVal !== undefined && legacyVal !== null) {
            console.log(
              `[Storage Migration] Migrated key "${key}" from Plasmo to WXT (${this.prefix}${key})`
            )
            await storage.setItem(prefixedKey, legacyVal)
            await rawStorage.remove(key)
            return legacyVal as T
          }
        } catch (err) {
          console.warn(
            `[Storage Migration] Failed to migrate key "${key}":`,
            err
          )
        }
      }
    }
    return null
  }

  async set(key: string, value: unknown): Promise<void> {
    await storage.setItem((this.prefix + key) as StorageKey, value)
  }

  async remove(key: string): Promise<void> {
    await storage.removeItem((this.prefix + key) as StorageKey)
  }
}

export class WxtSecureStorageWrapper {
  public prefix: string = "local:secure_"
  private password?: string

  async setPassword(password: string): Promise<this> {
    this.password = password
    return this
  }

  private xor(txt: string): string {
    const key = this.password || "default-key"
    let res = ""
    for (let i = 0; i < txt.length; i++) {
      res += String.fromCharCode(
        txt.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      )
    }
    return res
  }

  async get<T>(key: string): Promise<T | null> {
    const prefixedKey = (this.prefix + key) as StorageKey
    try {
      const rawEncrypted = await storage.getItem<string>(prefixedKey)
      if (rawEncrypted) {
        const decrypted = this.xor(atob(rawEncrypted))
        return JSON.parse(decrypted) as T
      }
    } catch {
      // Ignore and proceed to fallback/migration
    }

    // Fallback/Migration check for legacy secure Plasmo key
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      // Plasmo SecureStorage key has namespace derived from password: d76fda97|:|aiApiKey
      const legacyKey = `d76fda97|:|${key}`
      try {
        const res = await chrome.storage.local.get(legacyKey)
        const legacyVal = res ? res[legacyKey] : null
        if (legacyVal) {
          console.log(
            `[Storage Migration] Migrating secure key "${key}" from Plasmo to WXT`
          )
          const decryptedRaw = await decryptPlasmoSecure(
            legacyVal,
            this.password ||
              "linkedin-games-solver-secure-storage-password-v1-key"
          )
          const decryptedVal = JSON.parse(decryptedRaw) as T
          // Store decrypted value in WXT secure storage (which will use the new XOR/base64 encryption)
          await this.set(key, decryptedVal)
          // Clean up old key
          await chrome.storage.local.remove(legacyKey)
          return decryptedVal
        }
      } catch (err) {
        console.warn(
          `[Storage Migration] Failed to migrate secure key "${key}":`,
          err
        )
      }

      try {
        const resLocal = await chrome.storage.local.get([key, "geminiApiKey"])
        const unencryptedVal = resLocal
          ? resLocal[key] || resLocal.geminiApiKey
          : null
        if (unencryptedVal) {
          console.log(
            `[Storage Migration] Migrating unencrypted key "${key}" to WXT secure storage`
          )
          await this.set(key, unencryptedVal)
          await chrome.storage.local.remove([key, "geminiApiKey"])
          return unencryptedVal as T
        }
      } catch (err) {
        console.warn(
          `[Storage Migration] Failed to migrate unencrypted key "${key}":`,
          err
        )
      }
    }

    return null
  }

  async set(key: string, value: unknown): Promise<void> {
    const raw = JSON.stringify(value)
    const encrypted = btoa(this.xor(raw))
    await storage.setItem((this.prefix + key) as StorageKey, encrypted)
  }

  async remove(key: string): Promise<void> {
    await storage.removeItem((this.prefix + key) as StorageKey)
  }
}

export const localStorage = new WxtStorageWrapper("local")
export const syncStorage = new WxtStorageWrapper("sync")

export const secureStorage = new WxtSecureStorageWrapper()
;(async () => {
  try {
    await secureStorage.setPassword(
      "linkedin-games-solver-secure-storage-password-v1-key"
    )
  } catch (err) {
    console.error(
      "[Storage] Failed to initialize secure key storage password:",
      err
    )
  }
})()

export function useStorage<T>(
  keyObj: {
    key: string
    instance: WxtStorageWrapper | WxtSecureStorageWrapper
  },
  defaultValue: T
) {
  const [value, setValue] = useState<T>(defaultValue)
  const prefix = keyObj.instance.prefix
  const fullKey = prefix + keyObj.key

  useEffect(() => {
    // Load initial value
    const init = async () => {
      try {
        const val = await keyObj.instance.get<T>(keyObj.key)
        if (val !== null && val !== undefined) {
          setValue(val)
        }
      } catch (err) {
        console.error("Storage fetch error:", err)
      }
    }
    init()

    const unwatch = storage.watch<unknown>(fullKey as StorageKey, async () => {
      const val = await keyObj.instance.get<T>(keyObj.key)
      if (val !== undefined && val !== null) {
        setValue(val)
      }
    })

    return unwatch
  }, [keyObj.key, keyObj.instance, fullKey])

  const setStorageValue = async (newValue: T) => {
    setValue(newValue)
    await keyObj.instance.set(keyObj.key, newValue)
  }

  return [value, setStorageValue] as const
}
