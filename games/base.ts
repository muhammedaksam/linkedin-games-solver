import { Storage } from "@plasmohq/storage"

const baseStorage = new Storage({
  area: "local"
})

export abstract class BaseSolver {
  abstract readonly name: string

  /**
   * Detects if the current page contains the active game.
   */
  abstract detect(): boolean

  /**
   * Solves the active game on the page and fills the UI.
   */
  abstract solve(mode?: "full" | "hint"): Promise<void>

  /**
   * Helper to query a single element.
   */
  protected $(
    selector: string,
    root: ParentNode = document
  ): HTMLElement | null {
    return root.querySelector(selector)
  }

  /**
   * Helper to query an array of elements.
   */
  protected $$(selector: string, root: ParentNode = document): HTMLElement[] {
    return Array.from(root.querySelectorAll(selector))
  }

  /**
   * Timing helper that respects the solve speed settings in storage.
   */
  protected async sleep(ms: number): Promise<void> {
    try {
      const speed = (await baseStorage.get<string>("solveSpeed")) || "normal"
      let actualMs = ms
      if (speed === "instant") {
        actualMs = 2 // Minimal sleep to let the DOM paint/register events
      } else if (speed === "stealth") {
        // Emulate human pacing by magnifying standard delay and adding random offset
        actualMs = ms * 15 + Math.floor(Math.random() * 800) + 400
      }
      return new Promise((resolve) => setTimeout(resolve, actualMs))
    } catch {
      return new Promise((resolve) => setTimeout(resolve, ms))
    }
  }

  /**
   * Simulates a click (mouseover, mousedown, mouseup, click) on an element.
   */
  protected click(el: HTMLElement | null): void {
    if (!el) return
    el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }))
    el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))
    el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }))
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  }

  /**
   * Helper to create a MouseEvent.
   */
  protected createMouseEvent(type: string, buttons = 1): MouseEvent {
    return new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      view: window,
      buttons
    })
  }

  /**
   * Safe and robust way to set the value of a React-controlled input element.
   * By invoking the native HTMLInputElement.value setter directly, we bypass React's
   * internal value tracking and ensure the React state registers the change when
   * we dispatch the "input" and "change" events.
   */
  protected setReactInputValue(input: HTMLInputElement, value: string): void {
    if (!input) return
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )?.set
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(input, value)
    } else {
      input.value = value
    }
    input.dispatchEvent(new Event("input", { bubbles: true }))
    input.dispatchEvent(new Event("change", { bubbles: true }))
  }
}
