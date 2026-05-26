"use client";

import { useEffect, useState } from "react";

const months = [
  "1월",
  "2월",
  "3월",
  "4월",
  "5월",
  "6월",
  "7월",
  "8월",
  "9월",
  "10월",
  "11월",
  "12월",
];

const levelOptions = [
  "중3",
  "중2",
  "중1",
  "초6",
  "GR105",
  "GR104",
  "GR103",
  "GR102",
  "GR101",
  "GK005",
  "GK004",
  "GK003",
  "GK002",
  "GK001",
  "GK001(A)",
];

const gradeOptions = ["초등저학년", "초등고학년", "중등부"];
const statusOptions = ["재원중", "휴원", "퇴원"];

type Student = {
  id: string;
  name: string;
  grade?: string;
  level?: string;
  status?: string;
};

export default function Home() {
  const SITE_PASSWORD = "1234";

  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState("");

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedLevel, setSelectedLevel] = useState("전체");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const [deleteMode, setDeleteMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingLevels, setEditingLevels] = useState<Record<string, string>>(
    {}
  );

  const [selectedMonth, setSelectedMonth] = useState("1월");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [studentAddMessage, setStudentAddMessage] = useState("");

  const [newName, setNewName] = useState("");
  const [newGrade, setNewGrade] = useState("초등저학년");
  const [newLevel, setNewLevel] = useState("");
  const [newStatus, setNewStatus] = useState("재원중");

  function normalizeName(name: string) {
    return String(name || "").replace(/\s+/g, "").trim();
  }

  function getStudentKey(student: Student) {
    return normalizeName(student?.name || "");
  }

  function uniqueStudentList(list: Student[]) {
    const map = new Map<string, Student>();

    (list || []).forEach((student) => {
      if (!student?.name || !student?.level) return;

      const key = getStudentKey(student);

      if (!key) return;

      if (!map.has(key)) {
        map.set(key, student);
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""), "ko")
    );
  }

  async function refreshStudents() {
    try {
      const res = await fetch(`/api/students?ts=${Date.now()}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        setStudentAddMessage(
          "학생 목록 불러오기 실패: " +
            (data.detail || data.error || "알 수 없는 오류")
        );
        return;
      }

      setStudents(uniqueStudentList(data.students || []));
    } catch (error: any) {
      setStudentAddMessage("학생 목록 불러오기 실패: " + error.message);
    }
  }

  useEffect(() => {
    if (authorized) {
      refreshStudents();
    }
  }, [authorized]);

  const levels = ["전체", ...levelOptions];

  const uniqueStudents = uniqueStudentList(students);

  const filteredStudents =
    selectedLevel === "전체"
      ? uniqueStudents
      : uniqueStudents.filter((student) => student.level === selectedLevel);

  async function addStudent() {
    setStudentAddMessage("학생 추가 중...");

    const cleanName = newName.trim();

    if (!cleanName) {
      setStudentAddMessage("학생 이름을 입력해주세요.");
      return;
    }

    if (!newLevel.trim()) {
      setStudentAddMessage("레벨을 선택해주세요.");
      return;
    }

    const alreadyExists = uniqueStudents.some(
      (student) => normalizeName(student.name) === normalizeName(cleanName)
    );

    if (alreadyExists) {
      setStudentAddMessage("이미 같은 이름의 학생이 목록에 있습니다.");
      return;
    }

    try {
      const addedLevel = newLevel;

      const res = await fetch("/api/students/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: cleanName,
          grade: newGrade,
          level: newLevel,
          status: newStatus,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStudentAddMessage(
          "학생 추가 실패: " + (data.detail || data.error || "알 수 없는 오류")
        );
        return;
      }

      const addedStudent: Student = {
        id: data.id || `temp-${Date.now()}`,
        name: cleanName,
        grade: newGrade,
        level: newLevel,
        status: newStatus,
      };

      setStudents((prev) => uniqueStudentList([...prev, addedStudent]));
      setSelectedLevel(addedLevel);

      setNewName("");
      setNewLevel("");
      setNewGrade("초등저학년");
      setNewStatus("재원중");

      setStudentAddMessage("학생 추가 완료! 목록에 바로 반영했습니다.");
    } catch (error: any) {
      setStudentAddMessage("학생 추가 실패: " + error.message);
    }
  }

  async function deleteStudent(student: Student) {
    const ok = window.confirm(
      `${student.name} 학생을 삭제할까요?\n\n노션에서는 휴지통으로 이동됩니다.`
    );

    if (!ok) return;

    try {
      const res = await fetch("/api/students", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: student.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStudentAddMessage(
          "학생 삭제 실패: " + (data.detail || data.error || "알 수 없는 오류")
        );
        return;
      }

      if (selectedStudent?.id === student.id) {
        setSelectedStudent(null);
        setContent("");
        setMessage("");
      }

      await refreshStudents();

      setStudentAddMessage(`${student.name} 학생을 삭제했습니다.`);
    } catch (error: any) {
      setStudentAddMessage("학생 삭제 실패: " + error.message);
    }
  }

  async function updateStudentLevel(student: Student) {
    const newStudentLevel = editingLevels[student.id] || student.level || "";

    if (!newStudentLevel) {
      setStudentAddMessage("변경할 반을 선택해주세요.");
      return;
    }

    if (newStudentLevel === student.level) {
      setStudentAddMessage(
        `${student.name} 학생은 이미 ${newStudentLevel} 반입니다.`
      );
      return;
    }

    const ok = window.confirm(
      `${student.name} 학생의 반을 변경할까요?\n\n현재: ${
        student.level || "미지정"
      }\n변경: ${newStudentLevel}\n\n저장하면 노션 학생목록 DB에도 반영됩니다.`
    );

    if (!ok) return;

    try {
      setStudentAddMessage(`${student.name} 학생 반 수정 중...`);

      const res = await fetch("/api/students", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: student.id,
          level: newStudentLevel,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStudentAddMessage(
          "반 수정 실패: " + (data.detail || data.error || "알 수 없는 오류")
        );
        return;
      }

      setStudents((prev) =>
        uniqueStudentList(
          prev.map((item) =>
            item.id === student.id ? { ...item, level: newStudentLevel } : item
          )
        )
      );

      if (selectedStudent?.id === student.id) {
        setSelectedStudent({
          ...selectedStudent,
          level: newStudentLevel,
        });
      }

      setSelectedLevel(newStudentLevel);

      await refreshStudents();

      setStudentAddMessage(
        `${student.name} 학생의 반을 ${newStudentLevel}로 수정했습니다.`
      );
    } catch (error: any) {
      setStudentAddMessage("반 수정 실패: " + error.message);
    }
  }

  async function loadReport(studentName: string, month: string) {
    setMessage("불러오는 중...");

    const res = await fetch(
      `/api/report?studentName=${encodeURIComponent(
        studentName
      )}&month=${encodeURIComponent(month)}&ts=${Date.now()}`,
      { cache: "no-store" }
    );

    const data = await res.json();

    if (data.exists) {
      setContent(data.content || "");
      setMessage("기존 관찰일지를 불러왔습니다.");
    } else {
      setContent("");
      setMessage("새 관찰일지를 작성해주세요.");
    }
  }

  async function copyPreviousMonth() {
    if (!selectedStudent) {
      setMessage("학생을 먼저 선택해주세요.");
      return;
    }

    const currentIndex = months.indexOf(selectedMonth);

    if (currentIndex <= 0) {
      setMessage("1월은 이전 달이 없습니다.");
      return;
    }

    const previousMonth = months[currentIndex - 1];

    const res = await fetch(
      `/api/report?studentName=${encodeURIComponent(
        selectedStudent.name
      )}&month=${encodeURIComponent(previousMonth)}&ts=${Date.now()}`,
      { cache: "no-store" }
    );

    const data = await res.json();

    if (data.exists) {
      setContent(data.content || "");
      setMessage(
        `${previousMonth} 내용을 ${selectedMonth}에 복사했습니다. 저장하기를 누르면 반영됩니다.`
      );
    } else {
      setMessage(`${previousMonth}에 저장된 관찰일지가 없습니다.`);
    }
  }

  function generateTemplate() {
    if (!selectedStudent) {
      setMessage("학생을 먼저 선택해주세요.");
      return;
    }

    const level = selectedStudent.level || "";

    const isLower =
      level.includes("GK001") ||
      level.includes("GK002") ||
      level.includes("GK003") ||
      level.includes("GK004") ||
      level.includes("GK005");

    if (isLower) {
      setContent(`🧭 진도 적응도

- 

🎧 발음 및 읽기 학습

- 

🌱 수업 태도 전반

- 

📌 가정 연계 학습 안내

- 

👩‍👦 마무리 말씀

- `);
    } else {
      setContent(`📊 진도 및 학습 흐름

- 

📘 단어 및 과제 학습 현황

- 

✏ 문법 및 독해 이해도

- 

🌿 전반적인 수업 태도 및 보완점

- 

💌 마무리 말씀

- `);
    }

    setMessage("관찰일지 양식을 불러왔습니다.");
  }

  async function generateAiDraft() {
    if (!selectedStudent) {
      setMessage("학생을 먼저 선택해주세요.");
      return;
    }

    setMessage("AI 초안 생성 중...");

    try {
      const res = await fetch("/api/ai-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentName: selectedStudent.name,
          level: selectedStudent.level,
          grade: selectedStudent.grade,
          month: selectedMonth,
          currentContent: content,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(
          "AI 초안 생성 실패: " +
            (data.detail || data.error || "알 수 없는 오류")
        );
        return;
      }

      setContent(data.draft || "");
      setMessage("AI 초안 생성 완료! 내용을 확인 후 수정하고 저장하세요.");
    } catch (error: any) {
      setMessage("AI 초안 생성 실패: " + error.message);
    }
  }

  async function copyReportText() {
    if (!selectedStudent) {
      setMessage("학생을 먼저 선택해주세요.");
      return;
    }

    if (!content.trim()) {
      setMessage("복사할 관찰일지가 없습니다.");
      return;
    }

    const textToCopy = `${selectedStudent.name} - ${selectedMonth} 관찰일지

${content}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setMessage("관찰일지가 복사되었습니다. 카카오 채팅방에 붙여넣기하세요.");
    } catch (error: any) {
      setMessage("복사 실패: 브라우저에서 복사를 허용하지 않았습니다.");
    }
  }

  async function saveReport() {
    if (!selectedStudent) {
      setMessage("학생을 먼저 선택해주세요.");
      return;
    }

    if (!content.trim()) {
      setMessage("관찰일지를 입력해주세요.");
      return;
    }

    setMessage("저장 중...");

    const res = await fetch("/api/reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        studentName: selectedStudent.name,
        month: selectedMonth,
        content,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(
        "저장 실패: " + (data.detail || data.error || "알 수 없는 오류")
      );
      return;
    }

    if (data.mode === "updated") {
      setMessage("기존 관찰일지를 수정 완료했습니다.");
    } else {
      setMessage("새 관찰일지를 저장 완료했습니다.");
    }
  }

  if (!authorized) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "Arial",
          background: "#f7f7f7",
        }}
      >
        <div
          style={{
            width: 340,
            padding: 28,
            border: "1px solid #ddd",
            borderRadius: 16,
            background: "white",
          }}
        >
          <h2 style={{ marginBottom: 20 }}>학생 관찰일지 시스템</h2>

          <input
            type="password"
            placeholder="비밀번호 입력"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (password === SITE_PASSWORD) {
                  setAuthorized(true);
                } else {
                  alert("비밀번호가 틀렸습니다.");
                }
              }
            }}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
              border: "1px solid #ccc",
              marginBottom: 12,
              boxSizing: "border-box",
            }}
          />

          <button
            onClick={() => {
              if (password === SITE_PASSWORD) {
                setAuthorized(true);
              } else {
                alert("비밀번호가 틀렸습니다.");
              }
            }}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
              border: "none",
              background: "black",
              color: "white",
              cursor: "pointer",
            }}
          >
            입장하기
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>학생 관찰일지 시스템</h1>

      <hr style={{ margin: "24px 0" }} />

      <h2>학생 추가</h2>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 10,
        }}
      >
        <input
          placeholder="학생 이름"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
        />

        <select
          value={newGrade}
          onChange={(e) => setNewGrade(e.target.value)}
          style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
        >
          {gradeOptions.map((grade) => (
            <option key={grade} value={grade}>
              {grade}
            </option>
          ))}
        </select>

        <select
          value={newLevel}
          onChange={(e) => setNewLevel(e.target.value)}
          style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
        >
          <option value="">레벨 선택</option>
          {levelOptions.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>

        <select
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value)}
          style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <button
          onClick={addStudent}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: "none",
            background: "black",
            color: "white",
            cursor: "pointer",
          }}
        >
          학생 추가
        </button>
      </div>

      <p style={{ fontWeight: "bold", color: "blue" }}>{studentAddMessage}</p>

      <hr style={{ margin: "24px 0" }} />

      <h2>레벨별 보기</h2>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        {levels.map((level) => (
          <button
            key={level}
            onClick={() => {
              setSelectedLevel(level);
              setSelectedStudent(null);
              setContent("");
              setMessage("");
            }}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border:
                selectedLevel === level ? "2px solid black" : "1px solid #ccc",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            {level}
          </button>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ margin: 0 }}>학생 목록</h2>

        <button
          type="button"
          onClick={() => {
            setDeleteMode((prev) => !prev);
            setEditMode(false);
          }}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: deleteMode ? "2px solid #d11" : "1px solid #ccc",
            background: deleteMode ? "#fff5f5" : "#fff",
            color: deleteMode ? "#d11" : "#333",
            cursor: "pointer",
            fontWeight: deleteMode ? "bold" : "normal",
          }}
        >
          {deleteMode ? "삭제 모드 끄기" : "삭제 모드 켜기"}
        </button>

        <button
          type="button"
          onClick={() => {
            setEditMode((prev) => !prev);
            setDeleteMode(false);
          }}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: editMode ? "2px solid #2563eb" : "1px solid #ccc",
            background: editMode ? "#eff6ff" : "#fff",
            color: editMode ? "#1d4ed8" : "#333",
            cursor: "pointer",
            fontWeight: editMode ? "bold" : "normal",
          }}
        >
          {editMode ? "반 수정 모드 끄기" : "반 수정 모드 켜기"}
        </button>

        {deleteMode && (
          <span style={{ color: "#d11", fontWeight: "bold", fontSize: 14 }}>
            삭제 버튼이 활성화되었습니다.
          </span>
        )}

        {editMode && (
          <span style={{ color: "#1d4ed8", fontWeight: "bold", fontSize: 14 }}>
            반 수정 후 저장하면 노션에도 반영됩니다.
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {filteredStudents.map((student: Student) => (
          <div
            key={getStudentKey(student)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: deleteMode || editMode ? 6 : 0,
              borderRadius: 10,
              background: editMode
                ? "#eff6ff"
                : deleteMode
                ? "#fafafa"
                : "transparent",
              border: editMode
                ? "1px dashed #93c5fd"
                : deleteMode
                ? "1px dashed #ddd"
                : "none",
            }}
          >
            <button
              onClick={async () => {
                setSelectedStudent(student);
                setSelectedMonth("1월");
                await loadReport(student.name, "1월");
              }}
              style={{
                padding: "12px 16px",
                borderRadius: 8,
                border:
                  selectedStudent?.id === student.id
                    ? "2px solid black"
                    : "1px solid #ccc",
                background: "#fff",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              {student.name || "이름없음"}
            </button>

            {editMode && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: 6,
                  borderRadius: 8,
                  background: "#ffffff",
                  border: "1px solid #bfdbfe",
                }}
              >
                <select
                  value={editingLevels[student.id] || student.level || ""}
                  onChange={(e) =>
                    setEditingLevels((prev) => ({
                      ...prev,
                      [student.id]: e.target.value,
                    }))
                  }
                  style={{
                    width: 115,
                    padding: "7px 8px",
                    borderRadius: 8,
                    border: "1px solid #93c5fd",
                    fontSize: 12,
                  }}
                >
                  {levelOptions.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => updateStudentLevel(student)}
                  style={{
                    padding: "7px 9px",
                    borderRadius: 8,
                    border: "1px solid #2563eb",
                    background: "#2563eb",
                    color: "white",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: "bold",
                  }}
                >
                  저장
                </button>
              </div>
            )}

            {deleteMode && (
              <button
                type="button"
                onClick={() => deleteStudent(student)}
                style={{
                  padding: "6px 8px",
                  borderRadius: 6,
                  border: "1px solid #ffb3b3",
                  background: "#fff5f5",
                  color: "#d11",
                  cursor: "pointer",
                  fontSize: 11,
                }}
                title="학생 삭제"
              >
                삭제
              </button>
            )}
          </div>
        ))}
      </div>

      {selectedStudent && (
        <>
          <hr style={{ margin: "32px 0" }} />

          <h2>
            {selectedStudent.name} - {selectedMonth}
          </h2>

          <div style={{ marginBottom: 12, color: "#555" }}>
            {selectedStudent.grade} / {selectedStudent.level}
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 20,
            }}
          >
            {months.map((month) => (
              <button
                key={month}
                onClick={async () => {
                  setSelectedMonth(month);
                  await loadReport(selectedStudent.name, month);
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border:
                    selectedMonth === month
                      ? "2px solid black"
                      : "1px solid #ccc",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                {month}
              </button>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 12,
            }}
          >
            <button
              type="button"
              onClick={copyPreviousMonth}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #ccc",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              지난달 복사
            </button>

            <button
              type="button"
              onClick={generateTemplate}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #ccc",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              양식 자동 입력
            </button>

            <button
              type="button"
              onClick={generateAiDraft}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #ccc",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              AI 초안 생성
            </button>

            <button
              type="button"
              onClick={copyReportText}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #ccc",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              관찰일지 복사
            </button>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="관찰일지를 입력하세요"
            style={{
              width: "100%",
              height: 300,
              padding: 16,
              borderRadius: 12,
              border: "1px solid #ccc",
            }}
          />

          <br />
          <br />

          <button
            onClick={saveReport}
            style={{
              padding: "12px 20px",
              borderRadius: 10,
              border: "none",
              background: "black",
              color: "white",
              cursor: "pointer",
            }}
          >
            저장하기
          </button>

          <p style={{ marginTop: 16, fontWeight: "bold", color: "blue" }}>
            {message}
          </p>
        </>
      )}
    </main>
  );
}
