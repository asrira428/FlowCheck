from fastapi import FastAPI, File, UploadFile, Form, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from llama_parser import parse_pdf

from gemini_utils import (
    extract_transactions,
    normalize_currencies,
    check_data_integrity,
    analyze_signals,
    score_loan_applicant,
    summarize_statement,
    category_spending
)
from dotenv import load_dotenv
import os
from fastapi.responses import JSONResponse
import uuid
import google.generativeai as genai

from typing import Dict, Any, List

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

def run_analysis_in_background(
    session_id: str,
    file_bytes: bytes,
    requested_amount: float,
):
    """
    This function runs in a background thread. It runs all 7 steps,
    updating session_progress[session_id] from 0→7 as each step finishes.
    Finally, it stores the complete JSON in session_results[session_id].
    """
    try:
        # Step 1
        session_progress[session_id] = 1
        # parse_pdf returns a List[str] (one entry per page)
        from llama_parser import parse_pdf
        parsed_text: List[str] = parse_pdf(file_bytes)

        # Step 2
        session_progress[session_id] = 2
        transactions = extract_transactions("\n\n".join(parsed_text))

        # Step 3
        session_progress[session_id] = 3
        normalized_data = normalize_currencies("\n".join(
            f"{tx['description']} || {tx['currency']} || {tx['amount']} || {tx['direction']} || {tx['balance'] or 'NULL'} || {tx.get('month') or 'NULL'}"
            for tx in transactions
        ))

        # Step 4
        session_progress[session_id] = 4
        data_issues = check_data_integrity(normalized_data)

        # Step 5
        session_progress[session_id] = 5
        analysis_summary = analyze_signals(normalized_data)

        # Step 6
        session_progress[session_id] = 6
        loan_score = score_loan_applicant(normalized_data, analysis_summary, requested_amount)
        summary_paragraph = summarize_statement(normalized_data, analysis_summary, loan_score)
        categories = category_spending(normalized_data)

        # Step 7 (final)
        session_progress[session_id] = 7

        # Build the final JSON payload exactly as your old /analyze did:
        final_payload = {
            "session_id": session_id,
            "loan_amount_requested": requested_amount,
            "parsed_text": parsed_text,
            "transactions": transactions,
            "normalized_data": normalized_data,
            "data_issues": data_issues,
            "analysis_summary": analysis_summary,
            "loan_score": loan_score,
            "summary_paragraph": summary_paragraph,
            "spending_by_category": categories,
            "status": "success",
        }
        session_results[session_id] = final_payload

    except Exception as e:
        # If anything goes wrong, mark progress as -1 (error) and store error message
        session_progress[session_id] = -1
        session_results[session_id] = {
            "session_id": session_id,
            "error": str(e),
            "status": "failed",
        }


@app.post("/analyze")
async def analyze(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    loan_amount: float = Form(...),
):
    """
    Kick off the 7‐step pipeline in the background and immediately return session_id.
    The frontend will poll /progress/{session_id} and when it's 7, it can GET /results/{session_id}.
    """
    session_id = str(uuid.uuid4())
    session_progress[session_id] = 0

    contents = await file.read()

    # Schedule the background task, passing file bytes and requested amount
    background_tasks.add_task(run_analysis_in_background, session_id, contents, loan_amount)

    return {"session_id": session_id}


@app.get("/progress/{session_id}")
async def get_progress(session_id: str):
    """
    Return the current step (0–7) or -1 if error, or 404 if unknown session_id.
    """
    if session_id not in session_progress:
        raise HTTPException(status_code=404, detail="Unknown session_id")
    return {"current_step": session_progress[session_id]}


@app.get("/results/{session_id}")
async def get_results(session_id: str):
    """
    Once progress === 7, the frontend calls this to get the final JSON payload.
    """
    if session_id not in session_results:
        raise HTTPException(status_code=404, detail="Results not ready")
    return session_results[session_id]