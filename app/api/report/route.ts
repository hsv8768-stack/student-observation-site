import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";

const notion: any = new Client({
  auth: process.env.NOTION_TOKEN,
});

const reportsDbId = process.env.NOTION_REPORTS_DB_ID!;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const studentName = searchParams.get("studentName");
    const month = searchParams.get("month");

    const response = await notion.databases.query({
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

    if (response.results.length === 0) {
      return NextResponse.json({
        exists: false,
      });
    }

    const page: any = response.results[0];

    const content =
      page.properties["진도적응도"]?.rich_text?.[0]?.plain_text || "";

    return NextResponse.json({
      exists: true,
      content,
      pageId: page.id,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 500 }
    );
  }
}
