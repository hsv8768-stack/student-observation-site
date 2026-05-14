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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentName, month, content } = body;

    const dataSourceId = await findReportsDataSourceId();

    const searchResponse = await notion.dataSources.query({
      data_source_id: dataSourceId,
    });

    const existingPage = searchResponse.results.find((page: any) => {
      const props = page.properties;

      const name = props["이름"]?.title?.[0]?.plain_text || "";
      const savedMonth = props["월"]?.select?.name || "";

      return name === studentName && savedMonth === month;
    });

    if (existingPage) {
      await notion.pages.update({
        page_id: existingPage.id,
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

    await notion.pages.create({
      parent: {
        data_source_id: dataSourceId,
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
