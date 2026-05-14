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

  return "";
}

export async function GET() {
  try {
    const response = await notionFetch("/search", {
      filter: {
        property: "object",
        value: "page",
      },
      page_size: 100,
    });

    const students = response.results
      .map((page: any) => {
        const props = page.properties || {};

        return {
          id: page.id,
          name: getText(props["이름"]),
          grade: getText(props["학년"]),
          level: getText(props["레벨"]),
          status: getText(props["상태"]),
        };
      })
      .filter((student: any) => student.name && student.level);

    students.sort((a: any, b: any) => {
      return a.name.localeCompare(b.name, "ko");
    });

    return NextResponse.json({ students });
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
