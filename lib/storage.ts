import { Storage } from "@plasmohq/storage"
import { SecureStorage } from "@plasmohq/storage/secure"

export const localStorage = new Storage({
  area: "local",
  serde: {
    serializer: (value: unknown): string => {
      return JSON.stringify(value)
    },
    deserializer: <T>(raw: string): T => {
      try {
        return JSON.parse(raw) as T
      } catch {
        return raw as unknown as T
      }
    }
  }
})

export const secureStorage = new SecureStorage({
  area: "local"
})

// Set encryption password for secure storage namespace
secureStorage
  .setPassword("linkedin-games-solver-secure-storage-password-v1-key")
  .catch((err) => {
    console.error(
      "[Storage] Failed to initialize secure key storage password:",
      err
    )
  })

export const syncStorage = new Storage({
  area: "sync",
  serde: {
    serializer: (value: unknown): string => {
      return JSON.stringify(value)
    },
    deserializer: <T>(raw: string): T => {
      try {
        return JSON.parse(raw) as T
      } catch {
        return raw as unknown as T
      }
    }
  }
})
