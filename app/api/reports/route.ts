import { NextResponse } from "next/server";

const NOTION_TOKEN = process.env.NOTION_TOKEN!;

const notionHeaders = {
  Authorization: `Bearer ${NOTION_TOKEN}`,
  "Content-Type": "application/json",
  "Notion-Version": "2022-06-28",
};

function makeRichTextChunks(text: string) {
  const chunks = [];
  const maxLength = 1900;

  for (let i = 0; i < text.length; i += maxLength) {
    chunks.push({
      text: {
        content: text.slice(i, i + maxLength),
      },
    });
  }

  return chunks.length > 0
    ? chunks
    : [
        {
          text: {
            content: "",
          },
        },
      ];
}

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
    filter: {
      property: "object",
      value: "database",
    },
    page_size: 100,
  });

  for (const db of search.results || []) {
    const props = db.properties || {};

    if (props["이름"] && props["월"] && props["관찰일지"]) {
      return db;
    }
  }

  throw new Error("이름/월/관찰일지 속성이 있는 데이터베이스를 찾지 못했습니다.");
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

function makeMonthProperty(db: any, month: string) {
  const monthType = db.properties?.["월"]?.type;

  if (monthType === "select") {
    return {
      select: {
        name: month,
      },
    };
  }

  return {
    rich_text: [
      {
        text: {
          content: month,
        },
      },
    ],
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentName, month, content } = body;

    const db = await findReportsDatabase();
    const databaseId = db.id;

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
            rich_text: makeRichTextChunks(content),
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
        월: makeMonthProperty(db, month),
        관찰일지: {
          rich_text: makeRichTextChunks(content),
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
