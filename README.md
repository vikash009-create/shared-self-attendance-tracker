# Shared Self-Attendance Tracker — Full-Stack Web Application

> **Academic Notice**: *This is an unofficial student attendance self-management and estimation tool. It does not replace official institutional attendance sheets published by college faculty or administration.*

---

## 1. Project Overview & Problem Statement

Students frequently encounter delayed attendance postings from institutional departments, discovering attendance shortages too late to take corrective action before examination debarment. 

**Shared Self-Attendance Tracker** solves this by providing:
1. **Accurate Self-Tracking**: Track lectures subject-wise in real time.
2. **Early Shortage Warning**: Calculates the exact number of consecutive classes required to reach target percentages (e.g., 75%).
3. **Safe Margin Calculator**: Tells students how many classes they can afford to miss while remaining in good standing.
4. **Peer Collaboration**: Create class groups with a 6-character code, broadcast timetable events or cancelled sessions, and allow classmates to sync with a single click.
5. **What-If Projection Simulator**: Experiment with future scenarios to plan leaves or exam prep.
6. **Data Portability**: Export complete records to RFC-4180 CSV anytime.

---

## 2. Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Recharts, React Router DOM.
- **Backend**: Node.js 24, Express, TypeScript, tsx, Zod (validation), bcryptjs (password hashing), jsonwebtoken (JWT).
- **Database Engine**:
  - **Local / Default**: Native `node:sqlite` (built into Node.js 24 with WAL mode enabled — zero external installation needed).
  - **Cloud / Production**: PostgreSQL & Supabase ready (`postgres-schema.sql` and `supabase/migrations/` provided with Row Level Security).
- **Testing**: Vitest, Supertest (33 automated unit and API integration tests passing).
- **Deployment**: Multi-stage `Dockerfile`, `render.yaml`, `vercel.json`.

---

## 3. Architecture & Folder Structure

```
GDSC/
├── client/                     # Frontend Application (React 18 + Vite)
│   ├── src/
│   │   ├── components/         # Navbar, Modals, DisclaimerBanner
│   │   ├── context/            # AuthContext, ThemeContext
│   │   ├── pages/              # Dashboard, Mark, Subjects, History, Calculator, Groups, Profile
│   │   ├── services/           # API HTTP Client & CSV Downloader
│   │   ├── types/              # TypeScript interface definitions
│   │   ├── App.tsx             # Route Configuration
│   │   └── main.tsx            # React Root
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
│
├── server/                     # Backend API (Node.js 24 + Express + TypeScript)
│   ├── src/
│   │   ├── db/
│   │   │   ├── database.ts     # node:sqlite Database Adapter with WAL
│   │   │   ├── schema.sql      # SQLite Schema DDL
│   │   │   ├── postgres-schema.sql # PostgreSQL / Supabase Schema with RLS
│   │   │   └── seed.ts         # Realistic Demo Data Seeder
│   │   ├── middleware/
│   │   │   └── auth.ts         # JWT Verification & Tenant Isolation
│   │   ├── routes/
│   │   │   ├── auth.ts         # Authentication & Profile
│   │   │   ├── subjects.ts     # Subject Management
│   │   │   ├── attendance.ts   # Attendance Logging & CSV Export
│   │   │   ├── groups.ts       # Class Groups & 1-Click Sync
│   │   │   └── stats.ts        # Dashboard Analytics & Projections
│   │   ├── utils/
│   │   │   └── calculator.ts   # Pure Mathematical Engine
│   │   └── index.ts            # Server Entry & Static Serving
│   ├── tests/
│   │   ├── calculator.test.ts  # 13 Mathematical Verification Tests
│   │   └── api.test.ts         # 20 API Integration Tests
│   └── package.json
│
├── scripts/
│   ├── dev.js                  # Concurrent Development Runner
│   └── package_zip.py          # Clean ZIP Packaging & Verification Script
│
├── supabase/
│   └── migrations/             # Supabase Migration Files
│
├── .env.example                # Safe Template for Environment Variables
├── .gitignore                  # Git Exclusions
├── Dockerfile                  # Multi-Stage Production Container Build
├── render.yaml                 # Render Blueprint Specification
├── vercel.json                 # Vercel Frontend Configuration
├── ARCHITECTURE.md             # System & Technical Documentation
├── README.md                   # Complete Documentation
└── package.json                # Root Orchestration Manifest
```

---

## 4. Mathematical Formula Correctness

All calculations conform strictly to the problem statement:

1. **Total Conducted Classes**:
   $$\text{Conducted} = \text{Attended} + \text{Absent}$$
   *Cancelled classes are strictly excluded from conducted count.*

2. **Attendance Percentage**:
   $$\text{Attendance \%} = \frac{\text{Attended}}{\text{Conducted}} \times 100$$
   *Zero conducted classes safely evaluates to 0.0% without division-by-zero errors.*

3. **Required Example Verification**:
   - Attended: 18
   - Absent: 6
   - Cancelled: 2
   - Conducted: 24
   - Percentage: $\frac{18}{24} \times 100 = 75.0\%$

4. **Consecutive Classes Needed to Reach Target ($T = \text{target} / 100$)**:
   $$\frac{A + x}{C + x} \ge T \implies x = \max\left(0, \left\lceil \frac{T \cdot C - A}{1 - T} \right\rceil\right)$$

5. **Safe Margin (Classes Allowed to Miss without Falling Below Target)**:
   $$\frac{A}{C + y} \ge T \implies y = \max\left(0, \left\lfloor \frac{A - T \cdot C}{T} \right\rfloor\right)$$

---

## 5. Local Installation & Setup

### Prerequisites
- Node.js 20+ (Node.js 24 LTS recommended)
- npm 10+
- Git

### Quick Start (In 3 Steps)

1. **Clone & Install Dependencies**:
   ```bash
   git clone <your-repo-url>
   cd shared-self-attendance-tracker
   npm run install:all
   ```

2. **Seed Realistic Demo Data (Optional but Recommended)**:
   ```bash
   npm run seed
   ```
   *Creates a demo account (`alex.student@university.edu` / `Student@123`) populated with course subjects, realistic attendance logs, and a shared class group with peer Sarah Chen.*

3. **Start the Application**:
   ```bash
   npm run dev
   ```
   - Client will open at: **http://localhost:5173**
   - Backend API runs at: **http://localhost:5000**

---

## 6. Environment Variables

Copy `.env.example` to `server/.env`:
```bash
cp .env.example server/.env
```

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `5000` | Port for Express backend |
| `NODE_ENV` | `development` | Environment mode (`development` / `production`) |
| `JWT_SECRET` | `super-secret-jwt...` | Secret key for token signing |
| `DB_TYPE` | `sqlite` | Database engine (`sqlite` or `postgres`) |
| `SQLITE_DB_PATH`| `./data/attendance.db` | Local SQLite database file |
| `DATABASE_URL` | *(optional)* | PostgreSQL / Supabase connection URL |
| `DEFAULT_ATTENDANCE_TARGET` | `75` | Default minimum attendance threshold |

---

## 7. Running Automated Tests

Run the complete Vitest test suite:
```bash
npm run test
```

Test Results:
- `server/tests/calculator.test.ts` (13 tests) — **PASSED**
  - Standard 75% target calculation
  - Cancelled class exclusion verification
  - Zero conducted division safety
  - Shortage consecutive class solver
  - Safe margin solver
  - Edge case: impossible 100% target after missing a class
  - What-if projection formulas
- `server/tests/api.test.ts` (20 tests) — **PASSED**
  - Authentication flow (signup, login, duplicate email guard)
  - Subject creation & code collision prevention
  - Attendance recording & duplicate slot check
  - CSV export RFC-4180 format
  - Group creation, invite code join, broadcast, and 1-click personal sync

---

## 8. Production Build & Deployment

### Single-Command Production Build
```bash
npm run build
```
This builds the React application into `client/dist/` and compiles the TypeScript server into `server/dist/`. In production, the Node server serves both the REST API and the static React bundle.

### Running in Production
```bash
npm run start
```
Open **http://localhost:5000** in your browser.

### Docker Deployment
```bash
docker build -t shared-attendance-tracker .
docker run -p 5000:5000 -v attendance-data:/app/server/data shared-attendance-tracker
```

### Deploying to Render
1. Push your repository to GitHub.
2. In Render Dashboard, click **New > Blueprint**.
3. Select your repository. Render will automatically detect `render.yaml`, provision the service, and mount persistent disk storage.

### Deploying with Supabase (PostgreSQL)
1. In your Supabase Project SQL Editor, execute `server/src/db/postgres-schema.sql` (or run migrations using Supabase CLI).
2. Set `DB_TYPE=postgres` and `DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres` in your server environment variables.

---

## 9. GitHub Repository Setup & Push Commands

To initialize and push this project to a new GitHub repository:

```bash
# 1. Initialize git (if not already initialized)
git init

# 2. Add all files
git add .

# 3. Create initial commit
git commit -m "feat: complete full-stack Shared Self-Attendance Tracker"

# 4. Set main branch
git branch -M main

# 5. Link your GitHub remote repository
git remote add origin https://github.com/<your-username>/shared-self-attendance-tracker.git

# 6. Push code to GitHub
git push -u origin main
```

---

## 10. Two-Minute Interactive Demo Walkthrough

1. **Accessing the App**: Navigate to `http://localhost:5173`. Click **"Quick Demo Login"** (or use `alex.student@university.edu` / `Student@123`).
2. **Dashboard Overview**:
   - View the overall percentage gauge and total metrics (Conducted: 71, Attended: 54, Absent: 17, Cancelled: 2).
   - See the **Shortage Alert Banner** highlighting that CS302 is in shortage (63.64%) and calculates that Alex must attend the next 10 consecutive classes.
   - Inspect the Recharts Bar Chart comparing each course against the 75% reference line.
3. **Marking a Class**:
   - Click **"+ Mark Class"** on the dashboard or top navigation.
   - Select `CS301`, choose today's date, pick `Attended`, add notes, and submit.
   - Observe that trying to log the same slot again triggers the built-in duplicate collision prevention.
4. **Attendance History & CSV Export**:
   - Go to **History**.
   - Filter by "Absent Only" to see missed classes, or search by keyword.
   - Click **"Export to CSV"** to download the formatted audit log.
5. **Projected Calculator**:
   - Go to **Calculator**.
   - Select `CS302 (DBMS)` and adjust the "Planned Future Classes" slider to 15.
   - Slide "Classes You Plan to Attend" to observe how attending 12 out of 15 classes raises your projected attendance above 75%.
6. **Class Groups Collaboration**:
   - Open **Class Groups**.
   - View the `CS 3rd Year - Section A` bulletin with invite code `CS3A26`.
   - See announcements posted by classmate Sarah Chen.
   - Click **"✓ Attended"** on the shared session to 1-click sync it into your personal attendance!
