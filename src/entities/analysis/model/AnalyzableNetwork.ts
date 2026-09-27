import type { AnalysisConfig, EntityConfig, ViewConfig } from "#shared/api";

export interface AnalyzableNetwork {
  readonly schema: {
    readonly views: ViewConfig[];
    readonly analysis: AnalysisConfig;
    readonly entities: EntityConfig;
  };
  readonly links: readonly {
    readonly s: string;
    readonly t: string;
    readonly rels: readonly { readonly type: string; readonly weight: number }[];
  }[];
  readonly organisations: readonly { readonly id: string }[];
  get(id: string): { readonly attrs: Readonly<Record<string, string | null>> };
  labelOf(id: string): string;
}
