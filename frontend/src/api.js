const API_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const TICK_MS = 25;
const MIN_CHARS_PER_TICK = 2;
const BACKLOG_DIVISOR = 120;

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

// Calls onText with the answer so far, each time more of it arrives
export async function askQuestion(resumeId, question, onText) {
  const response = await send("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume_id: resumeId, question }),
  });

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let answer = "";
  let finished = false;
  let failed = false;
  const receiving = (async () => {
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += value;
      }
    } catch {
      failed = true;
    }
    finished = true;
  })();

  // Groq can finish a long answer in a second, so reveal the text at a readable pace.
  // The step grows with the backlog, so long answers don't take forever.
  let shown = 0;
  while (!finished || shown < answer.length) {
    if (shown < answer.length) {
      const backlog = answer.length - shown;
      shown += Math.max(MIN_CHARS_PER_TICK, Math.ceil(backlog / BACKLOG_DIVISOR));
      onText(answer.slice(0, shown));
    }
    await new Promise((resolve) => setTimeout(resolve, TICK_MS));
  }
  await receiving;

  if (failed) throw new Error("The connection dropped before the answer finished. Try again.");
  if (!answer) throw new Error("The server returned an empty answer. Try again.");
}
