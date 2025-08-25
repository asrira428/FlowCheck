import google.generativeai as genai
import os
import json
from typing import List, Dict, Optional, Any
import re

# genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
# model = genai.GenerativeModel(model_name='models/gemini-1.5-flash')
model = genai.GenerativeModel(model_name='models/gemini-2.0-flash')

def extract_transactions(raw_text: str) -> List[Dict[str, Optional[float]]]:
    """
    STEP 1: EXTRACT RAW TRANSACTIONS (flexible, one‐line‐per‐transaction format, with currency)
    Input: the full concatenated text of any bank statement.
    Output: a Python list of dicts, each with keys:
      • "description" (string)
      • "currency" (string, e.g. "INR", "USD", "GBP", "AUD")
      • "amount" (float)
      • "direction" ("debit" or "credit")
      • "balance" (float or None)
      • "month" (int 1–12)

    We ask Gemini to output one transaction per line, in the format:
      DESCRIPTION || CURRENCY || AMOUNT || DIRECTION || BALANCE || MONTH

    Then we parse those lines.
    """
    prompt = f"""
You are a bank‐statement extraction expert. Below is the full text of a multi‐page bank statement 
(which may be from an Indian IDFC, a UK Lloyds, a US Bank, or an Australian Commonwealth Bank).
Extract each transaction row and output exactly one line per transaction in this format:

<DESCRIPTION> || <CURRENCY> || <AMOUNT> || <DIRECTION> || <BALANCE> || <MONTH>

Where:
- <DESCRIPTION> is a concise text (e.g. "IMPS Transfer – Oma Ram", "PANERA BREAD", "DIRECT DEBIT SGIO").
- <CURRENCY> is the three‐letter ISO code (e.g. "INR", "USD", "GBP", "AUD"), based on symbols or context in the statement.
- <AMOUNT> is a positive number (no currency symbols).
- <DIRECTION> is either "debit" or "credit".
- <BALANCE> is the running balance after that transaction, or the word NULL if no balance is shown.
- <MONTH> is the month number (1–12) of the transaction date.

Ignore any headers, footers, summary lines, page numbers, “Money In/Money Out” totals, etc.
Preserve the original order.

Here is the raw text:

{raw_text}
"""

    response = model.generate_content(prompt)
    raw = (response.text or "").strip()
    lines = [line.strip() for line in raw.splitlines() if line.strip()]

    transactions = []
    for line in lines:
        parts = [p.strip() for p in line.split("||")]
        if len(parts) != 6:
            # Skip any malformed line
            continue
        desc, curr_str, amt_str, dir_str, bal_str, month_str = parts

        currency = curr_str.upper()
        try:
            amount = float(amt_str.replace(",", ""))
        except:
            amount = None

        direction = dir_str.lower() if dir_str.lower() in ("debit", "credit") else None

        try:
            balance = float(bal_str.replace(",", "")) if bal_str.upper() != "NULL" else None
        except:
            balance = None

        try:
            month = int(month_str)
            if not (1 <= month <= 12):
                month = None
        except:
            month = None

        transactions.append({
            "description": desc,
            "currency": currency,
            "amount": amount,
            "direction": direction,
            "balance": balance,
            "month": month
        })
    return transactions

def normalize_currencies(raw_lines: str) -> List[Dict[str, Any]]:
    """
    STEP 2: CONVERT AMOUNT & BALANCE TO USD
    Input: a multiline string where each line is already in the format:
      DESCRIPTION || CURRENCY || AMOUNT || DIRECTION || BALANCE || MONTH

    Output: a Python list of dicts, each with:
      • "description" (string, unchanged)
      • "amount"      (float, converted into USD)
      • "direction"   (string, unchanged)
      • "balance"     (float or None, converted into USD)
      • "month"       (int, same as input)

    We ask Gemini to read each line and output exactly:
      DESCRIPTION || AMOUNT_USD || DIRECTION || BALANCE_USD || MONTH
    Then we parse it back into Python dicts.
    """

    prompt = f"""
You are a currency‐conversion assistant. Each line below represents one bank transaction in this format:

  DESCRIPTION || CURRENCY || AMOUNT || DIRECTION || BALANCE || MONTH

• DESCRIPTION is a short text describing the transaction.
• CURRENCY is a three‐letter code (e.g. INR, USD, GBP, AUD).
• AMOUNT is a positive number in that currency.
• DIRECTION is either "debit" or "credit".
• BALANCE is the running balance after that transaction, or the word NULL if no balance was shown.
• MONTH is the month number (1–12) of the transaction.

For each line, convert AMOUNT and BALANCE into USD (using current exchange rates). Output each transaction on its own line, in exactly this format:

  DESCRIPTION || AMOUNT_USD || DIRECTION || BALANCE_USD || MONTH

– DESCRIPTION, DIRECTION, and MONTH must remain unchanged.
– AMOUNT_USD is the converted amount in USD (two decimals).
– BALANCE_USD is the converted balance in USD (two decimals), or NULL if original BALANCE was NULL.

Do not output any extra text or commentary—only these lines.

Here are the transactions to convert:
{raw_lines}
"""

    response = model.generate_content(prompt)
    raw = (response.text or "").strip()

    output = []
    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        parts = [p.strip() for p in line.split("||")]
        # Expect exactly 5 parts: desc, amt_usd, direction, bal_usd, month
        if len(parts) != 5:
            continue

        desc, amt_usd_str, dir_str, bal_usd_str, month_str = parts

        try:
            amount_usd = float(amt_usd_str.replace(",", ""))
        except:
            amount_usd = None

        direction = dir_str.lower() if dir_str.lower() in ("debit", "credit") else None

        try:
            balance_usd = float(bal_usd_str.replace(",", "")) if bal_usd_str.upper() != "NULL" else None
        except:
            balance_usd = None

        try:
            month = int(month_str)
            if not (1 <= month <= 12):
                month = None
        except:
            month = None

        output.append({
            "description": desc,
            "amount": amount_usd,
            "direction": direction,
            "balance": balance_usd,
            "month": month
        })

    return output



def check_data_integrity(transactions: List[Dict[str, Optional[float]]]) -> List[Dict]:
    """
    STEP 3: SPOT INTEGRITY ISSUES (via Gemini).
    Only two anomaly types:
      • Invalid amount  → amount is null/missing or ≤ 0
      • Invalid direction → direction (trimmed) is not exactly "debit" or "credit" (case-insensitive)

    Transactions with a positive numeric amount AND a valid direction must never be flagged.
    """
    tx_json = json.dumps(transactions, default=str)
    prompt = f"""
You are a data-integrity auditor for normalized bank transactions. Only flag these two cases:

  • "Invalid amount": when the transaction's amount field is missing, null, or ≤ 0  
  • "Invalid direction": when the direction field (after trimming whitespace) is not exactly "debit" or "credit" (case-insensitive)

Transactions with a positive numeric amount **and** a valid direction must **never** be flagged.

For each anomaly, output one line **only** in this format:

<REASON> || <TRANSACTION_JSON>

Where <REASON> is exactly "Invalid amount" or "Invalid direction", and <TRANSACTION_JSON> is the full JSON object of that transaction.  
Do **not** output anything else. If there are no anomalies, return an empty response.

Here is the input JSON:
{tx_json}
"""
    response = model.generate_content(prompt)
    raw = (response.text or "").strip()
    issues = []
    for line in raw.splitlines():
        parts = [p.strip() for p in line.split("||", 1)]
        if len(parts) != 2:
            continue
        reason, tx_str = parts
        if reason not in ("Invalid amount", "Invalid direction"):
            continue
        try:
            tx_obj = json.loads(tx_str)
        except json.JSONDecodeError:
            continue
        issues.append({"reason": reason, "transaction": tx_obj})
    return issues



def analyze_signals(transactions: List[Dict[str, Optional[float]]]) -> Dict[str, Any]:
    """
    STEP 4: COMPUTE FINANCIAL SIGNALS (via Gemini), including per‐month flows and per‐month DTI.
    Input: a Python list of normalized transaction dicts (each includes a numeric "month" field 1–12).
    Output: a dict with exactly these keys, plus a monthly_flows sub‐dict for up to the last 3 months:
      {
        "total_deposits": float,
        "total_withdrawals": float,
        "net_cash_flow": float,
        "debt_to_income": float,
        "monthly_flows": {
          "MonthName": { … },
          …
        }
      }
    """
    tx_json = json.dumps(transactions, default=str)

    prompt = f"""
You are a financial-signals generator. Given this JSON array of normalized bank transactions 
(fields: description, amount, direction, balance, month), compute:

1. total_deposits: sum of all amount where direction == "credit"  
2. total_withdrawals: sum of all amount where direction == "debit"  
3. net_cash_flow: total_deposits − total_withdrawals  
4. overall debt_to_income: (sum of all debt-related payments across the entire period) ÷ total_deposits  

Next, examine the transactions in their given order (oldest→newest) and collect **distinct months** by looking from the end backwards.  
- If your data contains **only one** distinct month, generate flows for that single month.  
- If it contains **two**, generate flows for those two months.  
- If it contains **three or more**, generate flows for the **three most recent** distinct months.  

For each selected month (in chronological oldest→newest order), compute:  
  • deposits: sum of credits in that month  
  • withdrawals: sum of debits in that month  
  • end_balance: the balance after the last transaction in that month  
  • debt_to_income: (sum of that month’s debt payments) ÷ (that month’s deposits)  

Convert month numbers to English names (January, February, etc.).

**Output exactly** (no JSON, no code fences) four top-level lines, then a `monthly_flows:` block **with exactly as many entries** (1, 2 or 3) as you selected:

total_deposits: <float>  
total_withdrawals: <float>  
net_cash_flow: <float>  
debt_to_income: <float between 0 and 1>

monthly_flows:  
  MonthA: {{ deposits: <float>, withdrawals: <float>, end_balance: <float>, debt_to_income: <float> }}  
  MonthB: {{ deposits: <float>, withdrawals: <float>, end_balance: <float>, debt_to_income: <float> }}  
  MonthC: {{ deposits: <float>, withdrawals: <float>, end_balance: <float>, debt_to_income: <float> }}

Here is the input:
{tx_json}
"""

    response = model.generate_content(prompt)
    raw = (response.text or "").strip()

    signals = {
        "total_deposits": 0.0,
        "total_withdrawals": 0.0,
        "net_cash_flow": 0.0,
        "debt_to_income": 0.0,
        "monthly_flows": {}
    }

    for line in raw.splitlines():
        line = line.strip()
        # Top‐level signals
        m = re.match(
            r"^(total_deposits|total_withdrawals|net_cash_flow|debt_to_income):\s*([-+]?\d+(?:\.\d+)?)",
            line, re.IGNORECASE
        )
        if m:
            signals[m.group(1).lower()] = float(m.group(2))
            continue

        # Skip "monthly_flows:" header
        if line.lower().startswith("monthly_flows"):
            continue

        # Monthly flows entries
        m2 = re.match(
            r"^([A-Za-z]+):\s*\{\s*deposits:\s*([-+]?\d+(?:\.\d+)?),\s*withdrawals:\s*([-+]?\d+(?:\.\d+)?),\s*end_balance:\s*([-+]?\d+(?:\.\d+)?),\s*debt_to_income:\s*([-+]?\d+(?:\.\d+)?)\s*\}$",
            line
        )
        if m2:
            month = m2.group(1)
            signals["monthly_flows"][month] = {
                "deposits":      float(m2.group(2)),
                "withdrawals":   float(m2.group(3)),
                "end_balance":   float(m2.group(4)),
                "debt_to_income": float(m2.group(5)),
            }

    return signals


def category_spending(normalized_transactions: List[Dict[str, Any]]) -> Dict[str, float]:
    """
    STEP 6: CATEGORIZE SPENDING INTO FOUR BUCKETS AS PERCENTAGES (via Gemini).
    Input: a JSON array of normalized transactions (fields: description, amount, direction, balance).
    Output: a dict with exactly these keys (all floats, summing to ~100):
      {
        "Living": …,   # percent of total debit spending
        "Debt": …,     
        "Leisure": …,
        "Savings": …
      }
    """

    # Serialize for Gemini
    tx_json = json.dumps(normalized_transactions, default=str)

    prompt = f"""
You are a spending categorization assistant. Given this JSON array of normalized bank transactions
(fields: description, amount, direction, balance), first calculate the total debit spending
(sum of all “amount” where direction == "debit"). Then assign each debit transaction to one
of four categories:
  - Living: household bills, utilities, groceries, rent
  - Debt: loan payments, mortgage, credit-card repayments
  - Leisure: entertainment, dining out, travel, shopping
  - Savings: transfers into savings or investment accounts

Compute the percentage of the total debit spending represented by each category,
rounded to two decimal places, so that the four categories sum to 100.

Output exactly four lines, in this format (no % symbols, just numbers):

Living: <float>
Debt: <float>
Leisure: <float>
Savings: <float>

Do not output any extra text or commentary—only these four lines. Here is the input JSON:
{tx_json}
"""

    # Query Gemini
    response = model.generate_content(prompt)
    raw = (response.text or "").strip()

    # Prepare defaults
    categories = {
        "Living": 0.0,
        "Debt": 0.0,
        "Leisure": 0.0,
        "Savings": 0.0,
    }

    # Parse Gemini’s four-line output
    for line in raw.splitlines():
        line = line.strip()
        match = re.match(
            r"^(Living|Debt|Leisure|Savings)\s*:\s*([-+]?\d+(?:\.\d+)?)",
            line, re.IGNORECASE
        )
        if match:
            key = match.group(1).title()
            try:
                value = float(match.group(2))
            except ValueError:
                value = 0.0
            categories[key] = value

    return categories


def score_loan_applicant(
    transactions: List[Dict[str, Optional[float]]],
    analysis_summary: Dict[str, float],
    requested_amount: float
) -> int:
    """
    STEP 6: INSIGHT GENERATION (loan score via Gemini).
    Now that we have:
      • transactions: a list of normalized transaction dicts (description, amount, direction, balance)
      • analysis_summary: a dict containing financial‐signal metrics (total_deposits, total_withdrawals,
        net_cash_flow, debt_to_income)
      • requested_amount: the loan amount the user is asking for

    We will feed all three pieces of information into Gemini and ask it to produce one integer score [0–100].
    """

    # Pull out the key metrics from analysis_summary
    total_deposits = analysis_summary.get("total_deposits", 0.0)
    total_withdrawals = analysis_summary.get("total_withdrawals", 0.0)
    net_cash_flow = analysis_summary.get("net_cash_flow", 0.0)
    debt_to_income = analysis_summary.get("debt_to_income", 0.0)

    # Prepare up to 50 of the most recent transactions as a compact CSV snippet
    # (we include this so Gemini can “see” spending patterns, but keep it under 50 lines to limit prompt length)
    csv_lines = []
    for tx in transactions[:50]:
        desc = tx.get("description") or ""
        amt = tx.get("amount") or 0.0
        direction = tx.get("direction") or ""
        bal = tx.get("balance") or 0.0
        # Escape any commas in the description
        desc_clean = desc.replace(",", " ")
        csv_lines.append(f"{desc_clean},{amt:.2f},{direction},{bal:.2f}")
    csv_blob = "\n".join(csv_lines)

    prompt = f"""
You are a loan underwriter AI. Below is the applicant’s financial profile, broken into three sections:

--- SECTION 1: High‐Level Summary Metrics ---
total_deposits: {total_deposits:.2f}
total_withdrawals: {total_withdrawals:.2f}
net_cash_flow: {net_cash_flow:.2f}
debt_to_income: {debt_to_income:.4f}

If Net Cash flow is significantly low, you cannot score this applicant more than 50, and if debt to income is above 20, you cannot score this applicant about 50.

--- SECTION 2: Recent Transactions (CSV, up to 50 rows) ---
Columns: description,amount,direction,balance
{csv_blob}

--- SECTION 3: Requested Loan Amount ---
requested_amount: {requested_amount:.2f}

Based on all of the above (summary metrics + transaction patterns + requested loan), assign a loan‐worthiness score between 0 and 100, where:
  0   = extremely high risk (unlikely to repay)
  100 = extremely low risk (very safe borrower)

Take into account:
  • How consistent and large are the deposits relative to withdrawals?
  • The applicant’s net_cash_flow and debt_to_income ratio.
  • Any large one‐off withdrawals or frequent overdraft‐style patterns.
  • The size of the requested loan compared to their monthly net cash flow.
  • Overall likelihood of repayment.

Return exactly one integer (no commentary, no JSON, no code fences).
"""

    response = model.generate_content(prompt)
    raw_text = (response.text or "").strip()

    # Extract the first integer we find in the reply
    digits = "".join(filter(str.isdigit, raw_text))
    try:
        score = int(digits)
        return max(0, min(score, 100))
    except:
        return 50

def summarize_statement(
    transactions: List[Dict[str, Optional[float]]],
    analysis_summary: Dict[str, float],
    loan_score: int
) -> str:
    """
    STEP 6: PRODUCE HIGH-LEVEL SUMMARY PARAGRAPH (via Gemini), with dynamic length
            and actionable tips for weaker applicants.
    Inputs:
      - transactions: list of normalized tx dicts (description, amount, direction, balance, month)
      - analysis_summary: { total_deposits, total_withdrawals, net_cash_flow, debt_to_income }
      - loan_score: integer 0–100
    Output:
      - A single paragraph:
         • Strong (score>66): 4–5 sentences
         • Moderate (33–66): 5–6 sentences with 1–2 suggestions
         • Weak (<33): 8–9 sentences (first diagnose, then 3–4 “To improve…” sentences)
    """
    tx_json = json.dumps(transactions, default=str)
    td = analysis_summary.get("total_deposits", 0.0)
    tw = analysis_summary.get("total_withdrawals", 0.0)
    cf = analysis_summary.get("net_cash_flow", 0.0)
    dti = analysis_summary.get("debt_to_income", 0.0)

    prompt = f"""
You are a bank‐statement analyst.  Below is the applicant’s profile:

Loan score: {loan_score}  
total_deposits: {td:.2f}  
total_withdrawals: {tw:.2f}  
net_cash_flow: {cf:.2f}  
debt_to_income: {dti:.4f}

Classify the applicant as “strong,” “moderate,” or “weak”:
- If loan_score > 66 → strong
- If 33 ≤ loan_score ≤ 66 → moderate
- If loan_score < 33 → weak

Write **one paragraph** as follows:
1. For **strong**: 4–5 sentences explaining why they’re strong (cite deposit consistency, positive cash flow, low DTI).  Stop after 5 sentences.
2. For **moderate**: 5–6 sentences describing both strengths and mild concerns, plus one or two quick improvement suggestions.
3. For **weak**: 8–9 sentences.  First 4–5 diagnose issues (low balances, irregular deposits, high DTI).  Then 3–4 sentences each beginning with verbs like “To improve, the applicant should …”, “They could consider …”, “It would help to …” that offer concrete, actionable advice.  

Do **not** output JSON or bullet lists—just one flowing paragraph.  Here are the transactions:

{tx_json}
"""

    response = model.generate_content(prompt)
    summary = (response.text or "").strip()
    if not summary:
        summary = (
            "Based on the available transactions, the applicant’s loanworthiness could not be determined. "
            "Please check that the data is complete and try again."
        )
    return summary

