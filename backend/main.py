from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from llama_parser import parse_pdf

from gemini_utils import (
    extract_transactions,
    normalize_currencies,
    check_data_integrity,
    analyze_signals,
    score_loan_applicant,
    summarize_statement
)
from dotenv import load_dotenv
import os
from fastapi.responses import JSONResponse
import uuid
import google.generativeai as genai

from typing import Dict, Any

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
app = FastAPI()
print("GEMINI_API_KEY loaded:", os.getenv("GEMINI_API_KEY"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],  # Frontend port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

session_progress: Dict[str, int] = {}
session_results: Dict[str, Dict[str, Any]] = {}

@app.post("/analyze")
async def analyze(file: UploadFile = File(...), loan_amount: float = Form(...)):
    session_id = str(uuid.uuid4())
    session_progress[session_id] = 0

    # Step 1: Understanding Format (parse PDF → raw text)
    session_progress[session_id] = 1
    contents = await file.read()
    parsed_text = parse_pdf(contents)

    # Step 2: Transaction Extraction
    session_progress[session_id] = 2
    transactions = extract_transactions("\n\n".join(parsed_text))

    # Step 3: Currency Mapping
    session_progress[session_id] = 3
    normalized_data = normalize_currencies(transactions)

    # Step 4: Data Integrity Checks
    session_progress[session_id] = 4
    data_issues = check_data_integrity(normalized_data)

    # Step 5: Financial Signal Analysis
    session_progress[session_id] = 5
    analysis_summary = analyze_signals(normalized_data)

    # Step 6: Insight Generation (loan score)
    session_progress[session_id] = 6
    loan_score = score_loan_applicant(normalized_data, analysis_summary, loan_amount)
    summary_paragraph = summarize_statement(normalized_data)

    # Step 7: Report Ready
    session_progress[session_id] = 7

    return {
        "session_id": session_id,
        "loan_amount_requested": loan_amount,
        "parsed_text": parsed_text,
        "transactions": transactions,
        "normalized_data": normalized_data,
        "data_issues": data_issues,
        "analysis_summary": analysis_summary,
        "loan_score": loan_score,
        "summary_paragraph": summary_paragraph,
        "status": "success"
    }

@app.get("/progress/{session_id}")
async def get_progress(session_id: str):
    current_step = session_progress.get(session_id, 0)
    return {"current_step": current_step}