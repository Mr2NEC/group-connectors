import type { ExplorationSession } from "#entities/session";
import { Component } from "#shared/ui";
import { AnswerToggle } from "../model/AnswerToggle";
import "./answer-button.css";

export class AnswerButton extends Component {
  readonly #session: ExplorationSession;
  readonly #toggle: AnswerToggle;
  #button?: HTMLButtonElement;

  constructor(root: HTMLElement, session: ExplorationSession) {
    super(root);
    this.#session = session;
    this.#toggle = new AnswerToggle(session);
  }

  override mount(): this {
    this.root.innerHTML = `<button class="answer-button" type="button" aria-pressed="false"></button>`;
    this.#button = this.query<HTMLButtonElement>(".answer-button");
    this.listen("click", () => this.#toggle.toggle(), this.#button);
    this.watch([this.#session.answerMode]);
    return super.mount();
  }

  override render(): void {
    if (!this.#button) return;
    const on = this.#toggle.isOn;
    this.#button.setAttribute("aria-pressed", String(on));
    this.#button.textContent = on ? "Hide the answer" : "Show who connects the groups";
  }
}
