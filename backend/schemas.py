from pydantic import BaseModel, Field


class Experience(BaseModel):
    company: str | None = None
    role: str | None = None
    duration: str | None = None
    description: str | None = None
    skills_used: list[str] = []


class Resume(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None

    total_experience_years: float | None = None

    skills: list[str] = []
    experiences: list[Experience] = []
    education: list[str] = []
    projects: list[str] = []
    certifications: list[str] = []


class Analysis(BaseModel):
    summary: str
    score: int = Field(ge=0, le=100, description="Overall resume quality from 0 to 100")
    strengths: list[str] = []
    weaknesses: list[str] = []
    suggestions: list[str] = []


class ResumeAnalysis(BaseModel):
    resume: Resume
    analysis: Analysis


class AnalyzeResponse(ResumeAnalysis):
    resume_id: str
    filename: str
    # False when Qdrant could not store the resume: the analysis is still valid, but /chat won't work for it
    indexed: bool


class ChatRequest(BaseModel):
    resume_id: str
    question: str = Field(min_length=1)
