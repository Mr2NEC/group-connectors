import { GraphTheme } from "#shared/config";

export class Group {
  constructor(
    readonly id: number,
    readonly members: string[],
    readonly name: string,
    readonly profile: string,
  ) {}

  get size(): number {
    return this.members.length;
  }

  get color(): string {
    return GraphTheme.groupPalette[this.id] ?? GraphTheme.groupFallback;
  }
}
