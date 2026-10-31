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
uv run uvicorn main:app --app-dir backend --reload
```

The API runs at http://127.0.0.1:8000, with interactive docs at http://127.0.0.1:8000/docs.

The first upload takes longer because the embedding model (about 70 MB) is downloaded and cached.

To run the frontend, use a second terminal. It expects the API at http://127.0.0.1:8000 unless `VITE_API_URL` says otherwise.

```bash
cd frontend
npm install
npm run dev
```

The site runs at http://localhost:5173.

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
| 429 | Both Groq models reached a rate limit. Per-minute limits clear quickly, and daily limits can take hours |
| 413 | File is over 10 MB |
| 415 | File isn't a PDF or DOCX |
| 422 | File is corrupt, password-protected, or has no extractable text (for example, a scanned resume) |
| 502 | Groq failed or returned an invalid answer |
| 503 | `GROQ_API_KEY` is missing |

### `POST /chat`

Answers a question using the parts of an analyzed resume that best match it, plus that candidate's HR profile if there is one. The answer streams back as plain text while it's being written, so use `curl -N` to watch it arrive.

```bash
curl -H "Content-Type: application/json" -d "{\"resume_id\": \"3f1c...\", \"question\": \"What are the candidate's main skills?\"}" http://127.0.0.1:8000/chat
```

Returns 404 if that `resume_id` hasn't been stored.

### HR profile

A resume doesn't cover questions like hometown, weakness or salary expectations. To answer them, fill in `backend/profiles/<resume_id>.md`. The answers apply only to that resume. Blank lines still get an answer: general questions, such as strengths or motivation, are reasoned from the resume. Personal facts, such as hometown or salary, and stories, such as a past conflict, are never made up: they get a general answer that points to the contact email. Anything you write there is public if the repo is public.

## Project layout

| File | Purpose |
| --- | --- |
| `backend/main.py` | App entry point and routes |
| `backend/document_parser.py` | PDF and DOCX text extraction |
| `backend/llm.py` | Groq calls |
| `backend/vector_store.py` | Embeddings (fastembed) and Qdrant storage and search |
| `backend/schemas.py` | Pydantic request and response models |
| `backend/profile_store.py`, `backend/profiles/` | The candidate's own HR answers |
| `backend/config.py` | Reads required settings |
| `frontend/` | React chat interface (Vite) |

## Deployment

The backend runs on Render and the frontend on Vercel.

### Backend (Render)

| Setting | Value |
| --- | --- |
| Root Directory | `backend` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Environment | `GROQ_API_KEY`, `QDRANT_URL`, `QDRANT_API_KEY` |

### Frontend (Vercel)

| Setting | Value |
| --- | --- |
| Root Directory | `frontend` |
| Framework Preset | Vite |
| Environment | `VITE_API_URL` set to your Render URL |

Redeploy after changing `VITE_API_URL`, because it's built into the site.

The site opens on the resume set in `frontend/src/candidate.js`. That resume must be uploaded once to `POST /analyze` on the deployed backend, so that it's stored in Qdrant.
