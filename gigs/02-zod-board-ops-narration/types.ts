export type AppLanguage = "en" | "ur";

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

/** One teach step: draw op + caption line (≤160 chars plain text). */
export interface NarrationStep {
  order: number;
  operation: BoardOperation;
  spokenLine: string;
  language: AppLanguage;
}
