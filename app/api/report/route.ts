import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";

const notion: any = new Client({
  auth: process.env.NOTION_TOKEN,
});

async function findReportsDataSourceId() {
  const response = await notion.search({
    query: "월별관찰일지",
    filter: {
      property: "object",
      value: "data_source",
    },
    page_size: 10,
  });

  if (!response.results || response.results.length === 0) {
    throw new Error("월별관찰일지 데이터소스를 찾지 못했습니다.");
  }

  return response.results[0].id;
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const studentName = searchParams.get("studentName") || "";
    const month = searchParams.get("month") || "";

    const dataSourceId = await findReportsDataSourceId();

    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
    });

    const matchedPage = response.results.find((page: any) => {
      const props = page.properties || {};

      const savedName = getText(props["이름"]);
      const savedMonth = getText(props["월"]);

      return savedName === studentName && savedMonth === month;
    });

    if (!matchedPage) {
      return NextResponse.json({
        exists: false,
        content: "",
      });
    }

    const props = matchedPage.properties || {};
    const content = getText(props["관찰일지"]);

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
