export type Listener<T> = (value: T) => void;
export type Unsubscribe = () => void;

export interface Subscribable<T> {
  subscribe(fn: Listener<T>): Unsubscribe;
}

export class Store<T> implements Subscribable<T> {
  #value: T;
  readonly #listeners = new Set<Listener<T>>();

  constructor(initial: T) {
    this.#value = initial;
  }

  get value(): T {
    return this.#value;
  }

  set(next: T): void {
    if (Object.is(next, this.#value)) return;
    this.#value = next;
    this.#listeners.forEach((fn) => fn(next));
  }

  subscribe(fn: Listener<T>): Unsubscribe {
    this.#listeners.add(fn);
    return () => this.#listeners.delete(fn);
  }
}
