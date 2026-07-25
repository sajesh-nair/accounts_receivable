python3 -m venv venv

python -m pip install --upgrade pip
pip install -r requirements.txt

streamlit run app.py

pip install fastapi uvicorn

uvicorn main:app --reload --port 8000

npm create vite@latest frontend -- --template react

npm install -D @tailwindcss/vite tailwindcss

cd frontend
npm run dev

npm install lucide-react`

npm install recharts

uvicorn main:app --reload --port 8000

story.md
B2B companies waste millions chasing unpaid invoices because traditional credit checks only look backward. By the time an invoice is flagged as late, cash flow has already taken a hit.

For Week 10 : I solved this by shipping a two-stage ML risk engine:

Stage 1 (Classification): A Random Forest model flags high-risk invoices before they mature.

Stage 2 (Regression): A HistGradientBoostingRegressor predicts the exact delay duration in days, giving finance teams a real dynamic runway.

Outputs stream live straight to a React dashboard via FastAPI.

Tech Stack: Python, Scikit-learn, Pandas, FastAPI, React, Tailwind CSS.

Simple, preventive risk modeling > reactive collections.