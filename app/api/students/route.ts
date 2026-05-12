import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const studentsDbId = process.env.NOTION_STUDENTS_DB_ID!;

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

export async function GET() {
  try {
    const response = await notion.dataSources.query({
      data_source_id: studentsDbId,
    });

    const students = response.results.map((page: any) => {
      const props = page.properties;

      return {
        id: page.id,
        name: getText(props["이름"]),
        className: getText(props["반"]),
        grade: getText(props["학년"]),
        level: getText(props["레벨"]),
        status: getText(props["상태"]),
      };
    });

    return NextResponse.json({ students });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "학생 목록을 불러오지 못했습니다.",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}
