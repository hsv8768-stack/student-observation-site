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
AI 느낌과 딱딱한 느낌 없이 자연스럽고 부드럽게. 친절하지만 객관적으로 써주고 반복되는 거 없이 매달 새로운 느낌으로 전달했으면 좋겠고, 
가독성을 높이기 위해서 중요한 단어에는 중요 이모티콘을 넣어주면 좋겠어.
내가 보낸 거 보다 더 구체적이고 살을 붙여서 적어주고 어머니들이 봤었을 때 "정말 꼼꼼하게 우리 아이를 봐주고 관심을 많이 주고 있구나"라는 느낌이 들게끔 적어줘. 
풍부하고 구체적으로 쓰되, 각 학생들 마다 표현이 달랐으면 좋겠어. 
마지막에 학부모에게 여기 학원은 정말 아이에게 관심이 많고 신경을 많이 쓰고 있다는 정성을 담아서 쓴 것 같은 느낌을 주고 
학부모에게 주는 감동멘트를 써주고 전체적으로 다 정성을 담아서 쓴 느낌을 학생 한 명씩 다 다르게 써줘

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
- 각 항목마다 3-5문장
- 한국어로 작성
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-5.5-mini",
        input: prompt,
      }),
    });

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
      data.output_text ||
      data.output?.[0]?.content?.[0]?.text ||
      "";

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
