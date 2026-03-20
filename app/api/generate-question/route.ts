import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const { topic, questionType } = await req.json();

  const prompt =
    questionType === "true_false"
      ? `Generate a true/false pub quiz question about: ${topic || "any interesting topic"}.
       Respond with JSON only: { "question": "...", "correctAnswer": "true" | "false", "explanation": "brief explanation" }`
      : `Generate a multiple choice pub quiz question about: ${topic || "any interesting topic"}.
       Make it fun and suitable for a team meeting. Not too easy, not too hard.
       Respond with JSON only: { "question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "brief explanation" }`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const parsed = JSON.parse(text);
  return Response.json(parsed);
}
