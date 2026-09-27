import type { ExplorationSession } from "#entities/session";

export class ViewSwitcher {
  constructor(private readonly session: ExplorationSession) {}

  switchTo(index: number): void {
    const s = this.session;
    const next = s.viewAt(index);
    s.selectedGroup.set(null);
    const focus = s.focusedNode.value;
    if (focus && !next.has(focus)) s.focusedNode.set(null);
    s.viewIndex.set(index);
  }
}
