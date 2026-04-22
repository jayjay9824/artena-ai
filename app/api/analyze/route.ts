import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File;
    if (!file) return NextResponse.json({ success: false, error: "이미지가 없습니다" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");
    const mediaType = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64Image },
            },
            {
              type: "text",
              text: `당신은 세계적인 미술 전문가입니다. 이 미술 작품을 깊이 있게 분석해주세요.

다음 형식의 JSON으로 응답해주세요 (JSON만, 다른 텍스트 없이):
{
  "title": "추정 작품명 또는 '알 수 없음'",
  "artist": "추정 작가명 또는 '미상'",
  "year": "추정 제작 연도 또는 시대",
  "style": "미술 양식/사조",
  "description": "작품에 대한 전문적인 설명 (3-4문장, 한국어)",
  "emotions": {
    "calm": 0에서 100 사이 숫자,
    "heavy": 0에서 100 사이 숫자,
    "warm": 0에서 100 사이 숫자,
    "inward": 0에서 100 사이 숫자,
    "movement": 0에서 100 사이 숫자
  },
  "colorPalette": ["주요 색상1", "주요 색상2", "주요 색상3"],
  "keywords": ["핵심 키워드1", "핵심 키워드2", "핵심 키워드3"],
  "marketNote": "시장 가치나 컬렉터 관점에서의 간단한 설명 (1-2문장, 한국어)"
}`,
            },
          ],
        },
      ],
    });

    const textContent = message.content.find((b) => b.type === "text");
    if (!textContent || textContent.type !== "text") throw new Error("텍스트 응답 없음");

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON 파싱 실패");

    return NextResponse.json({ success: true, data: JSON.parse(jsonMatch[0]) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("분석 오류:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
