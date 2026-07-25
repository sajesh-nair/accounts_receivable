import streamlit as st
import pandas as pd
import numpy as np
import joblib
import os

# ----------------------------------------------------
# 1. Page Configuration
# ----------------------------------------------------
st.set_page_config(
    page_title="Accounts Receivable Delinquency Engine", 
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Enforce clean metric readability
st.markdown("""
    <style>
    div[data-testid="stMetricValue"] {
        font-weight: 700 !important;
    }
    .footer-text {
        text-align: center;
        color: #888888;
        font-size: 0.85rem;
        padding-top: 1.5rem;
    }
    </style>
""", unsafe_allow_html=True)

# ----------------------------------------------------
# 2. Model Loading
# ----------------------------------------------------
@st.cache_resource
def load_models():
    clf_path = os.path.join('models', 'stage_1_classifier.pkl')
    reg_path = os.path.join('models', 'stage_2_regressor.pkl')
    
    if not os.path.exists(clf_path):
        clf_path = os.path.join('..', 'models', 'stage_1_classifier.pkl')
        reg_path = os.path.join('..', 'models', 'stage_2_regressor.pkl')
        
    return joblib.load(clf_path), joblib.load(reg_path)

clf_pipe, hgb_reg_pipe = load_models()

def run_inference(df):
    probs = clf_pipe.predict_proba(df)[:, 1]
    preds = clf_pipe.predict(df)
    days_pred = np.expm1(hgb_reg_pipe.predict(df))
    
    res = df.copy()
    res['Late_Prob'] = probs
    res['Risk_Status'] = np.where(preds == 1, 'LATE', 'ON TIME')
    res['Expected_Delay'] = np.where(preds == 1, np.round(days_pred, 1), 0.0)
    return res

# ----------------------------------------------------
# 3. Portfolio Ledger Data (Simulated Accounts)
# ----------------------------------------------------
@st.cache_data
def get_ledger_data():
    return pd.DataFrame({
        'customerID': ['CUST-8801', 'CUST-3402', 'CUST-1109', 'CUST-9042', 'CUST-5510', 'CUST-7721', 'CUST-1049'],
        'InvoiceAmount': [14500.00, 2300.50, 68000.00, 890.00, 12400.00, 45000.00, 3100.00],
        'Disputed': ['Yes', 'No', 'Yes', 'No', 'No', 'Yes', 'No'],
        'PaperlessBill': ['Paperless', 'Paper', 'Paperless', 'Paper', 'Paperless', 'Paperless', 'Paper'],
        'days_since_paperless': [180, 45, 410, 12, 90, 300, 15],
        'invoice_month': [6, 6, 5, 7, 7, 6, 7],
        'invoice_dayofweek': [1, 3, 2, 0, 4, 1, 3],
        'countryCode': ['406', '897', '770', '818', '406', '770', '897'],
        'payment_terms_days': [30, 30, 60, 15, 30, 30, 15],
        'cust_mean_days_late': [18.4, 1.2, 28.6, 0.0, 5.1, 21.0, 0.5],
        'cust_late_rate': [0.82, 0.08, 0.94, 0.02, 0.25, 0.88, 0.04],
        'cust_dispute_rate': [0.45, 0.00, 0.65, 0.00, 0.10, 0.50, 0.00],
        'cust_invoice_count': [34, 15, 52, 6, 20, 40, 8]
    })

df_raw = get_ledger_data()
df_scored = run_inference(df_raw)

# ----------------------------------------------------
# 4. Header & Model Score Metrics Banner
# ----------------------------------------------------
st.title("Accounts Receivable Risk & Delinquency Engine")
st.caption("Cascaded Two-Stage Machine Learning Infrastructure for Enterprise Cash Flow Optimization")

# Top Benchmark Metrics Banner
m_col1, m_col2, m_col3, m_col4 = st.columns(4)
m_col1.metric("Stage 1 Model", "Random Forest")
m_col2.metric("Stage 1 ROC-AUC Score", "0.93")
m_col3.metric("Stage 2 Model", "HistGradientBoosting")
m_col4.metric("Stage 2 R² Score", "0.20")

st.divider()

# ----------------------------------------------------
# 5. Executive Portfolio KPI Summary
# ----------------------------------------------------
tot_exposure = df_scored['InvoiceAmount'].sum()
late_df = df_scored[df_scored['Risk_Status'] == 'LATE']
at_risk = late_df['InvoiceAmount'].sum()
pct_at_risk = (at_risk / tot_exposure) * 100
avg_delay = late_df['Expected_Delay'].mean() if len(late_df) > 0 else 0.0

col1, col2, col3, col4 = st.columns(4)
col1.metric("Total Outstanding Portfolio", f"${tot_exposure:,.2f}")
col2.metric("At-Risk Capital (Predicted Late)", f"${at_risk:,.2f}", delta=f"{pct_at_risk:.1f}% of total", delta_color="inverse")
col3.metric("Flagged High-Risk Invoices", f"{len(late_df)} / {len(df_scored)}")
col4.metric("Avg Projected Payment Delay", f"{avg_delay:.1f} Days")

st.divider()

# ----------------------------------------------------
# 6. Interactive Ledger Table
# ----------------------------------------------------
st.subheader("Invoice Portfolio Risk Ledger")

f1, f2 = st.columns([1, 1])
with f1:
    status_filter = st.selectbox("Filter Payment Status", ["All Invoices", "LATE Only", "ON TIME Only"])
with f2:
    dispute_filter = st.selectbox("Filter Active Disputes", ["All Accounts", "Disputed Only", "Non-Disputed Only"])

filtered_df = df_scored.copy()
if status_filter == "LATE Only":
    filtered_df = filtered_df[filtered_df['Risk_Status'] == 'LATE']
elif status_filter == "ON TIME Only":
    filtered_df = filtered_df[filtered_df['Risk_Status'] == 'ON TIME']

if dispute_filter == "Disputed Only":
    filtered_df = filtered_df[filtered_df['Disputed'] == 'Yes']
elif dispute_filter == "Non-Disputed Only":
    filtered_df = filtered_df[filtered_df['Disputed'] == 'No']

display_cols = ['customerID', 'InvoiceAmount', 'Disputed', 'cust_late_rate', 'Late_Prob', 'Risk_Status', 'Expected_Delay']
table_view = filtered_df[display_cols].copy()
table_view.columns = ['Customer ID', 'Invoice Value ($)', 'Dispute', 'Hist. Late Rate', 'Delinquency Risk Score', 'Status', 'Projected Delay']

st.dataframe(
    table_view.style.format({
        'Invoice Value ($)': '${:,.2f}',
        'Hist. Late Rate': '{:.0%}',
        'Delinquency Risk Score': '{:.1%}',
        'Projected Delay': '{:.1f} days'
    }),
    use_container_width=True,
    height=280
)

st.divider()

# ----------------------------------------------------
# 7. Single Invoice Risk Simulator
# ----------------------------------------------------
with st.expander("Single Invoice Risk Simulator (Scenario & Overrides Analysis)", expanded=False):
    ic1, ic2, ic3, ic4 = st.columns(4)
    with ic1:
        sim_amt = st.number_input("Invoice Amount ($)", value=25000.0, step=1000.0)
    with ic2:
        sim_disp = st.selectbox("Active Dispute", ["Yes", "No"])
    with ic3:
        sim_rate = st.slider("Customer Historical Late Rate", 0.0, 1.0, 0.85)
    with ic4:
        sim_days = st.number_input("Customer Historical Avg Delay (Days)", value=18.0)

    sim_row = pd.DataFrame({
        'customerID': ['SIM-INSPECT'],
        'InvoiceAmount': [sim_amt],
        'Disputed': [sim_disp],
        'PaperlessBill': ['Paperless'],
        'days_since_paperless': [120],
        'invoice_month': [6],
        'invoice_dayofweek': [2],
        'countryCode': ['406'],
        'payment_terms_days': [30],
        'cust_mean_days_late': [sim_days],
        'cust_late_rate': [sim_rate],
        'cust_dispute_rate': [0.20],
        'cust_invoice_count': [20]
    })
    
    sim_res = run_inference(sim_row)
    
    sc1, sc2, sc3 = st.columns(3)
    sc1.metric("Predicted Status", sim_res['Risk_Status'].values[0])
    sc2.metric("Delinquency Risk Score", f"{sim_res['Late_Prob'].values[0]:.1%}")
    sc3.metric("Projected Delay", f"{sim_res['Expected_Delay'].values[0]} Days")

st.divider()

# ----------------------------------------------------
# 8. Architecture & Pipeline Workflow Summary
# ----------------------------------------------------
with st.expander("System Architecture & Data Engineering Pipeline Flow"):
    st.markdown("""
    ### End-to-End Machine Learning Engineering Architecture

    1. **Data Ingestion & Cleaning:**
       * Processed corporate invoice records with temporal parameters, payment methods, dispute statuses, and payment windows.
    
    2. **Behavioral Feature Engineering:**
       * Calculated customer-level historical behavior aggregates (`cust_late_rate`, `cust_mean_days_late`, `cust_dispute_rate`).
       * **Impact:** Boosted Stage 1 classification ROC-AUC from a baseline of **0.58** to **0.93**.

    3. **Stage 1 (Binary Delinquency Classification):**
       * Trained a **Random Forest Classifier** (`class_weight='balanced_subsample'`) tuned on ROC-AUC to flag late payment likelihood ($y \\in \\{0, 1\\}$).

    4. **Stage 2 (Delay Severity Estimation):**
       * Filtered exclusively on overdue accounts and trained a **HistGradientBoostingRegressor** on log-transformed targets ($\log(1 + \text{DaysLate})$).
       * Applied inverse log transformation ($\exp(\hat{y}) - 1$) during inference to forecast exact delay duration.

    5. **Production Model Serialization & Inference Engine:**
       * Serialized trained pipelines via `joblib` into automated production pipelines for single-invoice and batch portfolio risk scoring.
    """)

# ----------------------------------------------------
# 9. Attribution & Footer
# ----------------------------------------------------
st.markdown("---")
st.markdown(
    """
    <div class="footer-text">
        <strong>Developed by Sajesh Nair</strong> | Built with Streamlit & Scikit-Learn<br>
        Data Source: <a href="https://www.kaggle.com/datasets/hhenry/finance-factoring-ibm-late-payment-histories/data" target="_blank">IBM Accounts Receivable Dataset (Kaggle)</a>
    </div>
    """, 
    unsafe_allow_html=True
)