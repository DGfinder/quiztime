import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

// Input validation
const VALID_QUESTION_TYPES = ["multiple_choice", "true_false"] as const;
type QuestionType = (typeof VALID_QUESTION_TYPES)[number];

function validateInput(topic: unknown, questionType: unknown): {
  valid: boolean;
  error?: string;
  sanitizedTopic: string;
  sanitizedType: QuestionType;
} {
  const sanitizedType: QuestionType =
    VALID_QUESTION_TYPES.includes(questionType as QuestionType)
      ? (questionType as QuestionType)
      : "multiple_choice";

  if (topic !== undefined && typeof topic !== "string") {
    return { valid: false, error: "topic must be a string", sanitizedTopic: "", sanitizedType };
  }

  const sanitizedTopic = typeof topic === "string"
    ? topic.trim().slice(0, 200) // limit length
    : "";

  return { valid: true, sanitizedTopic, sanitizedType };
}

export async function POST(req: NextRequest) {
  try {
    let body: { topic?: unknown; questionType?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { topic, questionType } = body;
    const validation = validateInput(topic, questionType);

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { sanitizedTopic, sanitizedType } = validation;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "AI question generation is not configured" },
        { status: 503 }
      );
    }

    const prompt =
      sanitizedType === "true_false"
        ? `Generate a true/false pub quiz question about: ${sanitizedTopic || "any interesting topic"}.
       Respond with JSON only: { "question": "...", "correctAnswer": "true" | "false", "explanation": "brief explanation" }`
        : `Generate a multiple choice pub quiz question about: ${sanitizedTopic || "any interesting topic"}.
       Make it fun and suitable for a team meeting. Not too easy, not too hard.
       Respond with JSON only: { "question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "brief explanation" }`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[generate-question] Unexpected error:", err);
    return NextResponse.json(
      { error: "Failed to generate question. Please try again." },
      { status: 500 }
    );
  }
}
