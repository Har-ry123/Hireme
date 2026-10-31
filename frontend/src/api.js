const API_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

async function send(path, options) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, options);
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = typeof body?.detail === "string" ? body.detail : null;
    throw new Error(detail || `The server returned an error (${response.status}).`);
  }
  return response;
}

export async function analyzeResume(file) {
  const form = new FormData();
  form.append("file", file);
  const response = await send("/analyze", { method: "POST", body: form });
  return response.json();
}

// Calls onText with the answer so far, each time more of it arrives
export async function askQuestion(resumeId, question, onText) {
  const response = await send("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume_id: resumeId, question }),
  });

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let answer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      answer += value;
      onText(answer);
    }
  } catch {
    throw new Error("The connection dropped before the answer finished. Try again.");
  }
  if (!answer) throw new Error("The server returned an empty answer. Try again.");
}
