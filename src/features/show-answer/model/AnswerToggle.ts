import type { ExplorationSession } from "#entities/session";

export class AnswerToggle {
  constructor(private readonly session: ExplorationSession) {}

  get isOn(): boolean {
    return this.session.answerMode.value;
  }

  toggle(): void {
    const s = this.session;
    s.focusedNode.set(null);
    s.selectedGroup.set(null);
    s.answerMode.set(!s.answerMode.value);
    s.requestCamera("reset");
  }
}
