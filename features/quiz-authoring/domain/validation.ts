import type { QuestionType } from "@/shared/domain/types";

const OPTION_QUESTION_TYPES: QuestionType[] = [
  "multiple_choice",
  "image_question",
  "video_question",
  "audio_question",
];

/** Whether a question type presents a fixed A/B/C/D answer grid. */
export function questionTypeHasOptions(type: QuestionType): boolean {
  return OPTION_QUESTION_TYPES.includes(type);
}

/**
 * Returns the first answer option that appears more than once — compared
 * trimmed and case-insensitively, ignoring blanks — or null when every
 * filled option is unique.
 *
 * Correctness is tracked by answer *text*, so two identical options are
 * ambiguous (selecting one marks both, and either would score correct at
 * play time). This guard lets callers warn/block on that.
 */
export function findDuplicateOption(options: string[]): string | null {
  const seen = new Set<string>();
  for (const opt of options) {
    const key = opt.trim().toLowerCase();
    if (!key) continue;
    if (seen.has(key)) return opt.trim();
    seen.add(key);
  }
  return null;
}
