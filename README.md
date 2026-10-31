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
| `frontend/` | React chat interface (Vite) |
| `backend/main.py` | Earlier prototype, not used by the app |

## Deployment

The backend runs on Render and the frontend on Vercel.

### Backend (Render)

| Setting | Value |
| --- | --- |
| Root Directory | Leave blank, so that the root `main.py` runs and not `backend/main.py` |
| Build Command | `pip install -r backend/requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Environment | `GROQ_API_KEY`, `QDRANT_URL`, `QDRANT_API_KEY` |

### Frontend (Vercel)

| Setting | Value |
| --- | --- |
| Root Directory | `frontend` |
| Framework Preset | Vite |
| Environment | `VITE_API_URL` set to your Render URL |

To open the site on one resume so that visitors can chat without uploading, also set `VITE_DEFAULT_RESUME_ID` to the `resume_id` from `POST /analyze`, and `VITE_CANDIDATE_NAME` to the name to show. Redeploy after changing any `VITE_` variable, because they're built into the site.
