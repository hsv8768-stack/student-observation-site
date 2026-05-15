"use client";

import { useEffect, useState } from "react";

const months = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
];

const levelOptions = [
  "중3", "중2", "중1", "초6",
  "GR105", "GR104", "GR103", "GR102", "GR101",
  "GK005", "GK004", "GK003", "GK002", "GK001", "GK001(A)",
];

const gradeOptions = ["초등저학년", "초등고학년", "중등부"];
const statusOptions = ["재원중", "휴원", "퇴원"];

export default function Home() {
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState("");

  const SITE_PASSWORD = "1234";

  const [students, setStudents] = useState<any[]>([]);
  const [selectedLevel, setSelectedLevel] = useState("전체");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState("1월");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [studentAddMessage, setStudentAddMessage] = useState("");

  const [newName, setNewName] = useState("");
  const [newGrade, setNewGrade] = useState("초등저학년");
  const [newLevel, setNewLevel] = useState("");
  const [newStatus, setNewStatus] = useState("재원중");

  async function refreshStudents() {
    const res = await fetch(`/api/students?ts=${Date.now()}`, {
      cache: "no-store",
    });
    const data = await res.json();
    setStudents(data.students || []);
  }

  useEffect(() => {
    if (authorized) {
      refreshStudents();
    }
  }, [authorized]);

  const levels = ["전체", ...levelOptions];

  const filteredStudents =
    selectedLevel === "전체"
      ? students
      : students.filter((student) => student.level === selectedLevel);

  async function addStudent() {
    setStudentAddMessage("학생 추가 중...");

    if (!newName.trim()) {
      setStudentAddMessage("학생 이름을 입력해주세요.");
      return;
    }

    if (!newLevel.trim()) {
      setStudentAddMessage("레벨을 선택해주세요.");
      return;
    }

    try {
      const res = await fetch("/api/students/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newName,
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

      const addedStudent = {
        id: data.id || `temp-${Date.now()}`,
        name: newName,
        grade: newGrade,
        level: newLevel,
        status: newStatus,
      };

      setStudents((prev) => [...prev, addedStudent]);
      setSelectedLevel(newLevel);

      setNewName("");
      setNewLevel("");
      setNewGrade("초등저학년");
      setNewStatus("재원중");

      setStudentAddMessage("학생 추가 완료! 목록에 바로 반영했습니다.");
    } catch (error: any) {
      setStudentAddMessage("학생 추가 실패: " + error.message);
    }
  }

  async function loadReport(studentName: string, month: string) {
    setMessage("불러오는 중...");

    const res = await fetch(
      `/api/report?studentName=${encodeURIComponent(studentName)}&month=${encodeURIComponent(month)}&ts=${Date.now()}`,
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
      `/api/report?studentName=${encodeURIComponent(selectedStudent.name)}&month=${encodeURIComponent(previousMonth)}&ts=${Date.now()}`,
      { cache: "no-store" }
    );

    const data = await res.json();

    if (data.exists) {
      setContent(data.content || "");
      setMessage(`${previousMonth} 내용을 ${selectedMonth}에 복사했습니다. 저장하기를 누르면 반영됩니다.`);
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
        setMessage("AI 초안 생성 실패: " + (data.detail || data.error || "알 수 없는 오류"));
        return;
      }

      setContent(data.draft || "");
      setMessage("AI 초안 생성 완료! 내용을 확인 후 수정하고 저장하세요.");
    } catch (error: any) {
      setMessage("AI 초안 생성 실패: " + error.message);
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
      setMessage("저장 실패: " + (data.detail || data.error || "알 수 없는 오류"));
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

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
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
            <option key={grade} value={grade}>{grade}</option>
          ))}
        </select>

        <select
          value={newLevel}
          onChange={(e) => setNewLevel(e.target.value)}
          style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
        >
          <option value="">레벨 선택</option>
          {levelOptions.map((level) => (
            <option key={level} value={level}>{level}</option>
          ))}
        </select>

        <select
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value)}
          style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>{status}</option>
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

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
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
              border: selectedLevel === level ? "2px solid black" : "1px solid #ccc",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            {level}
          </button>
        ))}
      </div>

      <h2>학생 목록</h2>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {filteredStudents.map((student: any) => (
          <button
            key={student.id}
            onClick={async () => {
              setSelectedStudent(student);
              setSelectedMonth("1월");
              await loadReport(student.name, "1월");
            }}
            style={{
              padding: 12,
              borderRadius: 8,
              border:
                selectedStudent?.id === student.id
                  ? "2px solid black"
                  : "1px solid #ccc",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            {student.name || "이름없음"}
          </button>
        ))}
      </div>

      {selectedStudent && (
        <>
          <hr style={{ margin: "32px 0" }} />

          <h2>{selectedStudent.name} - {selectedMonth}</h2>

          <div style={{ marginBottom: 12, color: "#555" }}>
            {selectedStudent.grade} / {selectedStudent.level}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
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

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
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
