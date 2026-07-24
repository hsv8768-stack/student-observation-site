import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const NOTION_VERSION = "2022-06-28";

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

function getEnv() {
  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_STUDENTS_DB_ID;

  if (!token) {
    throw new Error("NOTION_TOKEN 환경변수가 설정되어 있지 않습니다.");
  }

  if (!databaseId) {
    throw new Error("NOTION_STUDENTS_DB_ID 환경변수가 설정되어 있지 않습니다.");
  }

  return { token, databaseId };
}

async function notionRequest(path: string, options: RequestInit = {}) {
  const { token } = getEnv();

  const res = await fetch(`https://api.notion.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  const text = await res.text();

  let data: any = null;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Notion 응답을 JSON으로 읽지 못했습니다: ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    throw new Error(data.message || data.error || `Notion API 오류: ${res.status}`);
  }

  return data;
}

function propToText(prop: any) {
  if (!prop) return "";

  if (prop.type === "title") {
    return (prop.title || []).map((t: any) => t.plain_text || "").join("");
  }

  if (prop.type === "rich_text") {
    return (prop.rich_text || []).map((t: any) => t.plain_text || "").join("");
  }

  if (prop.type === "select") {
    return prop.select?.name || "";
  }

  if (prop.type === "status") {
    return prop.status?.name || "";
  }

  if (prop.type === "multi_select") {
    return (prop.multi_select || []).map((x: any) => x.name).join(", ");
  }

  if (prop.type === "number") {
    return prop.number == null ? "" : String(prop.number);
  }

  if (prop.type === "phone_number") {
    return prop.phone_number || "";
  }

  if (prop.type === "email") {
    return prop.email || "";
  }

  if (prop.type === "url") {
    return prop.url || "";
  }

  if (prop.type === "formula") {
    const formula = prop.formula;
    if (!formula) return "";
    if (formula.type === "string") return formula.string || "";
    if (formula.type === "number") return formula.number == null ? "" : String(formula.number);
    if (formula.type === "boolean") return formula.boolean ? "true" : "false";
    if (formula.type === "date") return formula.date?.start || "";
  }

  return "";
}

function findProperty(properties: any, names: string[]) {
  for (const name of names) {
    if (properties[name]) return properties[name];
  }

  return null;
}

function findTitleProperty(properties: any) {
  const direct = findProperty(properties, ["이름", "학생명", "Name", "name"]);
  if (direct) return direct;

  const entry = Object.entries(properties).find(
    ([, value]: any) => value?.type === "title"
  );

  return entry ? entry[1] : null;
}

function parseStudent(page: any) {
  const properties = page.properties || {};

  const name = propToText(findTitleProperty(properties));
  const grade = propToText(
    findProperty(properties, ["학년", "학년구분", "Grade", "grade"])
  );
  const level = propToText(
    findProperty(properties, ["레벨", "반", "레벨/반", "Level", "level"])
  );
  const status = propToText(
    findProperty(properties, ["상태", "Status", "status"])
  );

  return {
    id: page.id,
    name,
    grade,
    level,
    status,
  };
}

export async function GET() {
  try {
    const { databaseId } = getEnv();

    const students: any[] = [];
    let hasMore = true;
    let startCursor: string | null = null;

    while (hasMore) {
      const body: any = {
        page_size: 100,
      };

      if (startCursor) {
        body.start_cursor = startCursor;
      }

      const data = await notionRequest(`/databases/${databaseId}/query`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      const results = data.results || [];

      results.forEach((page: any) => {
        const student = parseStudent(page);

        if (student.name) {
          students.push(student);
        }
      });

      hasMore = !!data.has_more;
      startCursor = data.next_cursor || null;
    }

    students.sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""), "ko")
    );

    return json({
      ok: true,
      students,
    });
  } catch (error: any) {
    return json(
      {
        ok: false,
        error: "학생 목록 불러오기 실패",
        detail: error?.message || String(error),
      },
      500
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, level, grade, status } = body;

    if (!id) {
      return json(
        {
          ok: false,
          error: "수정할 학생 id가 없습니다.",
        },
        400
      );
    }

    const properties: any = {};

    if (level !== undefined) {
      properties["레벨"] = {
        select: {
          name: String(level),
        },
      };
    }

    if (grade !== undefined) {
      properties["학년"] = {
        select: {
          name: String(grade),
        },
      };
    }

    if (status !== undefined) {
      properties["상태"] = {
        select: {
          name: String(status),
        },
      };
    }

    await notionRequest(`/pages/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        properties,
      }),
    });

    return json({
      ok: true,
      message: "학생 정보 수정 완료",
    });
  } catch (error: any) {
    return json(
      {
        ok: false,
        error: "학생 정보 수정 실패",
        detail: error?.message || String(error),
      },
      500
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return json(
        {
          ok: false,
          error: "삭제할 학생 id가 없습니다.",
        },
        400
      );
    }

    await notionRequest(`/pages/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        archived: true,
      }),
    });

    return json({
      ok: true,
      message: "학생 삭제 완료",
    });
  } catch (error: any) {
    return json(
      {
        ok: false,
        error: "학생 삭제 실패",
        detail: error?.message || String(error),
      },
      500
    );
  }
}
