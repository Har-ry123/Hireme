from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import os

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

# Add your resume parsing / AI endpoint here
@post("/analyze")
async def analyze_resume(file: UploadFile = File(...)):
    # Your resume parsing logic with Groq goes here
    return {"filename": file.filename, "status": "Processed successfully"}