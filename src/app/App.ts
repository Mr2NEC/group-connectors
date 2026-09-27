import { NetworkLoader } from "#entities/network";
import type { DataSource } from "#shared/api";

export class App {
  constructor(
    private readonly root: HTMLElement,
    private readonly source: DataSource,
  ) {}

  start(): this {
    const network = new NetworkLoader(this.source).load();
    const dropped = [...network.issues].map(([kind, rows]) => `${rows.length} ${kind}`).join(", ");
    this.root.textContent = `${network.organisations.length} ${network.schema.nouns.many}, ${network.relationshipCount} relationships (dropped: ${dropped})`;
    return this;
  }
}
