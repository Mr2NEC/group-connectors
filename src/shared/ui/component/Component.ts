import type { Listener, Subscribable, Unsubscribe } from "#shared/lib";

export abstract class Component<E extends HTMLElement = HTMLElement> {
  readonly #cleanups: Unsubscribe[] = [];

  constructor(protected readonly root: E) {}

  mount(): this {
    this.render();
    return this;
  }

  render(): void {}

  protected watch<T>(sources: Subscribable<T>[], fn: Listener<T> = () => this.render()): void {
    for (const source of sources) this.#cleanups.push(source.subscribe(fn));
  }

  protected listen<K extends keyof HTMLElementEventMap>(
    type: K,
    handler: (e: HTMLElementEventMap[K]) => void,
    target: HTMLElement = this.root,
  ): void {
    target.addEventListener(type, handler);
    this.#cleanups.push(() => target.removeEventListener(type, handler));
  }

  protected query<T extends HTMLElement = HTMLElement>(selector: string): T {
    const el = this.root.querySelector<T>(selector);
    if (!el) throw new Error(`${this.constructor.name}: missing ${selector}`);
    return el;
  }

  destroy(): void {
    this.#cleanups.splice(0).forEach((fn) => fn());
  }
}
