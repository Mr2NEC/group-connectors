import type { AnalysisConfig, EntityConfig, Nouns, RawSchema, RelationshipConfig, ViewConfig } from "#shared/api";
import { ALL_RELATIONSHIPS_VIEW, ANALYSIS_DEFAULTS } from "#shared/config";
import { Text } from "#shared/lib";

export class NetworkSchema {
  readonly #raw: RawSchema;

  constructor(raw: RawSchema) {
    this.#raw = raw;
  }

  get title(): string {
    return this.#raw.dataset.title;
  }

  get nouns(): Nouns {
    const { entity_noun: one, entity_noun_plural: many } = this.#raw.dataset;
    return { one, many: many ?? `${one}s` };
  }

  get entities(): EntityConfig {
    return this.#raw.entities;
  }

  get relationships(): RelationshipConfig {
    return this.#raw.relationships;
  }

  get views(): ViewConfig[] {
    return [ALL_RELATIONSHIPS_VIEW, ...(this.#raw.views ?? [])];
  }

  get analysis(): AnalysisConfig {
    return { ...ANALYSIS_DEFAULTS, ...this.#raw.analysis };
  }

  entityTypeLabel(type: string): string {
    return Text.capitalize(Text.humanize(type));
  }

  relationshipLabel(type: string): string {
    return Text.humanize(type);
  }

  columnLabel(column: string): string {
    return Text.capitalize(Text.humanize(column));
  }
}
