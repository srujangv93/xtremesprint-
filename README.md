# Xtreme101 - Coding Competition Platform 🚀

A modern, full-featured competitive coding platform built for hackathons, IEEE events, and coding contests. Features an in-browser **Monaco Editor** (VS Code), sandboxed multi-language code execution (**Judge0**), live contest leaderboard, and **Turso (Serverless SQLite)** for zero-hassle cloud storage.

---

## ✨ Features

- **HackerRank / LeetCode Split View**: Left panel with problem statement, constraints, and sample cases; right panel with the Monaco Code Editor.
- **Multi-Language Support**:
  - 🐍 **Python 3** (3.12)
  - ☕ **Java** (JDK 17)
  - ⚡ **C++** (GCC 14)
  - 🟨 **JavaScript** (Node.js 22)
- **Live Sandboxed Execution (Judge0 CE)**:
  - **Run Code**: Tests against visible sample test cases.
  - **Submit Code**: Evaluates against all hidden test cases and awards points.
- **Real-Time Leaderboard**: Ranks contestants by score, problems solved, and submission timestamps.
- **Custom Contestant Handle**: Contestants can set and change their handle anytime with persistent progress.
- **Admin Dashboard (`/admin`)**:
  - Add custom questions with Markdown descriptions.
  - Configure sample test cases (visible) and hidden test cases (for grading).
  - Customize points and execution time limits.
- **Dual-Mode SQLite Database**:
  - **Local Mode**: Uses local SQLite file (`contest.db`) automatically with zero configuration.
  - **Production Mode**: Seamlessly switches to **Turso** when hosted on **Vercel**.

---

## 🚀 Quickstart (Run Locally)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deploying to Vercel with Turso (100% Free, No Credit Card)

### Step 1: Create your free Turso Database
1. Go to [turso.tech](https://turso.tech) and click **"Start Free"** (sign in with your GitHub account).
2. Click **"Create Database"** and name it (e.g., `xtreme-contest`).
3. Copy your:
   - **Database URL** (`libsql://xtreme-contest-[username].turso.io`)
   - **Auth Token** (Generate or copy token from the dashboard)

### Step 2: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit of Xtreme101 competition platform"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### Step 3: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and import your GitHub repository.
2. Under **Environment Variables**, add:
   - `TURSO_DATABASE_URL` = `libsql://your-db-name.turso.io`
   - `TURSO_AUTH_TOKEN` = `<your-turso-token>`
   - `JUDGE0_API_URL` = `https://ce.judge0.com`
3. Click **Deploy**!

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Editor**: `@monaco-editor/react` (VS Code engine)
- **Styling**: Tailwind CSS
- **Database**: Turso / `@libsql/client` (Serverless SQLite)
- **Judge Engine**: Judge0 CE Public Sandbox API
