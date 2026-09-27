import type { Listener, Subscribable, Unsubscribe } from "./Store";

export class Signal<T> implements Subscribable<T> {
  readonly #listeners = new Set<Listener<T>>();

  emit(payload: T): void {
    this.#listeners.forEach((fn) => fn(payload));
  }

  subscribe(fn: Listener<T>): Unsubscribe {
    this.#listeners.add(fn);
    return () => this.#listeners.delete(fn);
  }
}
