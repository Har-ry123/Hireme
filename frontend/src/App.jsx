import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  ArrowUpRight,
  ClipboardList,
  FileDown,
  Gauge,
  Menu,
  MessageCircleQuestion,
  Plus,
  Sparkles,
  Target,
  Upload,
  X,
} from "lucide-react";
import Markdown from "react-markdown";
import { analyzeResume, askQuestion } from "./api.js";
import { DEFAULT_CANDIDATE, HR_QUESTIONS } from "./candidate.js";

const STORAGE_KEY = "hiremeai.state";
const SLOW_REQUEST_MS = 8000;
const COUNT_UP_MS = 1400;

const DEFAULT_RESUME = {
  resumeId: DEFAULT_CANDIDATE.resumeId,
  name: DEFAULT_CANDIDATE.name,
  analysis: null,
  indexed: true,
};

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
    `What experience does ${first} have?`,
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

function useCountUp(target) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return undefined;
    }
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const progress = Math.min((now - start) / COUNT_UP_MS, 1);
      setValue(Math.round(target * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return value;
}

// Moves the glow that follows the pointer across a card
function trackPointer(event) {
  const rect = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty("--x", `${event.clientX - rect.left}px`);
  event.currentTarget.style.setProperty("--y", `${event.clientY - rect.top}px`);
}

function Orb({ name, size = "small" }) {
  return (
    <div className={`orb orb-${size}`} aria-hidden="true">
      <span>{name.charAt(0).toUpperCase()}</span>
    </div>
  );
}

function Stat({ value, suffix, label }) {
  const shown = useCountUp(value);
  return (
    <div className="stat">
      <strong>{shown}{suffix}</strong>
      <span>{label}</span>
    </div>
  );
}

function SkillTicker({ skills }) {
  return (
    <div className="ticker" aria-label={`Skills: ${skills.join(", ")}`}>
      {/* The list is doubled so that the loop has no visible seam */}
      <div className="ticker-track" aria-hidden="true">
        {[...skills, ...skills].map((skill, index) => (
          <span key={index}>{skill}</span>
        ))}
      </div>
    </div>
  );
}

function AnalysisList({ title, items, tone }) {
  if (!items.length) return null;
  return (
    <section className={`analysis-list ${tone}`}>
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
    <article className="analysis glass">
      <header>
        <div>
          <p className="eyebrow">Resume analysis</p>
          <h3>{name}</h3>
          <p>{analysis.summary}</p>
        </div>
        <div
          className="score"
          style={{ "--score": analysis.score }}
          role="img"
          aria-label={`Score: ${analysis.score} out of 100`}
        >
          <div>
            <strong>{analysis.score}</strong>
            <span>of 100</span>
          </div>
        </div>
      </header>
      <div className="analysis-grid">
        <AnalysisList title="Strengths" items={analysis.strengths} tone="good" />
        <AnalysisList title="Weaknesses" items={analysis.weaknesses} tone="warn" />
        <AnalysisList title="Suggestions" items={analysis.suggestions} tone="idea" />
      </div>
      {!indexed && (
        <p className="notice">
          This resume couldn't be saved for chat, so questions won't work yet. Upload it again to retry.
        </p>
      )}
    </article>
  );
}

function HrQuestions({ onAsk }) {
  return (
    <article className="hr-questions glass">
      <p className="eyebrow">HR interview</p>
      <h3>Pick a question. Get an answer.</h3>
      {HR_QUESTIONS.map((group) => (
        <section key={group.title}>
          <h4>{group.title}</h4>
          <div className="hr-chips">
            {group.questions.map((question) => (
              <button key={question} onClick={() => onAsk(question)}>{question}</button>
            ))}
          </div>
        </section>
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
    <div className="message-assistant">
      <Orb name={resume.name} />
      <div className={`markdown ${streaming ? "streaming" : ""}`}>
        <Markdown>{message.content}</Markdown>
      </div>
    </div>
  );
}

function Thinking({ label, hint }) {
  return (
    <div className="status" role="status">
      <p>
        <span className="dots" aria-hidden="true"><i /><i /><i /></span>
        {label}
      </p>
      {hint}
    </div>
  );
}

function Welcome({ resume, profile, onAsk, onShowHr }) {
  return (
    <div className="welcome">
      <div className="pill">
        <span className="live-dot" />
        AI representative online
      </div>
      <h2>
        Meet {resume.name}.
        <em>Interview the AI, not the PDF.</em>
      </h2>
      <p className="tagline">
        {profile ? profile.tagline : `Ask anything about ${resume.name}'s resume.`}
      </p>

      {profile && (
        <div className="stats">
          {profile.highlights.map((highlight) => (
            <Stat key={highlight.label} {...highlight} />
          ))}
        </div>
      )}

      <div className="suggestions">
        {suggestionsFor(resume.name).map((suggestion) => (
          <button key={suggestion} className="glow-card" onMouseMove={trackPointer} onClick={() => onAsk(suggestion)}>
            <span>{suggestion}</span>
            <ArrowUpRight size={18} aria-hidden="true" />
          </button>
        ))}
      </div>

      <button className="ghost" onClick={onShowHr}>
        <ClipboardList size={16} aria-hidden="true" />
        See all 28 HR questions
      </button>

      {profile && <SkillTicker skills={profile.skills} />}
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
  // The stats and skills describe the default candidate, so an uploaded resume must not show them
  const profile = resume.resumeId === DEFAULT_CANDIDATE.resumeId ? DEFAULT_CANDIDATE : null;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Chat still works without saved history
    }
  }, [state]);

  const lastMessage = active.messages[active.messages.length - 1];

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

  function showHrQuestions() {
    startConversation([{ role: "hr" }], "HR questions");
  }

  const slowHint = slow && (
    <p className="slow-hint">This is taking longer than usual, and can take up to a minute.</p>
  );

  const tools = [
    { label: "HR questions", icon: ClipboardList, onClick: showHrQuestions },
    {
      label: "Why hire this candidate?",
      icon: Sparkles,
      onClick: () => ask("Why should a company hire this candidate? Give the strongest reasons from the resume."),
    },
    {
      label: "Interview questions",
      icon: MessageCircleQuestion,
      onClick: () => ask("Suggest five interview questions for this candidate, based on the resume."),
    },
    { label: "Job match score", icon: Target, onClick: prefillJobMatch },
    {
      label: "Resume analysis",
      icon: Gauge,
      onClick: () => startConversation([{ role: "analysis" }], "Resume analysis"),
      hidden: !resume.analysis,
    },
    { label: "Upload new resume", icon: Upload, onClick: () => fileInput.current.click(), disabled: uploading },
    { label: "Export chat as PDF", icon: FileDown, onClick: exportChat, disabled: !active.messages.length },
  ];

  return (
    <div className="app">
      <div className="aurora" aria-hidden="true">
        <i /><i /><i />
      </div>

      <input
        ref={fileInput}
        type="file"
        accept=".pdf,.docx"
        className="visually-hidden"
        aria-label="Upload a resume"
        onChange={handleFile}
      />
      {sidebarOpen && <div className="scrim" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar glass ${sidebarOpen ? "open" : ""}`}>
        <div className="brand">
          <Orb name={resume.name} />
          <div>
            <strong>HireMeAI</strong>
            <span>{resume.name}</span>
          </div>
        </div>

        <button className="new-chat" onClick={openNewChat}>
          <Plus size={16} aria-hidden="true" />
          New chat
        </button>

        <nav aria-label="AI tools">
          <h2>AI tools</h2>
          {tools.filter((tool) => !tool.hidden).map((tool) => (
            <button key={tool.label} className="tool" onClick={tool.onClick} disabled={tool.disabled}>
              <tool.icon size={16} aria-hidden="true" />
              {tool.label}
            </button>
          ))}
        </nav>

        <nav aria-label="Conversation history" className="history">
          <h2>History</h2>
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

      <main className="chat">
        <header className="chat-header">
          <button className="menu" aria-label="Open menu" onClick={() => setSidebarOpen(true)}>
            <Menu size={18} aria-hidden="true" />
          </button>
          <h1>{resume.name}'s AI Representative</h1>
        </header>

        <div className="thread">
          {uploadError && <p className="message-error" role="alert">{uploadError}</p>}
          {uploading && <Thinking label="Analyzing resume" hint={slowHint} />}

          {active.messages.length === 0 && !uploading ? (
            <Welcome resume={resume} profile={profile} onAsk={ask} onShowHr={showHrQuestions} />
          ) : (
            <div className="messages">
              {active.messages.map((message, index) => (
                <Message
                  key={index}
                  message={message}
                  resume={resume}
                  streaming={asking && index === active.messages.length - 1}
                  onAsk={ask}
                />
              ))}
              {asking && lastMessage?.role !== "assistant" && <Thinking label="Thinking" hint={slowHint} />}
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
              placeholder={`Ask ${firstNameOf(resume.name)} anything…`}
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
          <small>Answers come only from this candidate's resume and their own words.</small>
        </form>
      </main>
    </div>
  );
}
