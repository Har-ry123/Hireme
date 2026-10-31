// The resume the site opens on. resume_id comes from POST /analyze and is the same every time for the same file.
export const DEFAULT_CANDIDATE = {
  resumeId: "c4c83b44-220e-5e37-a8f5-e1a7b21c3b6f",
  name: "Hariom Jha",
};

export const RESUME_URL = "/Hariom-Jha-Resume.pdf";

export const STATS = [{ value: 200, suffix: "+", label: "LeetCode solved" }];

export const CONTACT_LINKS = [
  { label: "Email", value: "hariomjha100@gmail.com", href: "mailto:hariomjha100@gmail.com" },
  { label: "LinkedIn", value: "linkedin.com/in/hariomjha", href: "https://linkedin.com/in/hariomjha" },
  { label: "GitHub", value: "github.com/Har-ry123", href: "https://github.com/Har-ry123" },
  { label: "LeetCode", value: "leetcode.com/u/Hariom_z", href: "https://leetcode.com/u/Hariom_z/" },
];

export const PROJECTS = [
  {
    id: "smart-ai-assistant",
    image: "/projects/smart-ai-assistant.webp",
    name: "Smart AI Assistant",
    date: "Jan 2026",
    stack: "HTML, Java, Canvas API, Ollama",
    github: "https://github.com/Har-ry123/Own-Ai-Assistant",
    points: [
      "Engineered a vector-based search engine using HNSW, KD-Tree and brute-force algorithms.",
      "Architected a modular backend separating training, inference and API layers.",
      "Developed an interactive interface with real-time query visualization and sub-second response latency.",
    ],
  },
  {
    id: "wanderlust",
    image: "/projects/wanderlust.webp",
    name: "WanderLust",
    date: "Oct 2025",
    stack: "HTML/CSS, JavaScript, NodeJS, ExpressJS, Mapbox, MongoDB",
    github: "https://github.com/Har-ry123/WanderLust-Latest",
    points: [
      "Developed a full-stack MVC travel planning platform with dynamic maps.",
      "Integrated Mapbox APIs for geolocation tracking, spatial queries and route visualization.",
      "Engineered secure RESTful backend services using ExpressJS and MongoDB.",
    ],
  },
  {
    id: "shareplate",
    image: "/projects/shareplate.webp",
    name: "SharePlate",
    date: "Feb 2025 – Mar 2025",
    stack: "HTML/CSS, JavaScript, ReactJS, ExpressJS, EJS, MongoDB",
    points: [
      "Launched a full-stack food donation platform with multi-role authentication.",
      "Developed RESTful APIs and MongoDB schemas managing 500+ live records.",
      "Reduced overall page load time by 35%.",
    ],
  },
];

export const ABOUT = {
  summary:
    "Computer Science undergraduate and aspiring Software Engineer with hands-on experience building full-stack web applications, mobile apps and scalable software systems.",
  timeline: [
    { title: "Software Intern", place: "boAt R&D", date: "Sep 2026 – Present" },
    { title: "Smart AI Assistant", place: "Project", date: "Jan 2026" },
    { title: "WanderLust", place: "Project", date: "Oct 2025" },
    { title: "Web Developer", place: "Internship Studio, built SharePlate", date: "Feb 2025 – Mar 2025" },
    { title: "B.Tech in Computer Science and Engineering", place: "Kalinga Institute of Industrial Technology, CGPA 7.83", date: "2022 – 2026" },
  ],
  skills: "Java, C, Python, JavaScript, SQL, ReactJS, React Native, NodeJS, ExpressJS, Flask, MongoDB, Git",
  achievements: "200+ LeetCode problems solved, and the 50 Days Coding Badge.",
};

export const HR_QUESTIONS = [
  {
    title: "About you",
    questions: [
      "Tell me about yourself.",
      "Where is your hometown?",
      "Where do you live now?",
      "Tell me about your family background.",
      "What languages do you speak?",
      "What are your hobbies?",
    ],
  },
  {
    title: "Motivation",
    questions: [
      "Why should I hire you?",
      "Why did you choose software engineering?",
      "What kind of company and role are you looking for?",
      "Where do you see yourself in five years?",
      "What motivates you?",
    ],
  },
  {
    title: "Strengths and weaknesses",
    questions: [
      "What are your greatest strengths?",
      "What is your biggest weakness?",
      "Tell me about a failure and what you learned from it.",
      "How do you handle pressure and deadlines?",
      "Tell me about a conflict and how you handled it.",
      "What is your proudest achievement?",
    ],
  },
  {
    title: "Resume and experience",
    questions: [
      "Walk me through your resume.",
      "What is your work experience?",
      "Explain your main projects.",
      "What are your technical skills?",
      "What is your educational background?",
      "What certifications do you have?",
    ],
  },
  {
    title: "Practical details",
    questions: [
      "What are your salary expectations?",
      "What is your notice period, and when can you start?",
      "Are you willing to relocate?",
      "Can you work shifts, on-site or remotely?",
      "Do you have any career gaps?",
    ],
  },
];
