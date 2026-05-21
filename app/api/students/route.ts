import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const NOTION_TOKEN = process.env.NOTION_TOKEN!;

async function notionFetch(path: string, body?: any) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Notion API 오류");
  }

  return data;
}

async function notionPatch(path: string, body: any) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Notion API 수정 오류");
  }

  return data;
}

function getText(property: any) {
  if (!property) return "";

  if (property.type === "title") {
    return property.title?.map((t: any) => t.plain_text).join("") || "";
  }

  if (property.type === "rich_text") {
    return property.rich_text?.map((t: any) => t.plain_text).join("") || "";
  }

  if (property.type === "select") {
    return property.select?.name || "";
  }

  if (property.type === "multi_select") {
    return property.multi_select?.map((s: any) => s.name).join(", ") || "";
  }

  return "";
}

function normalizeName(name: string) {
  return String(name || "").replace(/\s+/g, "").trim();
}

export async function GET() {
  try {
    let allResults: any[] = [];
    let hasMore = true;
    let startCursor: string | undefined = undefined;

    while (hasMore) {
      const response: any = await notionFetch("/search", {
        filter: {
          property: "object",
          value: "page",
        },
        page_size: 100,
        start_cursor: startCursor,
      });

      allResults = [...allResults, ...(response.results || [])];

      hasMore = response.has_more;
      startCursor = response.next_cursor || undefined;
    }

    const rawStudents = allResults
      .map((page: any) => {
        const props = page.properties || {};

        const name = getText(props["이름"]).trim();
        const grade = getText(props["학년"]).trim();
        const level = getText(props["레벨"]).trim();
        const status = getText(props["상태"]).trim();

        return {
          id: page.id,
          name,
          grade,
          level,
          status,
        };
      })
      .filter((student: any) => {
        return student.name && student.level;
      });

    const uniqueStudents = Array.from(
      new Map(
        rawStudents.map((student: any) => {
          const key = normalizeName(student.name);
          return [key, student];
        })
      ).values()
    );

    uniqueStudents.sort((a: any, b: any) => {
      return a.name.localeCompare(b.name, "ko");
    });

    return NextResponse.json({ students: uniqueStudents });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "학생 목록을 불러오지 못했습니다.",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const id = body?.id;

    if (!id) {
      return NextResponse.json(
        {
          error: "삭제할 학생 ID가 없습니다.",
        },
        { status: 400 }
      );
    }

    await notionPatch(`/pages/${id}`, {
      archived: true,
    });

    return NextResponse.json({
      ok: true,
      message: "학생을 삭제했습니다.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "학생 삭제에 실패했습니다.",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}
