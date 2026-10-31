import logging
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from groq import GroqError, RateLimitError

# An explicit path, because load_dotenv() would otherwise search parent folders and could load another project's keys
load_dotenv(Path(__file__).parent.parent / ".env")

import llm
import vector_store
from document_parser import SUPPORTED_EXTENSIONS, DocumentError, extract_text
from profile_store import load_profile
from schemas import AnalyzeResponse, ChatRequest

logger = logging.getLogger(__name__)

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
RATE_LIMIT_MESSAGE = "The AI has reached its usage limit for now. Please try again later."

app = FastAPI(title="HireMeAI API")

# Enable CORS so your Vercel frontend can talk to this Render backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace "*" with your Vercel frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to HireMeAI Backend!"}

# Plain def, not async: parsing, Groq and Qdrant all block, so FastAPI runs these in a thread pool
@app.post("/analyze", response_model=AnalyzeResponse)
def analyze_resume(file: UploadFile = File(...)):
    filename = file.filename or ""
    if not filename.lower().endswith(SUPPORTED_EXTENSIONS):
        raise HTTPException(status_code=415, detail="Unsupported file type. Upload a PDF or DOCX.")

    data = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File is larger than the 10 MB limit.")

    try:
        text = extract_text(filename, data)
    except DocumentError as e:
        raise HTTPException(status_code=422, detail=str(e))

    try:
        result = llm.analyze_resume_text(text)
    except KeyError:
        logger.exception("Missing configuration")
        raise HTTPException(status_code=503, detail="The analysis service is not configured.")
    except RateLimitError:
        raise HTTPException(status_code=429, detail=RATE_LIMIT_MESSAGE)
    except (GroqError, llm.AnalysisError):
        logger.exception("Resume analysis failed")
        raise HTTPException(status_code=502, detail="The analysis service failed. Try again.")

    resume_id = vector_store.resume_id_for(data)
    indexed = True
    try:
        vector_store.store_resume(resume_id, text)
    except Exception:
        # The analysis is what was asked for, so a vector store outage shouldn't throw it away
        logger.exception("Could not index resume %s", resume_id)
        indexed = False

    return AnalyzeResponse(
        resume_id=resume_id,
        filename=filename,
        indexed=indexed,
        resume=result.resume,
        analysis=result.analysis,
    )

@app.post("/chat")
def chat(request: ChatRequest):
    try:
        chunks = vector_store.search_resume(request.resume_id, request.question)
    except KeyError:
        logger.exception("Missing configuration")
        raise HTTPException(status_code=503, detail="The search service is not configured.")
    except Exception:
        logger.exception("Could not search resume %s", request.resume_id)
        raise HTTPException(status_code=502, detail="The search service failed. Try again.")

    if not chunks:
        raise HTTPException(status_code=404, detail="Resume not found. Upload it to /analyze first.")

    try:
        answer = llm.stream_answer(request.question, chunks, load_profile(request.resume_id))
    except KeyError:
        logger.exception("Missing configuration")
        raise HTTPException(status_code=503, detail="The analysis service is not configured.")
    except RateLimitError:
        raise HTTPException(status_code=429, detail=RATE_LIMIT_MESSAGE)
    except GroqError:
        logger.exception("Chat answer failed")
        raise HTTPException(status_code=502, detail="The analysis service failed. Try again.")

    # X-Accel-Buffering stops proxies from holding the text back until the answer is complete
    return StreamingResponse(
        answer,
        media_type="text/plain; charset=utf-8",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
