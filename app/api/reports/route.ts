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

    // 기존 데이터 찾기
    const existing = await notion.databases.query({
      database_id: reportsDbId,

      filter: {
        and: [
          {
            property: "이름",
            title: {
              equals: studentName,
            },
          },

          {
            property: "월",
            select: {
              equals: month,
            },
          },
        ],
      },
    });

    // 이미 존재하면 수정(update)
    if (existing.results.length > 0) {
      const pageId = existing.results[0].id;

      await notion.pages.update({
        page_id: pageId,

        properties: {
          진도적응도: {
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

    // 없으면 새 생성(create)
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
