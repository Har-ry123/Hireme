import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { analyzeResume, askQuestion } from "./api.js";

const STORAGE_KEY = "hiremeai.state";
const SLOW_REQUEST_MS = 8000;

const DEFAULT_RESUME = import.meta.env.VITE_DEFAULT_RESUME_ID
  ? {
      resumeId: import.meta.env.VITE_DEFAULT_RESUME_ID,
      name: import.meta.env.VITE_CANDIDATE_NAME || "Candidate",
      analysis: null,
      indexed: true,
    }
  : null;

function newConversation(messages = []) {
  return { id: crypto.randomUUID(), title: "New conversation", messages };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.resume && saved.conversations?.length) return saved;
  } catch {
    // Storage can be blocked or hold bad data: start fresh
  }
  const conversation = newConversation();
  return { resume: DEFAULT_RESUME, conversations: [conversation], activeId: conversation.id };
}

function suggestionsFor(name) {
  const first = name === "Candidate" ? "the candidate" : name.split(" ")[0];
  return [
    `Tell me about ${first}`,
    `What are ${first}'s main skills?`,
    `Explain ${first}'s main projects`,
    `What experience does ${first} have?`,
    `What education does ${first} have?`,
  ];
}

function useSlowFlag(active) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    if (!active) return undefined;
    const timer = setTimeout(() => setSlow(true), SLOW_REQUEST_MS);
    return () => clearTimeout(timer);
  }, [active]);
  return slow;
}

function Logo({ name, size = "small" }) {
  return <div className={`logo logo-${size}`}>{name.charAt(0).toUpperCase()}</div>;
}

function AnalysisList({ title, items }) {
  if (!items.length) return null;
  return (
    <section>
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function AnalysisCard({ name, analysis, indexed }) {
  return (
    <article className="analysis">
      <header>
        <div>
          <p className="eyebrow">Resume analysis</p>
          <h3>{name}</h3>
        </div>
        <div className="score" aria-label={`Score: ${analysis.score} out of 100`}>
          <strong>{analysis.score}</strong>
          <span>/100</span>
        </div>
      </header>
      <p>{analysis.summary}</p>
      <AnalysisList title="Strengths" items={analysis.strengths} />
      <AnalysisList title="Weaknesses" items={analysis.weaknesses} />
      <AnalysisList title="Suggestions" items={analysis.suggestions} />
      {!indexed && (
        <p className="notice">
          This resume couldn't be saved for chat, so questions won't work yet. Upload it again to retry.
        </p>
      )}
    </article>
  );
}

function Message({ message, resume }) {
  if (message.role === "analysis") {
    return <AnalysisCard name={resume.name} analysis={resume.analysis} indexed={resume.indexed} />;
  }
  if (message.role === "error") {
    return <p className="message-error" role="alert">{message.content}</p>;
  }
  if (message.role === "user") {
    return <p className="message-user">{message.content}</p>;
  }
  return (
    <div className="message-assistant">
      <Logo name={resume.name} />
      <div className="markdown">
        <Markdown>{message.content}</Markdown>
      </div>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState(loadState);
  const [input, setInput] = useState("");
  const [asking, setAsking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const fileInput = useRef(null);
  const composer = useRef(null);
  const threadEnd = useRef(null);
  const slow = useSlowFlag(asking || uploading);

  const { resume, conversations, activeId } = state;
  const active = conversations.find((c) => c.id === activeId) ?? conversations[0];

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Chat still works without saved history
    }
  }, [state]);

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [active.messages.length, asking]);

  function appendMessages(conversationId, messages, title) {
    setState((s) => ({
      ...s,
      conversations: s.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, title: title ?? c.title, messages: [...c.messages, ...messages] }
          : c,
      ),
    }));
  }

  function startConversation(messages = []) {
    const conversation = newConversation(messages);
    setState((s) => ({
      ...s,
      conversations: [conversation, ...s.conversations],
      activeId: conversation.id,
    }));
    setSidebarOpen(false);
    return conversation.id;
  }

  function openNewChat() {
    if (active.messages.length) startConversation();
    setSidebarOpen(false);
    setInput("");
  }

  function deleteConversation(id) {
    setState((s) => {
      const remaining = s.conversations.filter((c) => c.id !== id);
      const conversations = remaining.length ? remaining : [newConversation()];
      const activeId = s.activeId === id ? conversations[0].id : s.activeId;
      return { ...s, conversations, activeId };
    });
  }

  async function ask(rawQuestion) {
    const question = rawQuestion.trim();
    if (!question || asking || !resume) return;

    const title = active.messages.some((m) => m.role === "user") ? undefined : question.slice(0, 40);
    const conversationId = active.id;
    appendMessages(conversationId, [{ role: "user", content: question }], title);
    setInput("");
    setSidebarOpen(false);
    setAsking(true);
    try {
      const answer = await askQuestion(resume.resumeId, question);
      appendMessages(conversationId, [{ role: "assistant", content: answer }]);
    } catch (error) {
      appendMessages(conversationId, [{ role: "error", content: error.message }]);
    } finally {
      setAsking(false);
    }
  }

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setUploadError("");
    try {
      const result = await analyzeResume(file);
      const conversation = newConversation([{ role: "analysis" }]);
      conversation.title = "Resume analysis";
      setState({
        resume: {
          resumeId: result.resume_id,
          name: result.resume.name || "Candidate",
          analysis: result.analysis,
          indexed: result.indexed,
        },
        // Old chats were about the previous resume
        conversations: [conversation],
        activeId: conversation.id,
      });
      setSidebarOpen(false);
    } catch (error) {
      setUploadError(error.message);
    } finally {
      setUploading(false);
    }
  }

  function prefillJobMatch() {
    setInput("Score this candidate from 0 to 100 for the job below, and explain why:\n\n");
    setSidebarOpen(false);
    composer.current?.focus();
  }

  function exportChat() {
    setSidebarOpen(false);
    // Lets the sidebar close before the print dialog captures the page
    setTimeout(() => window.print(), 0);
  }

  const slowHint = slow && (
    <p className="slow-hint">The server may be waking up. This can take up to a minute.</p>
  );

  const hiddenFileInput = (
    <input
      ref={fileInput}
      type="file"
      accept=".pdf,.docx"
      className="visually-hidden"
      aria-label="Upload a resume"
      onChange={handleFile}
    />
  );

  if (!resume) {
    return (
      <main className="landing">
        {hiddenFileInput}
        <Logo name="H" size="large" />
        <h1>HireMeAI</h1>
        <p>Upload a resume to get a scored analysis and an AI representative that answers questions about it.</p>
        <button className="primary" onClick={() => fileInput.current.click()} disabled={uploading}>
          {uploading ? "Analyzing resume…" : "Upload resume"}
        </button>
        <small>PDF or DOCX, up to 10 MB</small>
        {slowHint}
        {uploadError && <p className="message-error" role="alert">{uploadError}</p>}
      </main>
    );
  }

  const tools = [
    { label: "Upload new resume", onClick: () => fileInput.current.click(), disabled: uploading },
    {
      label: "Resume analysis",
      onClick: () => startConversation([{ role: "analysis" }]),
      hidden: !resume.analysis,
    },
    {
      label: "Interview questions",
      onClick: () => ask("Suggest five interview questions for this candidate, based on the resume."),
    },
    { label: "Job match score", onClick: prefillJobMatch },
    {
      label: "Why hire this candidate?",
      onClick: () => ask("Why should a company hire this candidate? Give the strongest reasons from the resume."),
    },
    { label: "Export chat as PDF", onClick: exportChat, disabled: !active.messages.length },
  ];

  return (
    <div className="app">
      {hiddenFileInput}
      {sidebarOpen && <div className="scrim" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand">
          <Logo name={resume.name} />
          <div>
            <strong>Candidate AI</strong>
            <span>{resume.name}</span>
          </div>
        </div>

        <button className="new-chat" onClick={openNewChat}>+ New chat</button>

        <nav aria-label="AI tools">
          <h2>AI tools</h2>
          {tools.filter((tool) => !tool.hidden).map((tool) => (
            <button key={tool.label} className="tool" onClick={tool.onClick} disabled={tool.disabled}>
              {tool.label}
            </button>
          ))}
        </nav>

        <nav aria-label="Conversation history" className="history">
          <h2>Conversation history</h2>
          {conversations.map((conversation) => (
            <div key={conversation.id} className={`history-item ${conversation.id === active.id ? "active" : ""}`}>
              <button
                className="history-open"
                onClick={() => {
                  setState((s) => ({ ...s, activeId: conversation.id }));
                  setSidebarOpen(false);
                }}
              >
                {conversation.title}
              </button>
              <button
                className="history-delete"
                aria-label={`Delete ${conversation.title}`}
                onClick={() => deleteConversation(conversation.id)}
              >
                ×
              </button>
            </div>
          ))}
        </nav>
      </aside>

      <main className="chat">
        <header className="chat-header">
          <button className="menu" aria-label="Open menu" onClick={() => setSidebarOpen(true)}>☰</button>
          <div>
            <h1>{resume.name}'s AI Representative</h1>
            <p>Ask questions about the candidate</p>
          </div>
        </header>

        <div className="thread">
          {uploadError && <p className="message-error" role="alert">{uploadError}</p>}
          {uploading && (
            <div className="status">
              <p>Analyzing resume…</p>
              {slowHint}
            </div>
          )}

          {active.messages.length === 0 && !uploading ? (
            <div className="welcome">
              <Logo name={resume.name} size="large" />
              <h2>How can I help you?</h2>
              <p>Ask about {resume.name}'s education, skills, projects, experience or certifications.</p>
              <div className="suggestions">
                {suggestionsFor(resume.name).map((suggestion) => (
                  <button key={suggestion} onClick={() => ask(suggestion)}>
                    {suggestion}
                    <span aria-hidden="true">↗</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages">
              {active.messages.map((message, index) => (
                <Message key={index} message={message} resume={resume} />
              ))}
              {asking && (
                <div className="status">
                  <p>Thinking…</p>
                  {!uploading && slowHint}
                </div>
              )}
              <div ref={threadEnd} />
            </div>
          )}
        </div>

        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault();
            ask(input);
          }}
        >
          <div className="composer-box">
            <textarea
              ref={composer}
              rows={input.includes("\n") ? 4 : 1}
              value={input}
              placeholder={`Ask anything about ${resume.name}…`}
              aria-label="Your question"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  ask(input);
                }
              }}
            />
            <button type="submit" className="primary" disabled={!input.trim() || asking}>Send</button>
          </div>
          <small>AI answers use only the active candidate's resume.</small>
        </form>
      </main>
    </div>
  );
}
