import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";

const notion: any = new Client({
  auth: process.env.NOTION_TOKEN,
});

const databaseId = process.env.NOTION_REPORTS_DB_ID!;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { studentName, month, content } = body;

    const searchResponse = await notion.dataSources.query({
      data_source_id: databaseId,
    });

    const existingPage = searchResponse.results.find((page: any) => {
      const props = page.properties;

      const name =
        props["이름"]?.title?.[0]?.plain_text || "";

      const savedMonth =
        props["월"]?.select?.name || "";

      return name === studentName && savedMonth === month;
    });

    if (existingPage) {
      await notion.pages.update({
        page_id: existingPage.id,
        properties: {
          "관찰일지": {
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
        data_source_id: databaseId,
      },
      properties: {
        "이름": {
          title: [
            {
              text: {
                content: studentName,
              },
            },
          ],
        },

        "월": {
          select: {
            name: month,
          },
        },

        "관찰일지": {
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
