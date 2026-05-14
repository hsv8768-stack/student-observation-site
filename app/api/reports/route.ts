import { NextResponse } from "next/server";

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
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Notion API 오류");
  }

  return data;
}

async function findReportsDatabase() {
  const search = await notionFetch("/search", {
    query: "월별관찰일지",
    filter: {
      property: "object",
      value: "database",
    },
    page_size: 20,
  });

  const databases = search.results || [];

  for (const db of databases) {
    const props = db.properties || {};

    if (props["이름"] && props["월"] && props["관찰일지"]) {
      return db.id;
    }
  }

  const fallback = await notionFetch("/search", {
    filter: {
      property: "object",
      value: "database",
    },
    page_size: 100,
  });

  for (const db of fallback.results || []) {
    const props = db.properties || {};

    if (props["이름"] && props["월"] && props["관찰일지"]) {
      return db.id;
    }
  }

  throw new Error("이름/월/관찰일지 속성이 있는 월별관찰일지 데이터베이스를 찾지 못했습니다.");
}

function getText(property: any) {
  if (!property) return "";

  if (property.type === "title") {
    return property.title?.[0]?.plain_text || "";
  }

  if (property.type === "rich_text") {
    return property.rich_text?.[0]?.plain_text || "";
  }

  if (property.type === "select") {
    return property.select?.name || "";
  }

  return "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentName, month, content } = body;

    const databaseId = await findReportsDatabase();

    const queried = await notionFetch(`/databases/${databaseId}/query`, {
      page_size: 100,
    });

    const existingPage = queried.results.find((page: any) => {
      const props = page.properties || {};
      const name = getText(props["이름"]);
      const savedMonth = getText(props["월"]);

      return name === studentName && savedMonth === month;
    });

    if (existingPage) {
      await notionFetch(`/pages/${existingPage.id}`, {
        properties: {
          관찰일지: {
            rich_text: [
              {
                text: {
                  content,
                },
              },
            ],
          },
        },
      });

      return NextResponse.json({
        ok: true,
        mode: "updated",
      });
    }

    await notionFetch("/pages", {
      parent: {
        database_id: databaseId,
      },
      properties: {
        이름: {
          title: [
            {
              text: {
                content: studentName,
              },
            },
          ],
        },
        월: {
          select: {
            name: month,
          },
        },
        관찰일지: {
          rich_text: [
            {
              text: {
                content,
              },
            },
          ],
        },
      },
    });

    return NextResponse.json({
      ok: true,
      mode: "created",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "저장 실패",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}
