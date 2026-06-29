import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const VALID_TYPES = [
  "broken_elevator",
  "blocked_sidewalk",
  "missing_ramp",
  "steep_incline",
  "stairs_only",
  "no_accessible_restroom",
  "other",
] as const;
const VALID_SEVERITY = ["low", "medium", "high"] as const;

type Analysis = {
  type: (typeof VALID_TYPES)[number];
  severity: (typeof VALID_SEVERITY)[number];
  description: string;
  confidence: number;
  simulated: boolean;
};

const SYSTEM_PROMPT = `You are an accessibility expert analyzing a photo for mobility barriers that affect wheelchair users, people with strollers, and people with limited mobility.
Classify the most significant barrier visible. Respond ONLY with strict JSON matching:
{"type": one of ["broken_elevator","blocked_sidewalk","missing_ramp","steep_incline","stairs_only","no_accessible_restroom","other"],
 "severity": one of ["low","medium","high"],
 "description": a concise one-sentence description of the barrier and its impact,
 "confidence": a number from 0 to 1}
If no clear barrier is visible, use type "other" with low severity.`;

export async function POST(req: NextRequest) {
  let body: { image?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const image = body.image;
  if (!image || !image.startsWith("data:image")) {
    return NextResponse.json(
      { error: "A base64 image data URL is required" },
      { status: 400 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();

  // Demo fallback: no key configured.
  if (!apiKey) {
    const simulated: Analysis = {
      type: "other",
      severity: "medium",
      description:
        "Demo mode: add an OPENAI_API_KEY to enable real GPT-4o accessibility analysis of this photo.",
      confidence: 0,
      simulated: true,
    };
    return NextResponse.json(simulated);
  }

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this photo for accessibility barriers.",
            },
            { type: "image_url", image_url: { url: image, detail: "low" } },
          ],
        },
      ],
      max_tokens: 300,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as Partial<Analysis>;

    const type = VALID_TYPES.includes(parsed.type as never)
      ? (parsed.type as Analysis["type"])
      : "other";
    const severity = VALID_SEVERITY.includes(parsed.severity as never)
      ? (parsed.severity as Analysis["severity"])
      : "medium";
    const result: Analysis = {
      type,
      severity,
      description:
        typeof parsed.description === "string" && parsed.description.length > 0
          ? parsed.description
          : "Potential accessibility barrier detected.",
      confidence:
        typeof parsed.confidence === "number"
          ? Math.max(0, Math.min(1, parsed.confidence))
          : 0.5,
      simulated: false,
    };
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "AI analysis failed. Please try again.",
      },
      { status: 502 },
    );
  }
}
