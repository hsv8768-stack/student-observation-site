import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";

const notion: any = new Client({
  auth: process.env.NOTION_TOKEN,
});

const reportsDbId = process.env.NOTION_REPORTS_DB_ID!;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { studentName, month, content } = body;

    const response = await notion.pages.create({
      parent: {
        database_id: reportsDbId,
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

        연도: {
          select: {
            name: "2026년",
          },
        },

        월: {
          select: {
            name: month,
          },
        },

        진도적응도: {
          rich_text: [
            {
              text: {
                content: content,
              },
            },
          ],
        },
      },
    });

    return NextResponse.json({
      ok: true,
      id: response.id,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "관찰일지를 저장하지 못했습니다.",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}
