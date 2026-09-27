import type { ExplorationSession } from "#entities/session";

export class GroupSelector {
  constructor(private readonly session: ExplorationSession) {}

  select(id: number | null): void {
    const s = this.session;
    s.focusedNode.set(null);
    s.selectedGroup.set(id);
    s.requestCamera("fit");
  }

  toggle(id: number): void {
    this.select(this.session.selectedGroup.value === id ? null : id);
  }

  clear(): void {
    this.session.selectedGroup.set(null);
  }
}
