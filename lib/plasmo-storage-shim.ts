import { useEffect, useMemo, useState } from "react"

export interface StorageSerde {
  serializer?: (value: unknown) => unknown
  deserializer?: (value: unknown) => unknown
}

export class Storage {
  area: "local" | "sync" | "session"
  serde?: StorageSerde

  constructor(
    options: { area?: "local" | "sync" | "session"; serde?: StorageSerde } = {}
  ) {
    this.area = options.area || "local"
    this.serde = options.serde
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const storageArea =
      this.area === "sync"
        ? chrome.storage.sync
        : this.area === "session"
          ? chrome.storage.session
          : chrome.storage.local
    if (!storageArea) return null
    return new Promise((resolve) => {
      storageArea.get(key, (res) => {
        const val = res ? res[key] : null
        if (val === undefined || val === null) {
          resolve(null)
        } else {
          resolve(
            (this.serde?.deserializer ? this.serde.deserializer(val) : val) as T
          )
        }
      })
    })
  }

  async set(key: string, value: unknown): Promise<void> {
    const storageArea =
      this.area === "sync"
        ? chrome.storage.sync
        : this.area === "session"
          ? chrome.storage.session
          : chrome.storage.local
    if (!storageArea) return
    const serialized = this.serde?.serializer
      ? this.serde.serializer(value)
      : value
    return new Promise((resolve) => {
      storageArea.set({ [key]: serialized }, () => {
        resolve()
      })
    })
  }

  async remove(key: string): Promise<void> {
    const storageArea =
      this.area === "sync"
        ? chrome.storage.sync
        : this.area === "session"
          ? chrome.storage.session
          : chrome.storage.local
    if (!storageArea) return
    return new Promise((resolve) => {
      storageArea.remove(key, () => {
        resolve()
      })
    })
  }
}

export class SecureStorage extends Storage {
  async setPassword(_password: string): Promise<void> {
    // secure storage shim: treat it as standard local storage
  }
}

export function useStorage<T = unknown>(
  options: string | { key: string; instance?: Storage },
  defaultValue?: T
): [T, (val: T | ((prev: T) => T)) => Promise<void>] {
  const key = typeof options === "string" ? options : options.key
  const instance = useMemo(() => {
    return typeof options === "string"
      ? new Storage()
      : options.instance || new Storage()
  }, [options])

  const [state, setState] = useState<T>(() => {
    return defaultValue as T
  })

  useEffect(() => {
    // Initial fetch
    let active = true
    instance.get<T>(key).then((val) => {
      if (!active) return
      if (val !== null) {
        setState(val)
      } else if (defaultValue !== undefined) {
        setState(defaultValue)
      }
    })

    // Listen to changes in chrome.storage
    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName === instance.area && changes[key]) {
        const newVal = changes[key].newValue
        const deserialized = instance.serde?.deserializer
          ? instance.serde.deserializer(newVal)
          : newVal
        setState(
          deserialized !== undefined && deserialized !== null
            ? (deserialized as T)
            : (defaultValue as T)
        )
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => {
      active = false
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [key, instance, defaultValue])

  const setStorageValue = async (val: T | ((prev: T) => T)) => {
    let nextValue: T
    if (typeof val === "function") {
      const current = await instance.get<T>(key)
      nextValue = (val as (prev: T) => T)(
        current !== null ? current : (defaultValue as T)
      )
    } else {
      nextValue = val
    }
    await instance.set(key, nextValue)
    setState(nextValue)
  }

  return [state, setStorageValue]
}
