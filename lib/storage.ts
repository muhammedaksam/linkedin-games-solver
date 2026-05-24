import { Storage } from "@plasmohq/storage"

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
