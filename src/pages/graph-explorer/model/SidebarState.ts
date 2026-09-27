import { Store } from "#shared/lib";

const STORAGE_KEY = "graph-explorer:sidebar-open";

export class SidebarState {
  readonly open = new Store(SidebarState.#restore());

  constructor() {
    this.open.subscribe((value) => SidebarState.#persist(value));
  }

  toggle(): void {
    this.open.set(!this.open.value);
  }

  show(): void {
    this.open.set(true);
  }

  static #restore(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) !== "false";
    } catch {
      return true;
    }
  }

  static #persist(value: boolean): void {
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      return;
    }
  }
}
