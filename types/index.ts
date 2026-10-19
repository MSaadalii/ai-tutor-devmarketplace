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
