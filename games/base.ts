export abstract class BaseSolver {
  abstract readonly name: string;

  /**
   * Detects if the current page contains the active game.
   */
  abstract detect(): boolean;

  /**
   * Solves the active game on the page and fills the UI.
   */
  abstract solve(): Promise<void>;

  /**
   * Helper to query a single element.
   */
  protected $(selector: string, root: ParentNode = document): HTMLElement | null {
    return root.querySelector(selector);
  }

  /**
   * Helper to query an array of elements.
   */
  protected $$(selector: string, root: ParentNode = document): HTMLElement[] {
    return Array.from(root.querySelectorAll(selector));
  }

  /**
   * Timing helper.
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Simulates a click (mouseover, mousedown, mouseup, click) on an element.
   */
  protected click(el: HTMLElement | null): void {
    if (!el) return;
    el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }

  /**
   * Helper to create a MouseEvent.
   */
  protected createMouseEvent(type: string, buttons = 1): MouseEvent {
    return new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      view: window,
      buttons,
    });
  }
}
