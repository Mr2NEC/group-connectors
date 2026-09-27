export interface EntityConfig {
  file: string;
  id: string;
  label: string;
  type: string;
  profile_fields?: string[];
  missing_values?: string[];
}

export interface RelationshipConfig {
  file: string;
  source: string;
  target: string;
  type: string;
  direction?: string;
  year?: string;
  weight?: string;
}

export interface ViewConfig {
  id: string;
  label: string;
  exclude_types: string[];
}

export interface AnalysisConfig {
  community_seed: number;
  community_resolution: number;
  top_connectors: number;
  min_cut_off: number;
}

export interface RawSchema {
  dataset: { title: string; entity_noun: string; entity_noun_plural?: string };
  entities: EntityConfig;
  relationships: RelationshipConfig;
  views?: ViewConfig[];
  analysis?: Partial<AnalysisConfig>;
}

export interface Nouns {
  one: string;
  many: string;
}

export interface DataSource {
  readonly schema: RawSchema;
  read(path: string): string;
}
