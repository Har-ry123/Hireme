import { useEffect, useRef, useState } from "react";
import { ExternalLink, FileText, Folder, Mail, Sparkles, UserRound, Wifi } from "lucide-react";
import { askQuestion } from "./api.js";
import { ABOUT, CONTACT_LINKS, DEFAULT_CANDIDATE, PROJECTS } from "./candidate.js";
import Chat from "./Chat.jsx";
import ResumeWindow from "./ResumeWindow.jsx";
import Window from "./Window.jsx";

const STORAGE_KEY = "hiremeai.chat";
const PHONE_WIDTH = 800;
const MENU_BAR_HEIGHT = 28;
const DOCK_SPACE = 104;
const DOCK_REACH = 130;
const DOCK_ZOOM = 0.6;
const DOCK_ASK_ZOOM = 0.15;
const BOOT_KEY = "hiremeai.booted";
const BOOT_MS = 1700;
const BOOT_FADE_MS = 400;
const TYPE_MS = 65;
const DELETE_MS = 30;
const HOLD_MS = 1500;
const ROLES = ["full-stack web apps", "React Native mobile apps", "AI-powered tools"];

const SIZES = {
  ask: { width: 430, height: 590 },
  projects: { width: 700, height: 300 },
  about: { width: 540, height: 600 },
  contact: { width: 420, height: 330 },
  project: { width: 640, height: 640 },
  resume: { width: 640, height: 760 },
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

// Moves the soft light that follows the pointer across the wallpaper
function followPointer(event) {
  event.currentTarget.style.setProperty("--pointer-x", `${event.clientX}px`);
  event.currentTarget.style.setProperty("--pointer-y", `${event.clientY}px`);
}

function shouldBoot() {
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    // Only on the first visit in a tab, so that reloading isn't slowed down
    if (sessionStorage.getItem(BOOT_KEY)) return false;
    sessionStorage.setItem(BOOT_KEY, "1");
  } catch {
    // Storage can be blocked: still show the boot screen
  }
  return true;
}

function BootScreen() {
  const [phase, setPhase] = useState(() => (shouldBoot() ? "loading" : "done"));

  useEffect(() => {
    if (phase === "done") return undefined;
    const delay = phase === "loading" ? BOOT_MS : BOOT_FADE_MS;
    const timer = setTimeout(() => setPhase(phase === "loading" ? "fading" : "done"), delay);
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === "done") return null;
  return (
    <div className={`boot ${phase}`} role="status" aria-label="Loading">
      <div className="boot-mark" aria-hidden="true">H</div>
      <div className="boot-bar" aria-hidden="true"><i /></div>
    </div>
  );
}

function Dock({ children }) {
  const dock = useRef(null);

  // Items grow near the pointer, and their margins push the neighbours aside
  function magnify(event) {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    for (const item of dock.current.children) {
      const box = item.getBoundingClientRect();
      const distance = Math.abs(event.clientX - (box.left + box.width / 2));
      const closeness = Math.max(0, 1 - distance / DOCK_REACH);
      const scale = 1 + closeness * closeness * (item.classList.contains("dock-ask") ? DOCK_ASK_ZOOM : DOCK_ZOOM);
      item.style.setProperty("--scale", scale);
      item.style.setProperty("--push", `${((scale - 1) * item.offsetWidth) / 2}px`);
    }
  }

  function reset() {
    for (const item of dock.current.children) {
      item.style.removeProperty("--scale");
      item.style.removeProperty("--push");
    }
  }

  return (
    <nav className="dock" aria-label="Dock" ref={dock} onMouseMove={magnify} onMouseLeave={reset}>
      {children}
    </nav>
  );
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
          <stop offset="0" stopColor="#060818" />
          <stop offset="0.5" stopColor="#0b1140" />
          <stop offset="1" stopColor="#12062e" />
        </linearGradient>
        <linearGradient id="silk1" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#1226a8" stopOpacity="0" />
          <stop offset="0.45" stopColor="#2f5bff" stopOpacity="0.9" />
          <stop offset="0.8" stopColor="#47c6ff" />
          <stop offset="1" stopColor="#c6f1ff" />
        </linearGradient>
        <linearGradient id="silk2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff4fb8" stopOpacity="0.95" />
          <stop offset="0.5" stopColor="#7a3dff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#140a55" />
        </linearGradient>
        <linearGradient id="silk3" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#0b0f3f" />
          <stop offset="1" stopColor="#3a1aa8" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="edge" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0.1" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.75" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <rect width="1600" height="1000" fill="url(#sky)" />
      <g className="drift-a">
        <path d="M-60 1040 C 420 960 640 690 880 430 C 1060 240 1260 80 1680 -40 L1680 1040 Z" fill="url(#silk1)" />
        <path d="M-60 1040 C 420 960 640 690 880 430 C 1060 240 1260 80 1680 -40" fill="none" stroke="url(#edge)" strokeWidth="3" />
      </g>
      <g className="drift-b">
        <path d="M200 1040 C 640 930 860 720 1120 520 C 1290 390 1470 320 1680 290 L1680 1040 Z" fill="url(#silk2)" />
        <path d="M200 1040 C 640 930 860 720 1120 520 C 1290 390 1470 320 1680 290" fill="none" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="2" />
      </g>
      <path d="M520 1040 C 880 980 1120 840 1680 640 L1680 1040 Z" fill="url(#silk3)" />
    </svg>
  );
}

function ProjectFolderIcon() {
  return (
    <svg className="folder-icon" viewBox="0 0 64 52" aria-hidden="true">
      <defs>
        <linearGradient id="folderBack" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3aa6ff" />
          <stop offset="1" stopColor="#1668e3" />
        </linearGradient>
        <linearGradient id="folderFront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fdcff" />
          <stop offset="1" stopColor="#2f8cf5" />
        </linearGradient>
      </defs>
      <path d="M4 8a5 5 0 0 1 5-5h14l6 6h26a5 5 0 0 1 5 5v30a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Z" fill="url(#folderBack)" />
      <path d="M4 18a4 4 0 0 1 4-4h48a4 4 0 0 1 4 4v26a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Z" fill="url(#folderFront)" />
      <path d="M8 15h48a3 3 0 0 1 3 3" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1" />
    </svg>
  );
}

function ResumeIcon() {
  return (
    <svg className="folder-icon" viewBox="0 0 52 62" aria-hidden="true">
      <path d="M7 1h27l17 17v38a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V6a5 5 0 0 1 5-5Z" fill="#f5f7fc" />
      <path d="M34 1l17 17H39a5 5 0 0 1-5-5Z" fill="#c3cce0" />
      <rect x="10" y="27" width="32" height="3" rx="1.5" fill="#9aa7c7" />
      <rect x="10" y="35" width="32" height="3" rx="1.5" fill="#b6c0d8" />
      <rect x="10" y="43" width="20" height="3" rx="1.5" fill="#b6c0d8" />
    </svg>
  );
}

const prefersLessMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function useTypewriter(words) {
  const [text, setText] = useState(() => (prefersLessMotion() ? words[0] : ""));

  useEffect(() => {
    if (prefersLessMotion()) return undefined;
    let word = 0;
    let length = 0;
    let deleting = false;
    let timer;
    function step() {
      length += deleting ? -1 : 1;
      setText(words[word].slice(0, length));
      let delay = deleting ? DELETE_MS : TYPE_MS;
      if (!deleting && length === words[word].length) {
        deleting = true;
        delay = HOLD_MS;
      } else if (deleting && length === 0) {
        deleting = false;
        word = (word + 1) % words.length;
      }
      timer = setTimeout(step, delay);
    }
    timer = setTimeout(step, TYPE_MS);
    return () => clearTimeout(timer);
  }, [words]);

  return text;
}

// Scattered with a fixed pattern, so the stars don't jump between renders
function starField(count, offset) {
  return Array.from({ length: count }, (_, index) => {
    const x = ((index + offset) * 61.8) % 100;
    const y = ((index + offset) * 37.3) % 100;
    return `${x.toFixed(1)}vw ${y.toFixed(1)}vh 0 ${index % 5 === 0 ? 1 : 0}px #fff`;
  }).join(",");
}

const STARS_A = starField(70, 1);
const STARS_B = starField(45, 200);

function Stars() {
  return (
    <>
      <i className="stars" style={{ boxShadow: STARS_A }} aria-hidden="true" />
      <i className="stars slow" style={{ boxShadow: STARS_B }} aria-hidden="true" />
    </>
  );
}

function tiltCard(event) {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const box = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty("--tilt-x", `${((event.clientY - box.top) / box.height - 0.5) * -12}deg`);
  event.currentTarget.style.setProperty("--tilt-y", `${((event.clientX - box.left) / box.width - 0.5) * 12}deg`);
}

function resetCard(event) {
  event.currentTarget.style.removeProperty("--tilt-x");
  event.currentTarget.style.removeProperty("--tilt-y");
}

function Hero({ onAsk, onProjects, onOpenProject }) {
  const role = useTypewriter(ROLES);

  return (
    <div className="hero">
      <p className="hero-status">
        <i aria-hidden="true" />
        Seeking SDE and full-stack roles
      </p>
      <h1>Hariom Jha</h1>
      <p className="hero-role" aria-label={`I build ${ROLES.join(", ")}`}>
        <span aria-hidden="true">
          I build <em>{role}</em><b className="caret" />
        </span>
      </p>
      <div className="hero-actions">
        <button className="cta primary" onClick={onAsk}>
          <Sparkles size={17} aria-hidden="true" />
          Ask my AI
        </button>
        <button className="cta" onClick={onProjects}>View projects</button>
      </div>
      <div className="showcase">
        {PROJECTS.map((project) => (
          <button
            key={project.id}
            className="showcase-card"
            onClick={() => onOpenProject(`project:${project.id}`)}
            onMouseMove={tiltCard}
            onMouseLeave={resetCard}
          >
            <span className="showcase-bar" aria-hidden="true"><i /><i /><i /></span>
            <img src={project.image} alt="" />
            <span className="showcase-name">{project.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ProjectsWindow({ onOpen }) {
  return (
    <div className="finder">
      {PROJECTS.map((project) => (
        <button key={project.id} onClick={() => onOpen(`project:${project.id}`)}>
          <img src={project.image} alt="" loading="lazy" />
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
      <img className="project-shot" src={project.image} alt={`Screenshot of ${project.name}`} />
      <p className="meta">{project.date}</p>
      <h3>{project.name}</h3>
      <p className="stack">{project.stack}</p>
      <ul>
        {project.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      {project.github && (
        <a className="project-link" href={project.github} target="_blank" rel="noreferrer">
          <ExternalLink size={14} aria-hidden="true" />
          View on GitHub
        </a>
      )}
    </div>
  );
}

function AboutWindow() {
  return (
    <div className="document">
      <h3>{DEFAULT_CANDIDATE.name}</h3>
      <p>{ABOUT.summary}</p>
      <h4>Timeline</h4>
      <ol className="timeline">
        {ABOUT.timeline.map((item) => (
          <li key={item.title}>
            <strong>{item.title}</strong>
            <span>{item.place}</span>
            <small>{item.date}</small>
          </li>
        ))}
      </ol>
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

  useEffect(() => {
    // Keeps windows on screen when the browser gets narrower
    function keepOnScreen() {
      setWindows((all) =>
        Object.fromEntries(
          Object.entries(all).map(([id, win]) => [
            id,
            { ...win, x: Math.min(win.x, Math.max(window.innerWidth - win.width - 16, 16)) },
          ]),
        ),
      );
    }
    window.addEventListener("resize", keepOnScreen);
    return () => window.removeEventListener("resize", keepOnScreen);
  }, []);

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
    { id: "resume", label: "Resume", icon: FileText, tone: "amber" },
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
    if (id === "resume") return { title: "Resume.pdf", body: <ResumeWindow /> };
    const project = PROJECTS.find((p) => `project:${p.id}` === id);
    return { title: project.name, body: <ProjectWindow project={project} /> };
  }

  return (
    <div className="desktop" onMouseMove={followPointer}>
      <Wallpaper />

      <nav className="menubar" aria-label="Menu">
        <div className="menu-left">
          <span className="mark" aria-hidden="true">H</span>
          <button className="menu-title" onClick={() => openWindow("about")}>Hariom's Portfolio</button>
          <button onClick={() => openWindow("projects")}>Projects</button>
          <button onClick={() => openWindow("contact")}>Contact</button>
          <button onClick={() => openWindow("resume")}>Resume</button>
        </div>
        <div className="menu-right">
          <Wifi size={14} aria-hidden="true" />
          <time>{clock}</time>
        </div>
      </nav>

      <Stars />
      <div className="glow one" aria-hidden="true" />
      <div className="glow two" aria-hidden="true" />
      <div className="cursor-glow" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />

      <Hero onAsk={() => openWindow("ask")} onProjects={() => openWindow("projects")} onOpenProject={openWindow} />

      <div className="icons">
        {PROJECTS.map((project) => (
          <button key={project.id} className="icon" onClick={() => openWindow(`project:${project.id}`)}>
            <ProjectFolderIcon />
            <span>{project.name}</span>
          </button>
        ))}
        <button className="icon" onClick={() => openWindow("resume")}>
          <ResumeIcon />
          <span>Resume.pdf</span>
        </button>
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

      <Dock>
        {dockItems.map((item) => (
          <button key={item.id} className="dock-item" aria-label={item.label} data-label={item.label} onClick={() => openWindow(item.id)}>
            <span className={`dock-icon ${item.tone}`}>
              <item.icon size={22} aria-hidden="true" />
            </span>
            {windows[item.id] && <i className="running" />}
          </button>
        ))}
        <button className="dock-ask" onClick={() => openWindow("ask")}>
          <Sparkles size={18} aria-hidden="true" />
          Ask Me
          {windows.ask && <i className="running" />}
        </button>
      </Dock>

      <BootScreen />
    </div>
  );
}
