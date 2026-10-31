import { useEffect, useRef, useState } from "react";
import { FileText, Folder, Mail, Sparkles, UserRound, Wifi } from "lucide-react";
import { askQuestion } from "./api.js";
import { ABOUT, CONTACT_LINKS, DEFAULT_CANDIDATE, PROJECTS, RESUME_URL } from "./candidate.js";
import Chat from "./Chat.jsx";
import Window from "./Window.jsx";

const STORAGE_KEY = "hiremeai.chat";
const PHONE_WIDTH = 800;
const MENU_BAR_HEIGHT = 28;
const DOCK_SPACE = 104;

const SIZES = {
  ask: { width: 430, height: 590 },
  projects: { width: 640, height: 400 },
  about: { width: 540, height: 500 },
  contact: { width: 420, height: 330 },
  project: { width: 520, height: 380 },
};

function loadMessages() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) return saved;
  } catch {
    // Storage can be blocked or hold bad data: start fresh
  }
  return [];
}

function placeWindow(id, order) {
  const { width, height } = SIZES[id.split(":")[0]];
  const available = window.innerHeight - MENU_BAR_HEIGHT - DOCK_SPACE;
  const fitted = Math.min(height, available - 16);
  if (id === "ask") {
    // Sits to the right, leaving the greeting on the wallpaper visible
    return {
      width,
      height: fitted,
      x: Math.max(window.innerWidth - width - 72, 16),
      y: MENU_BAR_HEIGHT + Math.max((available - fitted) / 2, 8),
    };
  }
  const offset = (order % 5) * 28;
  return {
    width: Math.min(width, window.innerWidth - 32),
    height: fitted,
    x: Math.max((window.innerWidth - width) / 2 - 160 + offset, 16),
    y: MENU_BAR_HEIGHT + 48 + offset,
  };
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);
  return now.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Wallpaper() {
  return (
    <svg className="wallpaper" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0a1f7a" />
          <stop offset="0.55" stopColor="#1438d6" />
          <stop offset="1" stopColor="#0a165c" />
        </linearGradient>
        <linearGradient id="waveA" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#0d2bb5" />
          <stop offset="0.6" stopColor="#3f6bff" />
          <stop offset="1" stopColor="#a9c4ff" />
        </linearGradient>
        <linearGradient id="waveB" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6d4dff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#0a1a6e" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="edge" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.7" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <rect width="1600" height="1000" fill="url(#sky)" />
      <path d="M0 1000 C 420 900 620 640 860 400 C 1040 220 1240 70 1600 0 L1600 1000 Z" fill="url(#waveA)" />
      <path d="M260 1000 C 700 880 900 660 1140 480 C 1300 360 1460 300 1600 280 L1600 1000 Z" fill="url(#waveB)" />
      <path d="M0 1000 C 420 900 620 640 860 400 C 1040 220 1240 70 1600 0" fill="none" stroke="url(#edge)" strokeWidth="5" />
    </svg>
  );
}

function ProjectFolderIcon() {
  return <Folder size={46} strokeWidth={1.2} fill="#6fd3ff" color="#a9e6ff" aria-hidden="true" />;
}

function ProjectsWindow({ onOpen }) {
  return (
    <div className="finder">
      {PROJECTS.map((project) => (
        <button key={project.id} onClick={() => onOpen(`project:${project.id}`)}>
          <ProjectFolderIcon />
          <span>{project.name}</span>
          <small>{project.date}</small>
        </button>
      ))}
    </div>
  );
}

function ProjectWindow({ project }) {
  return (
    <div className="document">
      <p className="meta">{project.date}</p>
      <h3>{project.name}</h3>
      <p className="stack">{project.stack}</p>
      <ul>
        {project.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </div>
  );
}

function AboutWindow() {
  const rows = (items) =>
    items.map((item) => (
      <div className="row" key={item.role}>
        <strong>{item.role}</strong>
        <span>{item.place}</span>
        <small>{item.date}</small>
      </div>
    ));
  return (
    <div className="document">
      <h3>{DEFAULT_CANDIDATE.name}</h3>
      <p>{ABOUT.summary}</p>
      <h4>Experience</h4>
      {rows(ABOUT.experience)}
      <h4>Education</h4>
      {rows(ABOUT.education)}
      <h4>Skills</h4>
      <p>{ABOUT.skills}</p>
      <h4>Achievements</h4>
      <p>{ABOUT.achievements}</p>
    </div>
  );
}

function ContactWindow() {
  return (
    <div className="contact">
      {CONTACT_LINKS.map((link) => (
        <a key={link.label} href={link.href} target="_blank" rel="noreferrer">
          <strong>{link.label}</strong>
          <span>{link.value}</span>
        </a>
      ))}
    </div>
  );
}

export default function App() {
  const clock = useClock();
  const [windows, setWindows] = useState(() =>
    window.innerWidth > PHONE_WIDTH ? { ask: { ...placeWindow("ask", 0), z: 1, maximized: false } } : {},
  );
  const [messages, setMessages] = useState(loadMessages);
  const [asking, setAsking] = useState(false);
  const nextZ = useRef(2);
  const opened = useRef(0);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Chat still works without saved history
    }
  }, [messages]);

  function openWindow(id) {
    const z = nextZ.current++;
    opened.current += 1;
    const order = opened.current;
    setWindows((all) => ({
      ...all,
      [id]: all[id] ? { ...all[id], z } : { ...placeWindow(id, order), z, maximized: false },
    }));
  }

  function closeWindow(id) {
    setWindows((all) => {
      const { [id]: _closed, ...rest } = all;
      return rest;
    });
  }

  function updateWindow(id, changes) {
    setWindows((all) => (all[id] ? { ...all, [id]: { ...all[id], ...changes } } : all));
  }

  function focusWindow(id) {
    const top = Math.max(...Object.values(windows).map((win) => win.z));
    if (windows[id]?.z !== top) updateWindow(id, { z: nextZ.current++ });
  }

  async function ask(question) {
    setMessages((all) => [...all, { role: "user", content: question }]);
    setAsking(true);
    let isFirstText = true;
    try {
      await askQuestion(DEFAULT_CANDIDATE.resumeId, question, (answer) => {
        const isFirst = isFirstText;
        isFirstText = false;
        setMessages((all) => [...(isFirst ? all : all.slice(0, -1)), { role: "assistant", content: answer }]);
      });
    } catch (error) {
      setMessages((all) => [...all, { role: "error", content: error.message }]);
    } finally {
      setAsking(false);
    }
  }

  const dockItems = [
    { id: "projects", label: "Projects", icon: Folder, tone: "blue" },
    { id: "about", label: "About", icon: UserRound, tone: "violet" },
    { id: "contact", label: "Contact", icon: Mail, tone: "green" },
  ];

  function windowContent(id) {
    if (id === "ask") {
      return {
        title: "Ask Me",
        icon: <Sparkles size={14} aria-hidden="true" />,
        body: <Chat messages={messages} asking={asking} onAsk={ask} onClear={() => setMessages([])} />,
      };
    }
    if (id === "projects") return { title: "Projects", body: <ProjectsWindow onOpen={openWindow} /> };
    if (id === "about") return { title: "About", body: <AboutWindow /> };
    if (id === "contact") return { title: "Contact", body: <ContactWindow /> };
    const project = PROJECTS.find((p) => `project:${p.id}` === id);
    return { title: project.name, body: <ProjectWindow project={project} /> };
  }

  return (
    <div className="desktop">
      <Wallpaper />

      <nav className="menubar" aria-label="Menu">
        <div className="menu-left">
          <span className="mark" aria-hidden="true">H</span>
          <button className="menu-title" onClick={() => openWindow("about")}>Hariom's Portfolio</button>
          <button onClick={() => openWindow("projects")}>Projects</button>
          <button onClick={() => openWindow("contact")}>Contact</button>
          <a href={RESUME_URL} target="_blank" rel="noreferrer">Resume</a>
        </div>
        <div className="menu-right">
          <Wifi size={14} aria-hidden="true" />
          <time>{clock}</time>
        </div>
      </nav>

      <div className="hero">
        <p>Hello, I'm</p>
        <h1>Hariom Jha</h1>
        <p>Software engineer building full-stack web and mobile apps</p>
      </div>

      <div className="icons">
        {PROJECTS.map((project) => (
          <button key={project.id} className="icon" onClick={() => openWindow(`project:${project.id}`)}>
            <ProjectFolderIcon />
            <span>{project.name}</span>
          </button>
        ))}
        <a className="icon" href={RESUME_URL} target="_blank" rel="noreferrer">
          <FileText size={44} strokeWidth={1.2} fill="#f4f6fb" color="#9aa7c7" aria-hidden="true" />
          <span>Resume.pdf</span>
        </a>
      </div>

      {Object.entries(windows).map(([id, win]) => {
        const { title, icon, body } = windowContent(id);
        return (
          <Window
            key={id}
            win={win}
            title={title}
            icon={icon}
            onClose={() => closeWindow(id)}
            onFocus={() => focusWindow(id)}
            onMove={(x, y) => updateWindow(id, { x, y })}
            onToggleMaximize={() => updateWindow(id, { maximized: !win.maximized })}
          >
            {body}
          </Window>
        );
      })}

      <nav className="dock" aria-label="Dock">
        {dockItems.map((item) => (
          <button key={item.id} className="dock-item" aria-label={item.label} title={item.label} onClick={() => openWindow(item.id)}>
            <span className={`dock-icon ${item.tone}`}>
              <item.icon size={22} aria-hidden="true" />
            </span>
            {windows[item.id] && <i className="running" />}
          </button>
        ))}
        <a className="dock-item" href={RESUME_URL} target="_blank" rel="noreferrer" aria-label="Resume" title="Resume">
          <span className="dock-icon amber">
            <FileText size={22} aria-hidden="true" />
          </span>
        </a>
        <button className="dock-ask" onClick={() => openWindow("ask")}>
          <Sparkles size={18} aria-hidden="true" />
          Ask Me
          {windows.ask && <i className="running" />}
        </button>
      </nav>
    </div>
  );
}
