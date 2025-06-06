import google.generativeai as genai
import os
import json
from typing import List, Dict, Optional, Any
import re

# genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel(model_name='models/gemini-1.5-flash')

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

    We ask Gemini to output one transaction per line, in the format:
      DESCRIPTION || CURRENCY || AMOUNT || DIRECTION || BALANCE
    Then we parse those lines.
    """
    prompt = f"""
You are a bank‐statement extraction expert. Below is the full text of a multi‐page bank statement 
(which may be from an Indian IDFC, a UK Lloyds, a US Bank, or an Australian Commonwealth Bank).
Extract each transaction row and output exactly one line per transaction in this format:

<DESCRIPTION> || <CURRENCY> || <AMOUNT> || <DIRECTION> || <BALANCE>

Where:
- <DESCRIPTION> is a concise text (e.g. "IMPS Transfer – Oma Ram", "PANERA BREAD", "DIRECT DEBIT SGIO").
- <CURRENCY> is the three‐letter ISO code (e.g. "INR", "USD", "GBP", "AUD"), based on symbols or context in the statement.
- <AMOUNT> is a positive number (no currency symbols).
- <DIRECTION> is either "debit" or "credit".
- <BALANCE> is the running balance after that transaction, or the word NULL if no balance is shown.

Ignore any headers, footers, summary lines, page numbers, “Money In/Money Out” totals, etc.
Preserve the original order.

For example:
IMPS Transfer – Oma Ram || INR || 1.00 || credit || 22.62
IMPS Transfer – Oma Ram || INR || 2000.00 || credit || 2022.62
NACH ACH Bajaj Financial || INR || 1912.00 || debit || 110.62
…

Do not output anything else—no extra commentary. Here is the raw text:

{raw_text}
"""

    response = model.generate_content(prompt)
    raw = (response.text or "").strip()
    lines = [line.strip() for line in raw.splitlines() if line.strip()]

    transactions = []
    for line in lines:
        parts = [p.strip() for p in line.split("||")]
        if len(parts) != 5:
            # Skip any malformed line
            continue
        desc, curr_str, amt_str, dir_str, bal_str = parts

        currency = curr_str.upper()  # e.g. "INR", "USD", "GBP", "AUD"
        try:
            amount = float(amt_str.replace(",", ""))
        except:
            amount = None

        direction = dir_str.lower() if dir_str.lower() in ("debit", "credit") else None

        try:
            balance = float(bal_str.replace(",", "")) if bal_str.upper() != "NULL" else None
        except:
            balance = None

        transactions.append({
            "description": desc,
            "currency": currency,
            "amount": amount,
            "direction": direction,
            "balance": balance
        })
    return transactions

def normalize_currencies(raw_lines: str) -> List[Dict[str, Any]]:
    """
    STEP 2: CONVERT AMOUNT & BALANCE TO USD
    Input: a multiline string where each line is already in the format:
      DESCRIPTION || CURRENCY || AMOUNT || DIRECTION || BALANCE

    Output: a Python list of dicts, each with:
      • "description" (string, unchanged)
      • "amount"      (float, converted into USD)
      • "direction"   (string, unchanged)
      • "balance"     (float or None, converted into USD)

    We ask Gemini to read each line and output exactly:
      DESCRIPTION || AMOUNT_USD || DIRECTION || BALANCE_USD
    Then we parse it back into Python dicts.
    """

    prompt = f"""
You are a currency‐conversion assistant. Each line below represents one bank transaction in this format:

  DESCRIPTION || CURRENCY || AMOUNT || DIRECTION || BALANCE

• DESCRIPTION is a short text describing the transaction.
• CURRENCY is a three‐letter code (e.g. INR, USD, GBP, AUD).
• AMOUNT is a positive number in that currency.
• DIRECTION is either "debit" or "credit".
• BALANCE is the running balance after that transaction, or the word NULL if no balance was shown.

For each line, convert AMOUNT and BALANCE into USD (using current exchange rates). Output each transaction on its own line, in exactly this format:

  DESCRIPTION || AMOUNT_USD || DIRECTION || BALANCE_USD

– DESCRIPTION and DIRECTION must remain unchanged.
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
        # Expect exactly 4 parts: desc, amt_usd, direction, bal_usd
        if len(parts) != 4:
            continue

        desc, amt_usd_str, dir_str, bal_usd_str = parts
        try:
            amount_usd = float(amt_usd_str.replace(",", ""))
        except:
            amount_usd = None
        direction = dir_str.lower() if dir_str.lower() in ("debit", "credit") else None
        try:
            balance_usd = float(bal_usd_str.replace(",", "")) if bal_usd_str.upper() != "NULL" else None
        except:
            balance_usd = None

        output.append({
            "description": desc,
            "amount": amount_usd,
            "direction": direction,
            "balance": balance_usd
        })
    return output


def check_data_integrity(transactions: List[Dict[str, Optional[float]]]) -> List[Dict]:
    """
    STEP 3: SPOT INTEGRITY ISSUES (via Gemini).
    Input: JSON array of transactions with numeric "amount" and "balance".
    Output: JSON array of issues: { "reason": "...", "transaction": { … } }
    """
    tx_json = json.dumps(transactions, default=str)
    prompt = f"""
You are a data‐integrity auditor. Given this JSON array of bank transactions (fields: description, amount, direction, balance), 
identify any anomalies. For each problematic transaction, return an object:

  {{
    "reason": STRING,
    "transaction": original transaction
  }}

Possible reasons:
- "Invalid amount" → amount ≤ 0 or missing.
- "Invalid direction" → not exactly "debit" or "credit".
- "Missing balance" → balance is null/null‐string but other rows have balances.

If no issues, return an empty array: [].

Input:
{tx_json}
"""
    response = model.generate_content(prompt)
    txt = response.text.strip()
    try:
        return json.loads(txt)
    except json.JSONDecodeError:
        return []


def analyze_signals(transactions: List[Dict[str, Optional[float]]]) -> Dict[str, float]:
    """
    STEP 4: COMPUTE FINANCIAL SIGNALS (via Gemini), but with a flexible, line‐based output.
    Input: a Python list of normalized transaction dicts.
    Output: a dict with exactly these keys (all floats):
      {
        "total_deposits": …,
        "total_withdrawals": …,
        "net_cash_flow": …,
        "debt_to_income": …
      }
    If Gemini's output cannot be parsed, we fall back to zeros for all four.
    """
    # Convert transactions into a JSON string so that Gemini can read them.
    tx_json = json.dumps(transactions, default=str)

    prompt = f"""
You are a financial‐signals generator. Given this JSON array of normalized bank transactions 
(fields: description, amount, direction, balance), compute exactly four signals:

  total_deposits: sum of all “amount” where “direction” == “credit”
  total_withdrawals: sum of all “amount” where “direction” == “debit”
  net_cash_flow: total_deposits − total_withdrawals
  debt_to_income: (sum of all “amount” where “description” mentions a loan, mortgage, credit‐card, or other debt payment) ÷ total_deposits

**Output format (no extra commentary, exactly these four lines in any order):**

total_deposits: <a floating‐point number>
total_withdrawals: <a floating‐point number>
net_cash_flow: <a floating‐point number>
debt_to_income: <a floating‐point number between 0 and 1>

Do not wrap your answer in JSON or code fences—just output the four lines as shown. Here is the input:

{tx_json}
"""

    # Query Gemini
    response = model.generate_content(prompt)
    raw = (response.text or "").strip()

    # Prepare a default dictionary
    signals = {
        "total_deposits": 0.0,
        "total_withdrawals": 0.0,
        "net_cash_flow": 0.0,
        "debt_to_income": 0.0
    }

    # Split the output into lines and look for our four keys
    for line in raw.splitlines():
        line = line.strip()
        # Match patterns like: total_deposits: 12345.67 or debt_to_income: 0.35
        match = re.match(
            r"^(total_deposits|total_withdrawals|net_cash_flow|debt_to_income)\s*:\s*([-+]?\d+(?:\.\d+)?)",
            line,
            re.IGNORECASE
        )
        if match:
            key = match.group(1).lower()
            try:
                value = float(match.group(2))
            except ValueError:
                value = 0.0
            signals[key] = value

    return signals

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

def summarize_statement(transactions: List[Dict[str, Optional[float]]]) -> str:
    """
    STEP 6: PRODUCE HIGH‐LEVEL SUMMARY PARAGRAPH (via Gemini).
    Input: a Python list of normalized transaction dicts (fields: description, amount, direction, balance).
    Output: a 4–5 sentence paragraph discussing:
      • Why the applicant appears to be a good or bad client
      • Which factors (income consistency, spending patterns, net cash flow, debt‐to‐income) support that view
      • If they are a weaker applicant, what they could do to improve their loanworthiness
    """
    # Serialize transactions into JSON so Gemini can read them
    tx_json = json.dumps(transactions, default=str)

    prompt = f"""
You are a bank‐statement analyst. Given this JSON array of normalized transactions (fields: description, amount, direction, balance), write a concise 4–5 sentence paragraph that would be shown on a loan‐application results page. In your paragraph:

  1. State whether the applicant appears to be a strong or weak candidate for a loan.
  2. Cite supporting facts from their transaction history (e.g., consistent deposits, high net cash flow, low debt, or excessive withdrawals).
  3. If they appear to be a weaker candidate, suggest specific actions they could take to improve their loanworthiness (e.g., reduce discretionary spending, build a savings cushion, lower debt).
  4. End with an overall recommendation or summary sentence.

Do NOT output JSON—just return a plain paragraph. Here is the input data:

{tx_json}
"""
    response = model.generate_content(prompt)
    summary_paragraph = (response.text or "").strip()

    # If Gemini fails to produce a paragraph, fall back to a generic text
    if not summary_paragraph:
        # Compute some basic stats locally
        deposits = [tx["amount"] for tx in transactions if tx.get("direction") == "credit" and tx.get("amount") is not None]
        withdrawals = [tx["amount"] for tx in transactions if tx.get("direction") == "debit" and tx.get("amount") is not None]
        num = len(transactions)
        avg_dep = sum(deposits) / len(deposits) if deposits else 0.0
        avg_wd = sum(withdrawals) / len(withdrawals) if withdrawals else 0.0
        summary_paragraph = (
            f"The applicant has {num} recent transactions, with an average deposit of ${avg_dep:.2f} "
            f"and an average withdrawal of ${avg_wd:.2f}. Based on this limited data, it is unclear if they maintain "
            f"consistent savings habits; they could improve by increasing regular deposits and reducing discretionary expenses. "
            f"Overall, we recommend reviewing a larger sample of their history for a more definitive assessment."
        )

    return summary_paragraph