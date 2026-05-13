"use client";

import { useEffect, useState } from "react";

const months = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
];

export default function Home() {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedLevel, setSelectedLevel] = useState("전체");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState("1월");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");

  const [newName, setNewName] = useState("");
  const [newGrade, setNewGrade] = useState("초등저학년");
  const [newLevel, setNewLevel] = useState("");
  const [newStatus, setNewStatus] = useState("재원중");

  async function refreshStudents() {
    const res = await fetch("/api/students");
    const data = await res.json();
    setStudents(data.students || []);
  }

  useEffect(() => {
    refreshStudents();
  }, []);

  const levels = [
    "전체",
    ...Array.from(
      new Set(
        students
          .map((student) => student.level)
          .filter((level) => level && level.trim())
      )
    ),
  ];

  const filteredStudents =
    selectedLevel === "전체"
      ? students
      : students.filter((student) => student.level === selectedLevel);

  async function addStudent() {
    if (!newName.trim()) {
      setMessage("학생 이름을 입력해주세요.");
      return;
    }

    if (!newLevel.trim()) {
      setMessage("레벨을 입력해주세요.");
      return;
    }

    setMessage("학생 추가 중...");

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
      setMessage("학생 추가 실패: " + (data.detail || data.error || "알 수 없는 오류"));
      return;
    }

    setNewName("");
    setNewLevel("");
    setNewGrade("초등저학년");
    setNewStatus("재원중");

    await refreshStudents();

    setMessage("학생 추가 완료!");
  }

  async function loadReport(studentName: string, month: string) {
    setMessage("불러오는 중...");

    const res = await fetch(
      `/api/report?studentName=${encodeURIComponent(studentName)}&month=${encodeURIComponent(month)}`
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

    setMessage(`${previousMonth} 내용을 불러오는 중...`);

    const res = await fetch(
      `/api/report?studentName=${encodeURIComponent(selectedStudent.name)}&month=${encodeURIComponent(previousMonth)}`
    );

    const data = await res.json();

    if (data.exists) {
      setContent(data.content || "");
      setMessage(`${previousMonth} 내용을 ${selectedMonth}에 복사했습니다. 저장하기를 누르면 반영됩니다.`);
    } else {
      setMessage(`${previousMonth}에 저장된 관찰일지가 없습니다.`);
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

  return (
    <main style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>학생 관찰일지 시스템</h1>

      <hr style={{ margin: "24px 0" }} />

      <h2>학생 추가</h2>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        <input
          placeholder="학생 이름"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
        />

        <input
          placeholder="학년"
          value={newGrade}
          onChange={(e) => setNewGrade(e.target.value)}
          style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
        />

        <input
          placeholder="레벨 예: GK001"
          value={newLevel}
          onChange={(e) => setNewLevel(e.target.value)}
          style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
        />

        <input
          placeholder="상태"
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value)}
          style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
        />

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

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
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

          <p
            style={{
              marginTop: 16,
              fontWeight: "bold",
              color: "blue",
            }}
          >
            {message}
          </p>
        </>
      )}
    </main>
  );
}
