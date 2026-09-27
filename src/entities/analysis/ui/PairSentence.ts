import type { Nouns } from "#shared/api";
import { Text } from "#shared/lib";
import type { AnalysisView, GroupPair } from "../model/AnalysisView";

export class PairSentence {
  static render(view: AnalysisView, [a, b, k]: GroupPair, nouns: Nouns): string {
    const pair = `<b>${Text.escape(view.group(a).name)}</b> and <b>${Text.escape(view.group(b).name)}</b>`;
    if (k === 1) return `The <u>only</u> link between ${pair}.`;
    if (k <= 3) return `One of only ${k} ${nouns.many} linking ${pair}.`;
    return `One of ${k} ${nouns.many} linking ${pair}.`;
  }
}
