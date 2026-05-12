async function getStudents() {
  const res = await fetch(
    "https://hsv8768-stack-student-observation-s.vercel.app/api/students",
    {
      cache: "no-store",
    }
  );

  return res.json();
}

export default async function Home() {
  const data = await getStudents();

  return (
    <main style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>학생 관찰일지 시스템</h1>

      <hr style={{ margin: "24px 0" }} />

      <h2>학생 목록</h2>

      <div style={{ marginTop: 20 }}>
        {data.students.map((student: any) => (
          <div
            key={student.id}
            style={{
              border: "1px solid #ddd",
              padding: 16,
              marginBottom: 12,
              borderRadius: 8,
            }}
          >
            <h3>{student.name}</h3>

            <p>반: {student.className}</p>
            <p>학년: {student.grade}</p>
            <p>레벨: {student.level}</p>
            <p>상태: {student.status}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
