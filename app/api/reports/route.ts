import { NextResponse } from "next/server";

const NOTION_TOKEN = process.env.NOTION_TOKEN!;

const notionHeaders = {
  Authorization: `Bearer ${NOTION_TOKEN}`,
  "Content-Type": "application/json",
  "Notion-Version": "2022-06-28",
};

async function notionPost(path: string, body: any) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method: "POST",
    headers: notionHeaders,
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Notion POST 오류");
  }

  return data;
}

async function notionPatch(path: string, body: any) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method: "PATCH",
    headers: notionHeaders,
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Notion PATCH 오류");
  }

  return data;
}

async function findReportsDatabase() {
  const search = await notionPost("/search", {
    query: "월별관찰일지",
    filter: {
      property: "object",
      value: "database",
    },
    page_size: 20,
  });

  for (const db of search.results || []) {
    const props = db.properties || {};

    if (props["이름"] && props["월"] && props["관찰일지"]) {
      return db.id;
    }
  }

  throw new Error("월별관찰일지 데이터베이스를 찾지 못했습니다.");
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentName, month, content } = body;

    const databaseId = await findReportsDatabase();

    const queried = await notionPost(`/databases/${databaseId}/query`, {
      page_size: 100,
    });

    const existingPage = queried.results.find((page: any) => {
      const props = page.properties || {};

      const name = getText(props["이름"]);
      const savedMonth = getText(props["월"]);

      return name === studentName && savedMonth === month;
    });

    if (existingPage) {
      await notionPatch(`/pages/${existingPage.id}`, {
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

    await notionPost("/pages", {
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
          rich_text: [
            {
              text: {
                content: month,
              },
            },
          ],
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
