from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import joblib
import os

app = FastAPI(title="Accounts Receivable Risk API")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# File Paths
DATA_PATH = os.path.join('data', 'WA_Fn-UseC_-Accounts-Receivable.csv')
CLF_PATH = os.path.join('models', 'stage_1_classifier.pkl')
REG_PATH = os.path.join('models', 'stage_2_regressor.pkl')

# Load Trained Models
clf_pipe = joblib.load(CLF_PATH)
hgb_reg_pipe = joblib.load(REG_PATH)

def preprocess_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    
    # 1. Parse dates and compute temporal features
    for col in ['InvoiceDate', 'PaperlessDate', 'DueDate', 'SettledDate']:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors='coerce')

    if 'InvoiceDate' in df.columns:
        df['invoice_month'] = df['InvoiceDate'].dt.month
        df['invoice_dayofweek'] = df['InvoiceDate'].dt.dayofweek
    else:
        df['invoice_month'] = 1
        df['invoice_dayofweek'] = 0

    if 'PaperlessDate' in df.columns and 'InvoiceDate' in df.columns:
        df['days_since_paperless'] = (df['InvoiceDate'] - df['PaperlessDate']).dt.days.fillna(0)
    else:
        df['days_since_paperless'] = 0

    if 'payment_terms_days' not in df.columns:
        if 'DueDate' in df.columns and 'InvoiceDate' in df.columns:
            df['payment_terms_days'] = (df['DueDate'] - df['InvoiceDate']).dt.days.fillna(30)
        elif 'PayTerms' in df.columns:
            df['payment_terms_days'] = pd.to_numeric(df['PayTerms'].astype(str).str.extract(r'(\d+)')[0], errors='coerce').fillna(30)
        else:
            df['payment_terms_days'] = 30

    # 2. Compute customer historical aggregations
    if 'cust_late_rate' not in df.columns:
        if 'DaysLate' in df.columns:
            df['is_late'] = (df['DaysLate'] > 0).astype(int)
        else:
            df['is_late'] = 0

        inv_col = 'invoiceNumber' if 'invoiceNumber' in df.columns else ('InvoiceNumber' if 'InvoiceNumber' in df.columns else None)
        if not inv_col:
            df['temp_inv_id'] = df.index
            inv_col = 'temp_inv_id'

        cust_stats = df.groupby('customerID').agg(
            cust_late_rate=('is_late', 'mean'),
            cust_mean_days_late=('DaysLate', 'mean') if 'DaysLate' in df.columns else ('is_late', 'mean'),
            cust_dispute_rate=('Disputed', lambda x: (x == 'Yes').mean()) if 'Disputed' in df.columns else ('is_late', 'mean'),
            cust_invoice_count=(inv_col, 'count')
        ).reset_index()

        df = df.merge(cust_stats, on='customerID', how='left')

    return df

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "stage_1": "RandomForest", "stage_2": "HistGradientBoosting"}

@app.get("/api/ledger")
def get_ledger():
    if not os.path.exists(DATA_PATH):
        return {"error": "Dataset file not found in data/"}
    
    # Read raw dataset and apply feature transformations
    raw_df = pd.read_csv(DATA_PATH)
    processed_df = preprocess_dataframe(raw_df)

    # Run Stage 1 & Stage 2 Inference
    probs = clf_pipe.predict_proba(processed_df)[:, 1]
    preds = clf_pipe.predict(processed_df)
    days_pred = np.expm1(hgb_reg_pipe.predict(processed_df))
    
    # Format payload for React UI
    records = []
    for idx, row in processed_df.iterrows():
        is_late = int(preds[idx])
        records.append({
            "customerID": str(row["customerID"]),
            "InvoiceAmount": float(row["InvoiceAmount"]),
            "Disputed": str(row["Disputed"]),
            "cust_late_rate": float(row.get("cust_late_rate", 0.0)),
            "delinquencyScore": round(float(probs[idx]), 4),
            "status": "LATE" if is_late == 1 else "ON TIME",
            "projectedDelay": round(float(days_pred[idx]), 1) if is_late == 1 else 0.0
        })
        
    return records