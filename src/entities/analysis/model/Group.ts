import { GraphTheme } from "#shared/config";

export class Group {
  constructor(
    readonly id: number,
    readonly members: string[],
    readonly name: string,
    readonly profile: string,
    readonly isolated = false,
  ) {}

  get size(): number {
    return this.members.length;
  }

  get color(): string {
    if (this.isolated) return GraphTheme.isolatedGroup;
    return GraphTheme.groupPalette[this.id] ?? GraphTheme.groupFallback;
  }
}
