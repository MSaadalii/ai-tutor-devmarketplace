export type AppLanguage = "en" | "ur";

export type DetectiveOutcome =
  | "misconception_identified"
  | "insufficient_evidence"
  | "correct_answer"
  | "arithmetic_slip"
  | "unrecognized_reasoning";

export type AttemptPhase =
  | "diagnose"
  | "board"
  | "board_task"
  | "question"
  | "quiz"
  | "teach_ai"
  | "viva"
  | "test_prep";

export type BoardOpType =
  | "add_text"
  | "add_shape"
  | "update_label"
  | "highlight"
  | "clear_highlight";

export interface BoardOperation {
  type: BoardOpType;
  payload: Record<string, unknown>;
}

export interface NarrationStep {
  order: number;
  operation: BoardOperation;
  spokenLine: string;
  language: AppLanguage;
}

export interface LessonPackMeta {
  id: string;
  version: string;
  title: string;
}

// ── Database rows (supabase/migrations/0001_core_schema.sql, SPEC §9) ────────

export type SessionStatus = "in_progress" | "completed" | "abandoned";

export interface LearningSessionRow {
  id: string;
  user_id: string;
  pack_id: string | null;
  pack_version: string | null;
  topic_brief: string | null;
  language: AppLanguage;
  status: SessionStatus;
  detective_outcome: DetectiveOutcome | null;
  misconception_id: string | null;
  detective_confidence: number | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface AttemptRow {
  id: string;
  session_id: string;
  user_id: string;
  phase: AttemptPhase;
  prompt: string | null;
  response: string | null;
  correct: boolean | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface BoardStateRow {
  id: string;
  session_id: string;
  user_id: string;
  scene: Record<string, unknown>;
  selected_element_ids: string[];
  revision: number;
  updated_at: string;
}
