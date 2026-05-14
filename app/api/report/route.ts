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

  for (const db of search.results || []) {
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const studentName = searchParams.get("studentName") || "";
    const month = searchParams.get("month") || "";

    const databaseId = await findReportsDatabase();

    const queried = await notionFetch(`/databases/${databaseId}/query`, {
      page_size: 100,
    });

    const matchedPage = queried.results.find((page: any) => {
      const props = page.properties || {};

      const savedName = getText(props["이름"]);
      const savedMonth = getText(props["월"]);

      const nameMatches =
        savedName === studentName ||
        savedName === `${studentName} - ${month}` ||
        savedName.includes(studentName);

      const monthMatches =
        savedMonth === month ||
        savedName.includes(month);

      return nameMatches && monthMatches;
    });

    if (!matchedPage) {
      return NextResponse.json({
        exists: false,
        content: "",
      });
    }

    const props = matchedPage.properties || {};

    const content =
      getText(props["관찰일지"]) ||
      getText(props["진도적응도"]) ||
      "";

    return NextResponse.json({
      exists: true,
      content,
      pageId: matchedPage.id,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "관찰일지를 불러오지 못했습니다.",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}
