import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROMPT = `당신은 세계적인 미술 전문가입니다. 이 미술 작품을 깊이 있게 분석해주세요.

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
  "marketNote": "시장 가치나 컬렉터 관점에서의 간단한 설명 (1-2문장, 한국어)",
  "works": [
    { "title": "작품명", "year": "제작연도", "medium": "재료/기법", "location": "소장처" }
  ],
  "auctions": [
    { "date": "YYYY-MM", "work": "작품명", "house": "경매사", "result": "낙찰가", "estimate": "추정가 범위", "note": "특이사항(없으면 빈 문자열)" }
  ],
  "collections": [
    { "inst": "기관명", "city": "도시", "period": "소장 기간", "work": "소장 작품" }
  ],
  "critics": [
    { "critic": "평론가/매체명", "source": "출처", "year": "연도", "quote": "평론 내용 (영어 또는 한국어)" }
  ],
  "exhibitions": [
    { "title": "전시명", "venue": "장소", "city": "도시", "year": "연도", "type": "solo 또는 group 또는 fair" }
  ]
}

작품이 잘 알려진 경우 실제 데이터를 사용하고, 덜 알려진 경우 합리적으로 추정한 데이터를 제공하세요. 각 배열은 최소 3개 항목을 포함하세요.`;

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // 텍스트 검색
    if (contentType.includes("application/json")) {
      const { query } = await req.json();
      if (!query) return NextResponse.json({ success: false, error: "검색어가 없습니다" }, { status: 400 });

      const message = await client.messages.create({
        model: "claude-opus-4-7",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: `다음 작품에 대해 분석해주세요: "${query}"\n\n${PROMPT}`,
        }],
      });

      const text = message.content.find((b) => b.type === "text");
      if (!text || text.type !== "text") throw new Error("응답 없음");
      const match = text.text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("JSON 파싱 실패");
      return NextResponse.json({ success: true, data: JSON.parse(match[0]) });
    }

    // 이미지 업로드 / 카메라
    const formData = await req.formData();
    const file = formData.get("image") as File;
    if (!file) return NextResponse.json({ success: false, error: "이미지가 없습니다" }, { status: 400 });

    const base64Image = Buffer.from(await file.arrayBuffer()).toString("base64");
    const mediaType = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64Image } },
          { type: "text", text: PROMPT },
        ],
      }],
    });

    const text = message.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") throw new Error("응답 없음");
    const match = text.text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("JSON 파싱 실패");
    return NextResponse.json({ success: true, data: JSON.parse(match[0]) });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("분석 오류:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
