import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";

const notion: any = new Client({
  auth: process.env.NOTION_TOKEN,
});

const studentsDbId = process.env.NOTION_STUDENTS_DB_ID!;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      name,
      grade,
      level,
      status,
    } = body;

    const response = await notion.pages.create({
      parent: {
        database_id: studentsDbId,
      },

      properties: {
        이름: {
          title: [
            {
              text: {
                content: name,
              },
            },
          ],
        },

        학년: {
          rich_text: [
            {
              text: {
                content: grade,
              },
            },
          ],
        },

        레벨: {
          rich_text: [
            {
              text: {
                content: level,
              },
            },
          ],
        },

        상태: {
          rich_text: [
            {
              text: {
                content: status,
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
        error: "학생 추가 실패",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}
