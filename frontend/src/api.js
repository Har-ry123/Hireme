const API_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

async function request(path, options) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, options);
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = typeof body?.detail === "string" ? body.detail : null;
    throw new Error(detail || `The server returned an error (${response.status}).`);
  }
  return body;
}

export function analyzeResume(file) {
  const form = new FormData();
  form.append("file", file);
  return request("/analyze", { method: "POST", body: form });
}

export async function askQuestion(resumeId, question) {
  const { answer } = await request("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume_id: resumeId, question }),
  });
  return answer;
}
