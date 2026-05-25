export const EXPECTED_SCHEMA_VERSION = '1.0';

export interface EtlManifest {
  schema_version: string;
  version: string;
  game_patch: string;
  generated_at: string;
  sources: {
    spt_aki_commit: string;
    tarkov_dev_query_time: string;
    the_hideout_commit: string;
  };
  llm?: {
    model: string;
    stage_5_completed: boolean;
  };
  files: EtlFileEntry[];
}

export interface EtlFileEntry {
  name: string;
  sha256: string;
  size_bytes: number;
}

// ── Spawn Clusters ────────────────────────────────────────────────

export interface SpawnClusterData {
  schema_version: string;
  generated_at: string;
  config: Record<string, unknown>;
  maps: Record<string, SpawnClusterMap>;
}

export interface SpawnClusterMap {
  proximity_threshold_used_m: number;
  clusters: SpawnCluster[];
}

export interface SpawnCluster {
  cluster_id: string;
  centroid: { x: number; y: number; z: number };
  radius_m: number;
  member_count: number;
  zone_names: string[];
  members: Array<{ x: number; y: number; z: number }>;
}

// ── Named POIs ────────────────────────────────────────────────────

export interface NamedPoisData {
  schema_version: string;
  maps: Record<string, NamedPoisMap>;
}

export interface NamedPoisMap {
  iconic_labels: unknown[];
  spawn_cluster_names: Record<string, NamedPoi>;
}

export interface NamedPoi {
  name: string;
  source: 'iconic_match' | 'synthetic' | 'directional';
}

// ── Loot Probabilities ────────────────────────────────────────────

export interface LootProbData {
  schema_version: string;
  maps: Record<string, LootProbMap>;
}

export interface LootProbMap {
  containers: Record<string, LootEntry[]>;
}

export interface LootEntry {
  item_id: string;
  probability: number;
  confidence: 'spt_direct' | 'uniform_prior' | 'id_unmatched' | 'reconciled';
}

// ── Quest Enhancements ────────────────────────────────────────────

export interface QuestEnhData {
  schema_version: string;
  generated_at: string;
  llm_model: string;
  quests: Record<string, QuestEnhancement>;
}

export interface QuestEnhancement {
  enrichment_status: string;
  objectives: QuestObjectiveEnhancement[];
}

export interface QuestObjectiveEnhancement {
  objective_id: string;
  source_text: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  constraints: QuestConstraints;
}

export interface QuestConstraints {
  maps: string[] | null;
  zone: string | null;
  body_parts: string[] | null;
  weapon_specific_item: string | null;
  weapon_class: string | null;
  weapon_mods_required: string[];
  wearing_required: string[];
  not_wearing: string[];
  distance_min_m: number | null;
  distance_max_m: number | null;
  time_of_day: string | null;
  shot_type: string | null;
  health_state: string | null;
  required_keys: string[];
}
