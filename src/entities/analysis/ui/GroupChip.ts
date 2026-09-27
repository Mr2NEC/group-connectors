import { Text } from "#shared/lib";
import { Chip } from "#shared/ui";
import type { Group } from "../model/Group";

export class GroupChip {
  static dot(group: Group): string {
    return Chip.dot(group.color);
  }

  static render(group: Group, { clickable = true }: { clickable?: boolean } = {}): string {
    return Chip.render(`${GroupChip.dot(group)}${Text.escape(group.name)}`, {
      as: clickable ? "button" : "span",
      attrs: { "data-group": clickable ? group.id : undefined, title: group.profile },
    });
  }
}
