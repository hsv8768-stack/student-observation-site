"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState("1월");
  const [content, setContent] = useState("");

  useEffect(() => {
    fetch("/api/students")
      .then((res) => res.json())
      .then((data) => {
        setStudents(data.students || []);
      });
  }, []);

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

  async function saveReport() {
    if (!selectedStudent) {
      alert("학생을 먼저 선택해주세요.");
      return;
    }

    if (!content.trim()) {
      alert("관찰일지를 입력해주세요.");
      return;
    }

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

    if (!res.ok) {
      const data = await res.json();
      alert("저장 실패: " + data.detail);
      return;
    }

    alert("저장 완료!");
  }

  return (
    <main style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>학생 관찰일지 시스템</h1>

      <hr style={{ margin: "24px 0" }} />

      <h2>학생 목록</h2>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {students.map((student: any) => (
          <button
            key={student.id}
            onClick={() => {
              setSelectedStudent(student);
              setContent("");
              setSelectedMonth("1월");
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
                onClick={() => {
                  setSelectedMonth(month);
                  setContent("");
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

          <textarea
            placeholder="관찰일지를 입력하세요"
            value={content}
            onChange={(e) => setContent(e.target.value)}
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
        </>
      )}
    </main>
  );
}
