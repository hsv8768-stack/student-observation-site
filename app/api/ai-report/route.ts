import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentName, level, grade, month, currentContent } = body;

    const isLower =
      level?.includes("GK001") ||
      level?.includes("GK002") ||
      level?.includes("GK003") ||
      level?.includes("GK004") ||
      level?.includes("GK005");

    const format = isLower
      ? `초등부 저학년 형식:
🧭 진도 적응도
🎧 발음 및 읽기 학습
🌱 수업 태도 전반
📌 가정 연계 학습 안내
👩‍👦 마무리 말씀`
      : `초등부 고학년+중등부 형식:
📊 진도 및 학습 흐름
📘 단어 및 과제 학습 현황
✏ 문법 및 독해 이해도
🌿 전반적인 수업 태도 및 보완점
💌 마무리 말씀`;

    const prompt = `
너는 영어학원 학생 관찰일지를 작성하는 교사야.
아래 정보를 바탕으로 학부모에게 전달하기 좋은 자연스럽고 따뜻한 관찰일지를 작성해줘.

학생명: ${studentName}
월: ${month}
학년: ${grade}
레벨: ${level}

반드시 아래 형식을 지켜줘.
${format}

현재 입력된 메모:
${currentContent || "메모 없음"}

조건:
- 너무 과장하지 말 것
- 학부모에게 전달 가능한 부드러운 문장
- 보완점은 긍정적으로 표현
- 각 항목마다 1~3문장
- 한국어로 작성
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "AI 초안 생성 실패",
          detail: data.error?.message || "알 수 없는 오류",
        },
        { status: 500 }
      );
    }

    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return NextResponse.json({
      ok: true,
      draft: text,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "AI 초안 생성 실패",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}
