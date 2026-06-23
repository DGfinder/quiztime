import { describe, it, expect } from "vitest";
import {
  findDuplicateOption,
  questionTypeHasOptions,
} from "../domain/validation";

describe("findDuplicateOption", () => {
  it("returns null when all filled options are unique", () => {
    expect(
      findDuplicateOption(["Drop Dead", "Choosin' Texas", "The Fate of Ophelia"])
    ).toBeNull();
  });

  it("detects an exact duplicate and returns the repeated value", () => {
    expect(
      findDuplicateOption(["Drop Dead", "Choosin' Texas", "Choosin' Texas", ""])
    ).toBe("Choosin' Texas");
  });

  it("ignores blank/whitespace-only options", () => {
    expect(findDuplicateOption(["A", "", "  ", ""])).toBeNull();
  });

  it("compares case-insensitively and trims surrounding space", () => {
    expect(findDuplicateOption(["Paris", " paris "])).toBe("paris");
  });

  it("returns the first duplicate when several repeat", () => {
    expect(findDuplicateOption(["a", "b", "a", "b"])).toBe("a");
  });
});

describe("questionTypeHasOptions", () => {
  it("is true for the A/B/C/D answer-grid types", () => {
    expect(questionTypeHasOptions("multiple_choice")).toBe(true);
    expect(questionTypeHasOptions("image_question")).toBe(true);
    expect(questionTypeHasOptions("video_question")).toBe(true);
    expect(questionTypeHasOptions("audio_question")).toBe(true);
  });

  it("is false for non-grid types", () => {
    expect(questionTypeHasOptions("true_false")).toBe(false);
    expect(questionTypeHasOptions("slider")).toBe(false);
    expect(questionTypeHasOptions("type_in")).toBe(false);
  });
});
