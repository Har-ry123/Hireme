import { useEffect, useRef, useState } from "react";
import { ArrowUp, ClipboardList, FileDown, Gauge, Menu, Plus, Target, Upload, X } from "lucide-react";
import Markdown from "react-markdown";
import { analyzeResume, askQuestion } from "./api.js";
import { DEFAULT_CANDIDATE, HR_QUESTIONS } from "./candidate.js";

const STORAGE_KEY = "hiremeai.state";
const SLOW_REQUEST_MS = 8000;

const DEFAULT_RESUME = { ...DEFAULT_CANDIDATE, analysis: null, indexed: true };

function newConversation(messages = [], title = "New conversation") {
  return { id: crypto.randomUUID(), title, messages };
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

function firstNameOf(name) {
  return name === "Candidate" ? "the candidate" : name.split(" ")[0];
}

function suggestionsFor(name) {
  const first = firstNameOf(name);
  return [
    "Why should I hire you?",
    `Tell me about ${first}`,
    `What are ${first}'s main skills?`,
    `Explain ${first}'s main projects`,
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

function Avatar({ name }) {
  return <div className="avatar" aria-hidden="true">{name.charAt(0).toUpperCase()}</div>;
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
    <article className="card">
      <header className="analysis-header">
        <h3>{name}</h3>
        <p className="score">
          <strong>{analysis.score}</strong> / 100
        </p>
      </header>
      <p>{analysis.summary}</p>
      <AnalysisList title="Strengths" items={analysis.strengths} />
      <AnalysisList title="Weaknesses" items={analysis.weaknesses} />
      <AnalysisList title="Suggestions" items={analysis.suggestions} />
      {!indexed && (
        <p className="message-error">
          This resume couldn't be saved for chat, so questions won't work yet. Upload it again to retry.
        </p>
      )}
    </article>
  );
}

function HrQuestions({ onAsk }) {
  return (
    <article className="card hr-questions">
      <h3>HR questions</h3>
      {HR_QUESTIONS.map((group, index) => (
        <details key={group.title} open={index === 0}>
          <summary>{group.title}</summary>
          <div className="question-list">
            {group.questions.map((question) => (
              <button key={question} onClick={() => onAsk(question)}>{question}</button>
            ))}
          </div>
        </details>
      ))}
    </article>
  );
}

function Message({ message, resume, streaming, onAsk }) {
  if (message.role === "analysis") {
    return <AnalysisCard name={resume.name} analysis={resume.analysis} indexed={resume.indexed} />;
  }
  if (message.role === "hr") {
    return <HrQuestions onAsk={onAsk} />;
  }
  if (message.role === "error") {
    return <p className="message-error" role="alert">{message.content}</p>;
  }
  if (message.role === "user") {
    return <p className="message-user">{message.content}</p>;
  }
  return (
    <div className={`markdown ${streaming ? "streaming" : ""}`}>
      <Markdown>{message.content}</Markdown>
    </div>
  );
}

function Status({ label, hint }) {
  return (
    <div className="status" role="status">
      <p>{label}</p>
      {hint}
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
  const lastMessage = active.messages[active.messages.length - 1];
  const isEmpty = active.messages.length === 0 && !uploading;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Chat still works without saved history
    }
  }, [state]);

  useEffect(() => {
    // Smooth scrolling can't keep up with text arriving many times a second
    threadEnd.current?.scrollIntoView({ behavior: asking ? "auto" : "smooth", block: "end" });
  }, [active.messages.length, lastMessage?.content, asking]);

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

  function setStreamedAnswer(conversationId, content, isFirstText) {
    setState((s) => ({
      ...s,
      conversations: s.conversations.map((c) => {
        if (c.id !== conversationId) return c;
        const previous = isFirstText ? c.messages : c.messages.slice(0, -1);
        return { ...c, messages: [...previous, { role: "assistant", content }] };
      }),
    }));
  }

  function startConversation(messages = [], title) {
    const conversation = newConversation(messages, title);
    setState((s) => ({
      ...s,
      conversations: [conversation, ...s.conversations],
      activeId: conversation.id,
    }));
    setSidebarOpen(false);
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
    if (!question || asking) return;

    const title = active.messages.some((m) => m.role === "user") ? undefined : question.slice(0, 40);
    const conversationId = active.id;
    appendMessages(conversationId, [{ role: "user", content: question }], title);
    setInput("");
    setSidebarOpen(false);
    setAsking(true);
    let isFirstText = true;
    try {
      await askQuestion(resume.resumeId, question, (answer) => {
        setStreamedAnswer(conversationId, answer, isFirstText);
        isFirstText = false;
      });
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
      const conversation = newConversation([{ role: "analysis" }], "Resume analysis");
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

  const slowHint = slow && <p className="slow-hint">This is taking longer than usual, and can take up to a minute.</p>;

  const tools = [
    { label: "HR questions", icon: ClipboardList, onClick: () => startConversation([{ role: "hr" }], "HR questions") },
    { label: "Job match score", icon: Target, onClick: prefillJobMatch },
    {
      label: "Resume analysis",
      icon: Gauge,
      onClick: () => startConversation([{ role: "analysis" }], "Resume analysis"),
      hidden: !resume.analysis,
    },
    { label: "Upload a resume", icon: Upload, onClick: () => fileInput.current.click(), disabled: uploading },
    { label: "Export as PDF", icon: FileDown, onClick: exportChat, disabled: !active.messages.length },
  ];

  const composerForm = (
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
          placeholder={`Ask about ${firstNameOf(resume.name)}…`}
          aria-label="Your question"
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              ask(input);
            }
          }}
        />
        <button type="submit" className="send" aria-label="Send" disabled={!input.trim() || asking}>
          <ArrowUp size={18} aria-hidden="true" />
        </button>
      </div>
    </form>
  );

  return (
    <div className="app">
      <input
        ref={fileInput}
        type="file"
        accept=".pdf,.docx"
        className="visually-hidden"
        aria-label="Upload a resume"
        onChange={handleFile}
      />
      {sidebarOpen && <div className="scrim" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <button className="new-chat" onClick={openNewChat}>
          <Plus size={16} aria-hidden="true" />
          New chat
        </button>

        <nav aria-label="Tools">
          {tools.filter((tool) => !tool.hidden).map((tool) => (
            <button key={tool.label} className="tool" onClick={tool.onClick} disabled={tool.disabled}>
              <tool.icon size={16} aria-hidden="true" />
              {tool.label}
            </button>
          ))}
        </nav>

        <nav aria-label="Conversation history" className="history">
          <h2>Recent</h2>
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
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
        </nav>
      </aside>

      <main className={`chat ${isEmpty ? "empty" : ""}`}>
        <button className="menu" aria-label="Open menu" onClick={() => setSidebarOpen(true)}>
          <Menu size={18} aria-hidden="true" />
        </button>

        {isEmpty ? (
          <div className="welcome">
            <Avatar name={resume.name} />
            <h1>Ask me about {firstNameOf(resume.name)}</h1>
            {uploadError && <p className="message-error" role="alert">{uploadError}</p>}
            {composerForm}
            <div className="suggestions">
              {suggestionsFor(resume.name).map((suggestion) => (
                <button key={suggestion} onClick={() => ask(suggestion)}>{suggestion}</button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="thread">
              <div className="messages">
                {uploadError && <p className="message-error" role="alert">{uploadError}</p>}
                {uploading && <Status label="Analyzing resume…" hint={slowHint} />}
                {active.messages.map((message, index) => (
                  <Message
                    key={index}
                    message={message}
                    resume={resume}
                    streaming={asking && index === active.messages.length - 1}
                    onAsk={ask}
                  />
                ))}
                {asking && lastMessage?.role !== "assistant" && <Status label="Thinking…" hint={slowHint} />}
                <div ref={threadEnd} />
              </div>
            </div>
            {composerForm}
          </>
        )}
      </main>
    </div>
  );
}
