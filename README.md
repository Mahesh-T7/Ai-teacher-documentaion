# AI Teacher Documentation Management Portal

[![Deploy Frontend to GitHub Pages](https://github.com/Mahesh-T7/Ai-teacher-documentaion/actions/workflows/deploy.yml/badge.svg)](https://github.com/Mahesh-T7/Ai-teacher-documentaion/actions/workflows/deploy.yml)
[![Live Site](https://img.shields.io/badge/Live_Site-GitHub_Pages-2563eb?style=flat&logo=github)](https://Mahesh-T7.github.io/Ai-teacher-documentaion/)

A secure, modern web application designed for school teachers to maintain daily teaching diaries, lesson plans, classroom photographs, student attendance, practical activities, assessments, syllabus progress, and official inspection documentation.

---

## 🏛️ Project Architecture

```
AI Teacher Documentation Management Portal/
├── backend/
│   ├── .env.example                     # Environment template (PORT, MONGODB_URI, JWT_SECRET, etc.)
│   ├── .env                             # Local backend environment
│   ├── package.json                     # Express, Mongoose, JWT, bcryptjs, CORS
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                    # MongoDB Atlas connector & status tracker
│   │   │   └── cors.js                  # Multi-origin CORS configuration
│   │   ├── controllers/
│   │   │   ├── authController.js        # Register, login, getMe
│   │   │   ├── userController.js        # Teacher profile update
│   │   │   ├── dashboardController.js   # Live MongoDB metric aggregations & seeding
│   │   │   ├── timetableController.js   # Timetable CRUD & duplicate prevention
│   │   │   ├── diaryController.js       # Daily teaching diary CRUD & verification
│   │   │   ├── lessonPlanController.js  # Lesson plan CRUD, approval & duplication
│   │   │   ├── aiController.js          # Phase 3: AI generation, drafts & lesson plan approval
│   │   │   ├── photoController.js       # Phase 4: Multi-image uploads, captions, & diary links
│   │   │   ├── attendanceController.js  # Phase 4: Student roster, CSV import, roll-call & audits
│   │   │   ├── practicalController.js   # Phase 4: STEM/Lab practical activities CRUD & search
│   │   │   └── assessmentController.js  # Phase 4: Tests, quizzes, marks entry & learning gaps
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js        # Bearer token JWT verification
│   │   │   ├── errorMiddleware.js       # Centralized 404 & error handlers
│   │   │   └── validationMiddleware.js  # Input sanitization and error schemas
│   │   ├── models/
│   │   │   ├── User.js                  # Teacher model with bcrypt hashing
│   │   │   ├── Timetable.js             # Weekly schedule, period timings, room assignment
│   │   │   ├── DailyTeachingEntry.js    # Comprehensive daily teaching diary records
│   │   │   ├── LessonPlan.js            # Standardized 5E pedagogical lesson plans
│   │   │   ├── AIDraft.js               # Saved AI assistant outputs & approval metadata
│   │   │   ├── AIUsageLog.js            # Usage logging and token tracking
│   │   │   ├── UploadedPhoto.js         # Classroom photographs & consent metadata
│   │   │   ├── Student.js               # Student roster & roll numbers
│   │   │   ├── Attendance.js            # Daily roll-call records & audit history
│   │   │   ├── PracticalActivity.js     # Laboratory sessions, tools, and outcomes
│   │   │   └── Assessment.js            # Tests, marks array, and learning gap detection
│   │   ├── routes/
│   │   │   ├── authRoutes.js            # /api/auth routes
│   │   │   ├── userRoutes.js            # /api/users routes
│   │   │   ├── dashboardRoutes.js       # /api/dashboard routes
│   │   │   ├── timetableRoutes.js       # /api/timetable routes
│   │   │   ├── diaryRoutes.js           # /api/diary routes
│   │   │   ├── lessonPlanRoutes.js      # /api/lesson-plans routes
│   │   │   ├── aiRoutes.js              # /api/ai routes
│   │   │   ├── photoRoutes.js           # /api/photos routes
│   │   │   ├── attendanceRoutes.js      # /api/attendance routes
│   │   │   ├── practicalRoutes.js       # /api/practicals routes
│   │   │   └── assessmentRoutes.js      # /api/assessments routes
│   │   ├── services/
│   │   │   └── aiService.js             # 10 pedagogical AI generators & CBSE Class 9 AI units
│   │   ├── app.js                       # Express application configuration & static /uploads
│   │   └── server.js                    # Server bootstrap & graceful shutdown
│   └── tests/
│       ├── auth.test.js                 # Phase 1 automated test suite (11/11 passing)
│       ├── phase2.test.js               # Phase 2 automated test suite (13/13 passing)
│       └── phase3_4.test.js             # Phase 3 & 4 automated test suite (19/19 passing)
│
├── frontend/
│   ├── .env.example                     # VITE_API_BASE_URL template
│   ├── .env                             # Local frontend configuration
│   ├── package.json                     # React 19, React Router DOM, Axios, Lucide React
│   ├── vite.config.js                   # Vite bundler with Tailwind CSS v4 plugin
│   ├── index.html                       # Entry HTML with Inter typography
│   └── src/
│       ├── api/                         # Axios client with JWT interceptor & API services
│       │   ├── authApi.js
│       │   ├── userApi.js
│       │   ├── dashboardApi.js
│       │   ├── timetableApi.js
│       │   ├── diaryApi.js
│       │   ├── lessonPlanApi.js
│       │   ├── aiApi.js
│       │   ├── photoApi.js
│       │   ├── attendanceApi.js
│       │   ├── practicalApi.js
│       │   └── assessmentApi.js
│       ├── components/
│       │   ├── common/                  # StatCard, Badge, LoadingSpinner, EmptyState, RichTextEditor, ConfirmModal
│       │   └── layout/                  # Sidebar, TopNavbar, MainLayout, ProtectedRoute
│       ├── context/                     # AuthContext (state & token), ToastContext
│       ├── pages/
│       │   ├── auth/                    # Login & Registration pages
│       │   ├── dashboard/               # Live MongoDB Metrics Dashboard
│       │   ├── profile/                 # Teacher Profile Management page
│       │   ├── timetable/               # Timetable Weekly Grid & Period Manager
│       │   ├── diary/                   # Daily Teaching Diary list & Multi-section Form
│       │   ├── lessonPlans/             # Lesson Plans Manager, 5E Form & Approval
│       │   ├── ai/                      # AI Teaching Assistant (10 Generators, CBSE Units, Kannada)
│       │   ├── photos/                  # Photo Docs (Multi-upload, Gallery, Diary Links)
│       │   ├── attendance/              # Attendance (Roster, CSV Import, Roll-call, Monthly)
│       │   ├── practicals/              # Practical Activities (STEM/Lab tools & steps)
│       │   ├── assessment/              # Assessments (Quizzes/Tests, Marks, Learning Gaps)
│       │   └── placeholders/            # Placeholders for future phases (Syllabus Tracker, Reports, etc.)
│       ├── App.jsx                      # Route definitions & protected layout wrapper
│       └── main.jsx                     # Application root
```

---

## 🚀 Quick Setup Instructions

### Prerequisites
- Node.js (v18.x or v20.x or v22.x)
- npm (v9.x or v10.x)
- MongoDB Atlas account (or local MongoDB daemon)

---

### Step 1: Backend Setup

1. Open a terminal and navigate to `backend`:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in `backend/.env`:
   ```ini
   PORT=5000
   NODE_ENV=development
   # Example MongoDB Atlas URI:
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/teacher_portal?retryWrites=true&w=majority
   # Or local MongoDB:
   # MONGODB_URI=mongodb://127.0.0.1:27017/teacher_portal

   JWT_SECRET=super_secret_jwt_teacher_portal_key_2026_dev_secure
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=http://localhost:5173
   ```
4. Run automated test suites:
   ```bash
   npm test
   ```
   *Runs both `tests/auth.test.js` and `tests/phase2.test.js` (24/24 tests pass).*
5. Start backend development server:
   ```bash
   npm run dev
   # or npm start
   ```
   Backend will be running at `http://localhost:5000`.

---

### Step 2: Frontend Setup

1. Open a new terminal and navigate to `frontend`:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in `frontend/.env`:
   ```ini
   VITE_API_BASE_URL=http://localhost:5000/api
   ```
4. Start Vite development server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to `http://localhost:5173`.

---

## 🌟 Modules Implemented in Phase 2

### 1. Timetable Management (`/timetable`)
- **Interactive Weekly Grid:** Displays Monday to Saturday period allocations.
- **Add / Edit Period Slot:** Configure weekday, period number (1 to 10), start and end times, class, section, subject, room, and remarks.
- **Accidental Duplicate Prevention:** Prevents creating two periods for the same teacher on the same day and period.
- **Filters:** By Weekday, Class, and Subject.
- **Historical Integrity:** Historical diary entries retain their original recorded subject, class, and period even if the timetable is modified later.

### 2. Daily Teaching Diary (`/daily-diary`)
- **A. Basic Information:** Teaching date, day of week (auto-computed in `Asia/Kolkata`), class, section, subject, period, and timings. Includes **"Auto-populate from Timetable"** and **"Link Approved Lesson Plan"** shortcuts.
- **B. Lesson Information:** Unit, chapter, topic, subtopic, learning objectives, previous knowledge, introduction hook, methodology, and teaching aids.
- **C. Detailed Teaching Content (Rich Text):** Full rich text editing with headings, subheadings, paragraphs, bullet lists, numbered lists, and pre-formatted pedagogical callouts (Definitions, Real-life Examples, Questions Discussed, Practical Activities). Preserved in MongoDB without formatting loss.
- **D. Classroom Activities:** Document activities conducted, student participation rate, group discussions, demonstrations, and materials used.
- **E. Learning Outcomes:** Student comprehension, skills developed, difficulties observed, and students requiring remediation.
- **F. Completion & Verification:** Homework assigned, teacher remarks, next class plan, and teaching status (`Draft`, `Partially Completed`, `Completed`).
- **Confirmation Rule:** Marking an entry as `Completed` requires teacher confirmation dialog; approved lesson plans never automatically mark a diary entry as completed.
- **Search & Filters:** Search topics, units, and content; filter by date, date range, class, subject, and status.

### 3. Lesson Plan Management (`/lesson-plans`)
- **20 Comprehensive Fields:** Title, academic year, class/section, subject, unit/chapter, topic, duration, objectives, prior knowledge, introduction, detailed explanation (rich text), definitions, methodology, aids, activities, real-life examples, assessment questions, outcomes, homework, and teacher remarks.
- **Workflow States:** `Draft` -> `Submitted` -> `Approved`.
- **Duplicate Action:** 1-click duplication ("Copy of...") to save teacher planning time.
- **Association:** Approved lesson plans can be selected in the Daily Diary to auto-fill lesson topics and objectives.
- **Inspection Preview:** Formatted printable preview modal for school inspection audits.

---

## 🌟 Modules Implemented in Phase 3 & Phase 4

### 1. AI Teaching Assistant (`/ai-assistant`)
- **10 Pedagogical Generation Tools:**
  1. AI Lesson Plan Generator (5E model)
  2. Detailed Teaching Content Generator
  3. AI Revision Notes Generator
  4. MCQ & Quiz Generator
  5. Question Paper Maker (1-mark, short, long questions with marking scheme)
  6. Classroom Worksheet Generator
  7. Classroom Activity Generator
  8. Quick Revision Flashcards
  9. Conceptual Explanation Generator
  10. PPT Slide Outline & Speaking Notes Generator
- **Curriculum Units Preset:** Pre-loaded with CBSE Class 9 Artificial Intelligence units (Units 1-5) and support for custom units.
- **Trilingual Support:** Generates structured teaching assets in **English**, **ಕನ್ನಡ (Kannada)**, or **Kannada + English (Bilingual)** with full Unicode compliance.
- **Safety & Verification:** AI content generates as an editable draft. Teachers can refine sections in the Rich Text Editor and click **"Approve to Lesson Plan"** to formalize the plan. AI outputs never auto-mark daily diary entries as completed.

### 2. Classroom Photo Documentation (`/photo-docs`)
- **Multi-Image Uploader:** Securely upload up to 10 JPG, PNG, or WebP photographs per session (5MB limit per file).
- **Metadata Tagging:** Class, section, subject, unit, topic, caption, and teaching diary entry linking.
- **Child Privacy & Media Compliance:** Explicit parental/school media consent confirmation before saving.
- **Gallery Grid & Fullscreen Viewer:** Interactive gallery with class and subject filters, fullscreen image viewer, caption editing, and secure file deletion.

### 3. Student Roster & Attendance Management (`/attendance`)
- **Student Roster Management:** Add students individually or bulk-import entire rosters via spreadsheet/CSV pasting. Unique roll number validation per class and section.
- **Daily Roll Call:** 1-click Present, Absent, and Leave status toggles with "Mark All Present" shortcut and individual remarks.
- **Duplicate Protection with Audit History:** Prevents accidental duplicate roll calls for the same class and date. Re-submitting updates the record while logging modification timestamp, user, and reason in `auditHistory`.
- **Live Statistics & Monthly Analytics:** Computes live total, present count, absent count, leave count, and attendance percentage. The **Monthly Analytics** tab generates class-wide working days summaries and identifies students falling below 75% attendance.

### 4. Practical Activities & STEM Lab (`/practicals`)
- **Lab Documentation:** Log computer science coding labs, science experiments, and classroom practical demonstrations.
- **Required Fields:** Date, class/section, subject, unit, experiment title, tools & software/hardware used, practical steps/procedure, student participation mode, learning outcomes, and teacher remarks.
- **Photographic Evidence Linkage:** Associate authentic classroom practical photos and daily diary entries directly with each activity log.

### 5. Assessments & Learning Gap Analysis (`/assessment`)
- **6 Assessment Types:** Quiz, Assignment, Unit Test, Practical Assessment, Project, and Classroom Activity.
- **Marks Entry Table:** Automatically populates students from the class roster. Enter student marks to auto-compute individual percentage, class average %, highest score, and lowest score.
- **Learning Gaps Identification:** Diagnostic fields for identifying learning gaps and detailing remedial action plans.
- **Remedial Attention Dashboard:** The **Learning Gaps** tab flags all students scoring below 40% across quizzes and tests, listing affected subjects for targeted intervention.

---

## 🚀 Modules Implemented in Phase 5, Phase 6 & Phase 7

### 1. Reports & Downloads Center (`/reports`) - Phase 5
- **11 Statutory Report Types:**
  1. *Daily Teaching Report:* Single-day detailed lesson breakdown, actual rich explanations & photo tiles.
  2. *Weekly Academic Report:* Mon–Sat weekly syllabus coverage, timetable adherence & activity summary.
  3. *Monthly Teaching Report:* Comprehensive monthly log, student attendance averages & syllabus pacing.
  4. *Custom Date-Range Report:* Tailored multi-week or term reporting with section filters.
  5. *Class-wise Report:* Complete longitudinal teaching log for a specific class section.
  6. *Subject-wise Report:* Subject-specific curriculum coverage and practicals log.
  7. *Practical Activities Report:* Lab experiments, tools utilized, code repositories & photo evidence.
  8. *Attendance Register Report:* Roll-call percentages, total sessions & students below 75%.
  9. *Assessment & Marks Report:* Exam scores, class averages, toppers & learning gap analysis.
  10. *Syllabus Completion Report:* Prescribed vs covered units, term progress & pending topics.
  11. *Academic-Year Dossier:* Full annual documentation dossier for institutional records.
- **Multi-Format Export Engines:**
  - **A4 PDF:** School letterhead, teacher details, full actual teaching content (no summaries), high-resolution photo evidence tiles with captions, signatures & page numbers.
  - **Word DOCX:** Clean typography, formal structured tables, actual classroom text, signatures & headers.
  - **Excel XLSX:** 8 comprehensive worksheets (Daily, Weekly, Monthly, Attendance, Practicals, Assessments, Syllabus, Photo Index).
  - **Bundled ZIP:** Complete package combining PDF, Word, Excel and photo files into an organized archive.
- **Preview & Approval Workflow:** Live preview modal before generation; newly generated reports are saved as `Draft` and require explicit teacher confirmation before being marked `Approved`.
- **Automated Scheduler:** Background report generation engine configured in `Asia/Kolkata` timezone with duplicate run prevention and error handling.

### 2. School Inspection Mode & Document Centre (`/document-centre`) - Phase 6
- **Institutional Audit Dashboard:** Instant statutory audit overview with weighted inspection readiness score (0–100%) calculated honestly from actual database records (no fabricated 100% scores).
- **Missing Documentation Detection Checklist:**
  - Audits records across Profile, Timetable, Daily Teaching Diary, Lesson Plans, Attendance, Practical Activities, Assessments, Syllabus, and Photographs.
  - Clearly distinguishes status states: `Completed`, `Approved`, `Draft / Incomplete`, `Missing`, `Not Configured`, and `Not Applicable`.
  - Filterable by Category, Audit Status, and search terms.
- **12-Folder Academic-Year Inspection ZIP Package:**
  - Generates a pre-compiled institutional inspection archive containing 12 organized folders:
    1. `01_Teacher_Profile/` (Profile certificate PDF & JSON)
    2. `02_Timetable/` (Weekly schedule grid & period timings)
    3. `03_Lesson_Plans/` (Approved 5E pedagogical lesson plans)
    4. `04_Daily_Teaching_Diary/` (Full daily classroom teaching logs)
    5. `05_Weekly_Reports/` (Consolidated weekly reports)
    6. `06_Monthly_Reports/` (Monthly academic summaries)
    7. `07_Attendance/` (Student roll call registers & percentage logs)
    8. `08_Practical_Activities/` (Laboratory experiments & tools)
    9. `09_Assessments/` (Exam marks, score distributions & gap analysis)
    10. `10_Syllabus_Progress/` (Unit-wise curriculum completion logs)
    11. `11_Photo_Evidence/` (Classroom photo evidence & metadata)
    12. `12_Inspection_Summary/` (Official Inspection Summary Certificate PDF)

### 3. Backup, Restore & Production Hardening (`/backup-restore`) - Phase 7
- **Full Teacher Data Export:**
  - 1-click export of the teacher's complete structured documentation into an open JSON archive with SHA-256 cryptographic checksum.
  - Covers all 9 academic modules with encrypted credentials safely stripped.
- **Pre-Restore Dry-Run & Conflict Detection:**
  - Validates JSON format and schema integrity before touching the database.
  - Compares incoming records against existing database records; detects timetable slot and diary period collisions.
  - Provides a dry-run preview with incoming vs existing counts.
- **Safe Restore Strategies:**
  - *Non-Destructive Merge (Default):* Inserts missing records, skips exact duplicates, preserves all untouched records.
  - *Synchronized Clean Import:* Synchronizes collections with incoming backup.
  - Requires explicit teacher confirmation before executing.
- **Audit Logging:** Every export, preview dry-run, and executed restore is permanently logged in `BackupLog` with IP, timestamp, record count, and strategy.
- **Pluggable Cloud Storage Adapter:** Unified interface (`backend/src/config/storage.js`) supporting local disk storage and cloud storage (S3 / Cloudinary).
- **Production Hardening:**
  - Sliding-window rate limiting middleware (`backend/src/middleware/rateLimiter.js`) protecting auth and generation endpoints.
  - Security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection`).
  - Production health and diagnostic check at `/api/health`.
- **Deployment Blueprints:**
  - Frontend: `frontend/vercel.json` with SPA rewrite rules and long-term asset caching.
  - Backend: `backend/render.yaml` with build and start commands, environment variable sync, and health checks.

---

## ⚙️ Environment Variables Reference

### Backend (`backend/.env`)
```bash
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/teacher_portal?retryWrites=true&w=majority
JWT_SECRET=super_secret_production_key_change_in_prod
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://ai-teacher-portal.vercel.app
TIMEZONE=Asia/Kolkata
STORAGE_PROVIDER=local # 'local' or 'cloud'
```

### Frontend (`frontend/.env`)
```bash
VITE_API_URL=https://ai-teacher-portal-api.onrender.com/api
```

---

## 🧪 Automated Test Suite Verification

Run the comprehensive test suite across all 7 phases:
```bash
cd backend
npm test
```
The test suite validates:
- **Phase 1:** Authentication, registration, login, JWT validation, profile updates, and MongoDB health checks.
- **Phase 2:** Timetable CRUD, period collision prevention, daily teaching diary rich text preservation, and 5E lesson plan workflows.
- **Phase 3 & 4:** 10 AI pedagogical tools, CBSE Class 9 AI units, trilingual support (English, Kannada, Bilingual), photo uploads & consent, attendance roster & CSV imports, practical lab activities, and assessment marks entry with learning gap flagging.
- **Phase 5:** 11 report types, A4 PDF generation with detailed teaching content, Word DOCX generation, Excel XLSX with 8 worksheets, bundled ZIP archives, teacher approval workflows, and scheduled report automation in `Asia/Kolkata`.
- **Phase 6:** Honest inspection readiness scoring, missing documentation checklist detection, and 12-folder academic-year inspection package generation.
- **Phase 7:** Health diagnostics, storage adapter operations, full backup export with SHA-256 checksum, dry-run restore preview, safe merge restore, and backup audit logging.
- **AI Document Intelligence:** Universal document upload centre (PPT, PPTX, PDF, DOC, DOCX, XLS, XLSX, TXT, Images), OpenXML/PDF/Mammoth/ExcelJS/Tesseract extraction, concept analysis with extracted vs inferred provenance, multi-document combination & conflict detection, 5 automatic teaching documentation artifacts (Lesson Plan, Classroom Notes, Question Bank, Activity Plan, Diary Draft), PowerPoint slide-wise explanations, and Word/PDF exports.

---

## 🧠 AI Document Intelligence and Automatic Teaching Documentation

A state-of-the-art educational document analysis and generation module enabling teachers to upload educational files and generate complete pedagogical dossiers.

### 1. Document Upload Centre
- **Supported Formats:** PPT, PPTX, PDF, DOC, DOCX, XLS, XLSX, TXT, JPG, JPEG, PNG.
- **File Validation & Safety:** File size limits (50 MB), extension verification, MIME type matching, and magic byte checking (`%PDF-`, `PK\x03\x04`, `\x89PNG`, `\xFF\xD8\xFF`). Immediate rejection of executable binary headers (`MZ`, `ELF`).
- **Deduplication:** Automatic SHA-256 hash calculation prevents redundant re-processing.
- **Categorisation:** Academic Year, Class, Subject, Unit, Chapter, Topic, and Teaching Date.
- **File Lifecycle:** Drag-and-drop multiple upload, authenticated preview streaming, version replacement, and secure deletion.

### 2. Multi-Format Document Extraction Service
- **PPT / PPTX:** OpenXML parser extracting slide numbers, titles, bullet points, structured tables, speaker notes, and embedded media.
- **PDF:** Page-by-page text stream preservation, table structure recognition, and OCR scanning fallback for scanned documents via Tesseract.js.
- **Word (.docx / .doc):** Heading hierarchy (`h1`, `h2`, `h3`), paragraphs, bullet lists, and HTML tables via Mammoth.
- **Excel (.xlsx / .xls):** Worksheets, rows, column headers, and tabular lesson outlines via ExcelJS.
- **Images (.png, .jpg, .jpeg):** Tesseract.js OCR text recognition and Gemini Vision / pedagogical diagram schematic analysis.
- **Source Citations:** Every extracted section permanently retains `{ fileId, fileName, itemType, itemNumber, title, label }`.

### 3. AI Concept Analysis & Multi-Document Combination
- **Concept Tagging:** Identifies Subject, Class, Unit, Chapter, Topic, Subtopics, Key Concepts, Definitions, Objectives, Examples, Activities, and Diagrams.
- **Strict Provenance:** Distinguishes directly extracted content (`origin: 'extracted'`) from AI synthesized content (`origin: 'inferred'`).
- **Conflict & Duplicate Detection:** Flags discrepancies in depth or definitions across combined source files for teacher resolution.

### 4. Automatic Teaching Documentation (5 Comprehensive Artifacts)
- **A. Detailed Lesson Plan:** 13 pedagogical dimensions (Title, Learning Objectives, Previous Knowledge, Hook, Detailed Explanation, Definitions, Methodology, Teaching Aids, Activities, Examples, Assessment, Outcomes, Homework).
- **B. Classroom Teaching Notes:** 8 sections (Topic Explanation, Definitions, Subtopics, Examples, Step-by-Step Derivations, Discussion Prompts, Applications, Summary).
- **C. Question Bank:** MCQs with 4 options, True/False, Fill in blanks, Short answers, Long answers with rubrics, and Answer Keys.
- **D. Classroom Activity Plan:** Individual tasks with durations, Collaborative group activities, and Practical lab demonstrations with safety notes.
- **E. Daily Teaching Diary Draft:** Generated in 'Draft' status with an explicit teacher confirmation requirement before completion.

### 5. Slide-Wise Teaching Explanations (PowerPoint)
- For every presentation slide: Slide number, heading, original extracted content, detailed teacher classroom delivery explanation, student-friendly analogies, interactive questions to ask students, and 2-minute quick activities.

### 6. Export & Module Integrations
- **Lesson Plan Management:** One-click conversion to a formal `LessonPlan` record.
- **Daily Teaching Diary:** Creation of `DailyTeachingEntry` draft.
- **Word Export:** Microsoft Word `.docx` generated via `docx` Packer.
- **PDF Export:** PDF dossier generated via `pdfkit`.
