import { useEffect, useState } from "react"

type StorageKey = Parameters<typeof storage.getItem>[0]

export class WxtStorageWrapper {
  public prefix: string

  constructor(area: "local" | "sync" | "session") {
    this.prefix = `${area}:`
  }

  async get<T>(key: string): Promise<T | null> {
    const val = await storage.getItem<T>((this.prefix + key) as StorageKey)
    return val ?? null
  }

  async set(key: string, value: unknown): Promise<void> {
    await storage.setItem((this.prefix + key) as StorageKey, value)
  }

  async remove(key: string): Promise<void> {
    await storage.removeItem((this.prefix + key) as StorageKey)
  }
}

class WxtSecureStorageWrapper {
  private prefix: string = "local:secure_"
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
    try {
      const rawEncrypted = await storage.getItem<string>((this.prefix + key) as StorageKey)
      if (!rawEncrypted) return null
      const decrypted = this.xor(atob(rawEncrypted))
      return JSON.parse(decrypted) as T
    } catch {
      return null
    }
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
secureStorage
  .setPassword("linkedin-games-solver-secure-storage-password-v1-key")
  .catch((err) => {
    console.error(
      "[Storage] Failed to initialize secure key storage password:",
      err
    )
  })

export function useStorage<T>(
  keyObj: { key: string; instance: WxtStorageWrapper },
  defaultValue: T
) {
  const fullKey = keyObj.instance.prefix + keyObj.key
  const [value, setValue] = useState<T>(defaultValue)

  useEffect(() => {
    // Load initial value
    storage.getItem<T>(fullKey as StorageKey).then((val) => {
      if (val !== null && val !== undefined) {
        setValue(val)
      }
    })

    // Watch for changes
    const unwatch = storage.watch<T>(fullKey as StorageKey, (newVal) => {
      if (newVal !== undefined && newVal !== null) {
        setValue(newVal)
      }
    })

    return unwatch
  }, [fullKey])

  const setStorageValue = async (newValue: T) => {
    setValue(newValue)
    await storage.setItem(fullKey as StorageKey, newValue)
  }

  return [value, setStorageValue] as const
}
