# HireMeAI

FastAPI backend that analyzes resumes. Upload a PDF or DOCX and get back the parsed resume and a scored assessment from Groq. Each resume is also stored in Qdrant so you can ask questions about it.

## Setup

Requires [uv](https://docs.astral.sh/uv/). It installs Python 3.11 and the dependencies for you.

```bash
uv sync
cp .env.example .env
```

Fill in `.env`:

| Variable | Required | Value |
| --- | --- | --- |
| `GROQ_API_KEY` | Yes | Your Groq API key |
| `QDRANT_URL` | Yes | Your Qdrant Cloud cluster URL |
| `QDRANT_API_KEY` | Yes | Your Qdrant Cloud API key |
| `GROQ_MODEL` | No | Overrides the default model, `openai/gpt-oss-120b` |

`.env` is gitignored. Never commit it.

## Run

```bash
uv run uvicorn main:app --reload
```

The API runs at http://127.0.0.1:8000, with interactive docs at http://127.0.0.1:8000/docs.

The first upload takes longer because the embedding model (about 70 MB) is downloaded and cached.

## API

### `POST /analyze`

Takes a multipart upload in the `file` field: a PDF or DOCX of up to 10 MB.

```bash
curl -F "file=@backend/HarryLatest.pdf" http://127.0.0.1:8000/analyze
```

```json
{
  "resume_id": "3f1c...",
  "filename": "HarryLatest.pdf",
  "indexed": true,
  "resume": { "name": "...", "skills": [], "experiences": [], "education": [], "projects": [], "certifications": [] },
  "analysis": { "summary": "...", "score": 78, "strengths": [], "weaknesses": [], "suggestions": [] }
}
```

`indexed` is `false` if Qdrant couldn't store the resume. The analysis is still valid, but `/chat` won't work for that resume until it's uploaded again.

| Status | Meaning |
| --- | --- |
| 413 | File is over 10 MB |
| 415 | File isn't a PDF or DOCX |
| 422 | File is corrupt, password-protected, or has no extractable text (for example, a scanned resume) |
| 502 | Groq failed or returned an invalid answer |
| 503 | `GROQ_API_KEY` is missing |

### `POST /chat`

Answers a question using the parts of an analyzed resume that best match it.

```bash
curl -H "Content-Type: application/json" -d "{\"resume_id\": \"3f1c...\", \"question\": \"What are the candidate's main skills?\"}" http://127.0.0.1:8000/chat
```

Returns `{"answer": "..."}`, or 404 if that `resume_id` hasn't been stored.

## Project layout

| File | Purpose |
| --- | --- |
| `main.py` | App entry point and routes |
| `document_parser.py` | PDF and DOCX text extraction |
| `llm.py` | Groq calls |
| `vector_store.py` | Embeddings (fastembed) and Qdrant storage and search |
| `schemas.py` | Pydantic request and response models |
| `backend/main.py` | Earlier prototype, not used by the app |

## Deployment

The code comments assume Render for this backend and Vercel for the frontend. Neither is configured in this repo yet. On Render, set the `.env` variables in the service's environment, and use this start command:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

`backend/requirements.txt` lists the same dependencies as `pyproject.toml` for hosts that install with pip.
