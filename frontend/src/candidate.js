// The resume the site opens on. resume_id comes from POST /analyze and is the same every time for the same file.
export const DEFAULT_CANDIDATE = {
  resumeId: "c4c83b44-220e-5e37-a8f5-e1a7b21c3b6f",
  name: "Hariom Jha",
  tagline: "Software Intern at boAt R&D, building full-stack web and mobile apps.",
  highlights: [
    { value: 200, suffix: "+", label: "LeetCode problems solved" },
    { value: 35, suffix: "%", label: "faster page load delivered" },
    { value: 500, suffix: "+", label: "live records managed" },
    { value: 2, suffix: "", label: "software internships" },
  ],
  skills: [
    "React Native",
    "ReactJS",
    "NodeJS",
    "ExpressJS",
    "MongoDB",
    "Java",
    "Python",
    "JavaScript",
    "Flask",
    "SQL",
    "RESTful APIs",
    "Data Structures & Algorithms",
  ],
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
