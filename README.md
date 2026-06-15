# DebtLens

> **AI-Powered Technical Debt Intelligence Platform**  
> Built for the **OSC AI BUILD 1.0 Hackathon** (June 2026)

DebtLens answers one critical question for software engineering teams: **"Where is our technical debt, and what should we fix first?"**

Instead of overwhelming developers with thousands of minor formatting or style alerts, DebtLens mines your Git history and analyzes code complexity to construct an actionable, high-ROI refactoring plan.

---

##  Problem Statement

Software projects accumulate technical debt in silence: overly complex code loops, high-churn files modified by multiple developers, and legacy credentials exposed in Git history. 

Existing tools show graphs of passive metrics but do not provide **decisions**. They cause dashboard fatigue because they cannot differentiate between a complex file that is never edited and a complex file that is modified daily and breaks frequently. 

DebtLens solves this by correlating code quality metrics with developer behavior, identifying hotspots that actively slow down development.

---

##  Features

* **Refactoring Priorities Dashboard**: Ranks code files by a weighted technical debt severity score, generating human-readable refactoring checklists using Claude AI.
* **Complexity × Churn Quadrant Map**: An interactive 2D scatter plot mapping files. Files in the top-right quadrant have high complexity and experience frequent modifications—highlighting them as critical refactor targets.
* **Codebase Q&A Chat**: An interactive chat interface where you can query the system about architecture, complexity rankings, or ask for guidance on which components need testing first.
* **API Key Risk Scanner**: Traverses entire Git commit diff histories to scan and flag leaked secrets (AWS, Stripe, OpenAI) that were checked in historically.
* **Savings Calculator (ROI Planner)**: Simulates the financial and temporal value of cleaning code. Select files to refactor to estimate hours saved and bugs prevented over the next quarter.
* **Analysis Console Log**: A terminal log widget displaying backend pipeline execution steps in real-time.

---

##  Tech Stack

* **Frontend**: React, TypeScript, Tailwind CSS v4, Lucide Icons
* **Backend**: FastAPI (Python), Uvicorn
* **Algorithms & Analyzers**:
  * **Radon**: Cyclomatic complexity analysis
  * **GitPython**: Git history mining and diff traversal
  * **scikit-learn**: MinMaxScaler normalization and weighted priority prioritization engine
  * **Anthropic Claude API**: For structural recommendations and interactive chat answers

---

##  Local Setup Instructions

### Prerequisites
* Python 3.9+
* Node.js 18+

### 1. Backend Setup
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set your Anthropic API Key (Optional; falls back to offline model context simulator if empty):
   Create a `.env` file in the `backend/` folder:
   ```text
   ANTHROPIC_API_KEY=your-api-key-here
   ```
4. Start the FastAPI server:
   ```bash
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

### 2. Frontend Setup
1. Navigate to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and go to `http://localhost:5173/`. Paste your local project directory path into the scan field to run diagnostics.

---

##  Deployment Instructions

### Frontend (Vercel)
The frontend is a static Vite app that compiles into static HTML/JS/CSS assets.
1. Install Vercel CLI globally or use the Vercel GitHub integration.
2. In the `frontend` folder, run:
   ```bash
   vercel
   ```
3. Configure the build command as `npm run build` and output directory as `dist`.

### Backend (Render / Railway)
The backend is a FastAPI Python application.
1. **Render**:
   * Create a new Web Service connected to your GitHub repo.
   * Set Root Directory to `backend`.
   * Set Start Command to `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
   * Set your `ANTHROPIC_API_KEY` in Environment Variables.
2. **Railway**:
   * Create a new project and link your repository.
   * Set the variables in the dashboard and specify `backend` as the build directory.

---

## 👥 Team Details

* **Member 1 Name** - Role / Contribution
* **GitHub Link**: [Your Profile](https://github.com)

---

## 🎥 Demo Links

* **Live Platform Link**: [Deploy URL Placeholder](https://vercel.app)
* **Demo Video Link**: [YouTube/Loom URL Placeholder](https://youtube.com)
