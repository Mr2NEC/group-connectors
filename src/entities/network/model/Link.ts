export class Relationship {
  #copies = 1;

  constructor(
    readonly type: string,
    readonly from: string,
    readonly to: string,
    readonly directed: boolean,
    readonly year: number | null,
    readonly weight: number,
  ) {}

  get copies(): number {
    return this.#copies;
  }

  addCopy(): void {
    this.#copies++;
  }
}

export class Link {
  readonly rels: Relationship[] = [];

  constructor(
    readonly s: string,
    readonly t: string,
  ) {}

  add(relationship: Relationship): void {
    this.rels.push(relationship);
  }
}
