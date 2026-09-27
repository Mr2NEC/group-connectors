import type { ExplorationSession } from "#entities/session";

export class NodeFocus {
  constructor(private readonly session: ExplorationSession) {}

  focus(id: string): void {
    const s = this.session;
    if (!s.view.has(id)) return;
    s.selectedGroup.set(null);
    s.focusedNode.set(id);
    s.requestCamera("fit");
  }

  clear(): void {
    this.session.focusedNode.set(null);
  }
}
