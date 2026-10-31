import { useEffect, useRef, useState } from "react";
import { ArrowUp, ClipboardList, Plus, Target, X } from "lucide-react";
import Markdown from "react-markdown";
import { HR_QUESTIONS } from "./candidate.js";

const SLOW_REQUEST_MS = 8000;
const SUGGESTIONS = [
  "Why should I hire you?",
  "Tell me about yourself",
  "What are your main skills?",
  "Explain your main projects",
];
const JOB_MATCH_PROMPT = "Score me from 0 to 100 for the job below, and explain why:\n\n";

function HrPanel({ onAsk, onClose }) {
  return (
    <div className="hr-panel">
      <header>
        <h3>HR questions</h3>
        <button aria-label="Close HR questions" onClick={onClose}>
          <X size={16} aria-hidden="true" />
        </button>
      </header>
      {HR_QUESTIONS.map((group, index) => (
        <details key={group.title} open={index === 0}>
          <summary>{group.title}</summary>
          {group.questions.map((question) => (
            <button key={question} className="hr-question" onClick={() => onAsk(question)}>{question}</button>
          ))}
        </details>
      ))}
    </div>
  );
}

export default function Chat({ messages, asking, onAsk, onClear }) {
  const [input, setInput] = useState("");
  const [showHr, setShowHr] = useState(false);
  const [slow, setSlow] = useState(false);
  const composer = useRef(null);
  const end = useRef(null);
  const last = messages[messages.length - 1];

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length, last?.content, asking]);

  useEffect(() => {
    setSlow(false);
    if (!asking) return undefined;
    const timer = setTimeout(() => setSlow(true), SLOW_REQUEST_MS);
    return () => clearTimeout(timer);
  }, [asking]);

  function send(question) {
    if (!question.trim() || asking) return;
    onAsk(question.trim());
    setInput("");
    setShowHr(false);
  }

  function prefillJobMatch() {
    setInput(JOB_MATCH_PROMPT);
    composer.current?.focus();
  }

  return (
    <div className="chat">
      {showHr && <HrPanel onAsk={send} onClose={() => setShowHr(false)} />}

      <div className="thread">
        <p className="bubble bot">
          Hi! I'm Hariom's AI. Ask me anything about Hariom's skills, projects or experience, just like an interview.
        </p>
        {messages.length === 0 && (
          <div className="suggestions">
            {SUGGESTIONS.map((suggestion) => (
              <button key={suggestion} onClick={() => send(suggestion)}>{suggestion}</button>
            ))}
          </div>
        )}
        {messages.map((message, index) => {
          if (message.role === "user") {
            return <p key={index} className="bubble user">{message.content}</p>;
          }
          if (message.role === "error") {
            return <p key={index} className="bubble error" role="alert">{message.content}</p>;
          }
          const streaming = asking && index === messages.length - 1;
          return (
            <div key={index} className={`bubble bot markdown ${streaming ? "streaming" : ""}`}>
              <Markdown>{message.content}</Markdown>
            </div>
          );
        })}
        {asking && last?.role !== "assistant" && (
          <div className="bubble bot typing" role="status" aria-label="Thinking">
            <i /><i /><i />
          </div>
        )}
        {slow && asking && last?.role !== "assistant" && (
          <p className="slow-hint">This is taking longer than usual, and can take up to a minute.</p>
        )}
        <div ref={end} />
      </div>

      <div className="chat-actions">
        <button onClick={() => setShowHr((shown) => !shown)}>
          <ClipboardList size={14} aria-hidden="true" />
          HR questions
        </button>
        <button onClick={prefillJobMatch}>
          <Target size={14} aria-hidden="true" />
          Job match
        </button>
        <button onClick={onClear} disabled={!messages.length || asking}>
          <Plus size={14} aria-hidden="true" />
          New chat
        </button>
      </div>

      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          send(input);
        }}
      >
        <textarea
          ref={composer}
          rows={input.includes("\n") ? 4 : 1}
          value={input}
          placeholder="Type a message…"
          aria-label="Your question"
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send(input);
            }
          }}
        />
        <button type="submit" aria-label="Send" disabled={!input.trim() || asking}>
          <ArrowUp size={16} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
