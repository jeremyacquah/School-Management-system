# Greenwood Academy - School Management System (SMS)
### Cross-Platform Desktop (Windows & macOS) & Mobile (Android & iOS) App with Offline Support & Sync

---

## 🌟 Executive Summary

The **Greenwood Academy School Management System** is an offline-ready, cross-platform enterprise application built with a modern unified codebase:
- **Desktop Application**: Packaged with **Electron** for Windows (`.exe`) and macOS (`.dmg`/`.app`).
- **Mobile Application**: Native-ready with **Capacitor** for Android (`.apk`/Android Studio) and iOS (Xcode project) with adaptive touch-first navigation.
- **Universal Web & PWA**: Installable Progressive Web App with offline Service Worker and local client caching.
- **Relational Data Storage**: Relational SQL engine with strict foreign keys, cascade constraints, and full week/term linkage. Default SQLite relational database with zero external installation required, and companion `backend/schema.sql` ready for cloud PostgreSQL / MySQL clusters.
- **Offline Sync & Conflict Resolution**: Local IndexedDB/LocalStorage outbox queue that captures all mutations while disconnected and automatically flushes to `/api/sync` when reconnected, with an interactive Admin Conflict Resolution center for concurrent divergence.

---

## 👥 Roles & Permissions Matrix

| Capability | Administrator (`admin`) | Staff / Teacher (`user`) | Parent Portal (`parent`) |
| :--- | :---: | :---: | :---: |
| **All Modules CRUD** | **Full CRUD** (Create, Read, Update, Delete) | **Create & Read Only** (No Update, No Delete) | **Strictly Read-Only** (No Edit, No Delete) |
| **Data Scope** | All Students, Classes, Modules | All Assigned Classes & Students | **Isolated strictly to own child only** |
| **Manage Weeks & Terms** | ✅ Yes | ❌ Forbidden (HTTP 403) | ❌ Forbidden (HTTP 403) |
| **Set Fee Amounts** | ✅ Yes | ❌ Forbidden (HTTP 403) | ❌ Forbidden (HTTP 403) |
| **Resend Receipts** | ✅ Yes | ❌ Forbidden (HTTP 403) | ❌ View Only |
| **Input Attendance** | ✅ Yes | ✅ Yes (Auto Absent Marking) | ❌ View Only (By Week & Term) |
| **Edit Past Attendance** | ✅ Yes | ❌ Forbidden (HTTP 403) | ❌ View Only |
| **Input Grades** | ✅ Yes | ✅ Yes | ❌ View Only |
| **Edit Final Grades** | ✅ Yes | ❌ Forbidden (HTTP 403) | ❌ View Only |
| **Record Payments** | ✅ Yes | ✅ Yes (Partial & Cash/Bank/MoMo) | ❌ View Child Balance & Slips |
| **Timetable Scheduling** | ✅ Yes (Clash Detection Engine) | ❌ View Only | ❌ View Child Class Schedule |
| **Broadcast Notices** | ✅ Yes (One-Way SMS/WhatsApp) | ❌ View Only | ❌ View Only |
| **Manage Library Stock** | ✅ Yes (Add Titles & Stock) | ❌ Issue & Return Only | ❌ View Borrowed Books & Fines |
| **Exam Builder & Quizzes** | ✅ Yes (Create Banks & Tests) | ✅ Yes (Administer & Auto-grade) | ❌ View Child Quiz Results |
| **System Audit Log** | ✅ Yes (Inspect All Diffs) | ❌ Forbidden (HTTP 403) | ❌ Forbidden (HTTP 403) |
| **Offline Sync Conflicts** | ✅ Yes (Review & Resolve Diffs) | ❌ Auto-flagged for Admin | ❌ View Only |

---

## 🔑 Default Seed Credentials for Testing

| Role | Username | Password | Linked Child / Scope |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` | Full system access across all modules |
| **User (Teacher)** | `teacher_sarah` | `teacher123` | Sarah Jenkins (Teacher) • Create & Read permissions |
| **Parent 1** | `parent_david` | `parent123` | David Miller • Isolated strictly to **Ethan Miller** (SCH-2026-001) |
| **Parent 2** | `parent_fatima` | `parent123` | Fatima Al-Mansoor • Isolated strictly to **Zainab Al-Mansoor** (SCH-2026-002) |

> 💡 **Quick Role Switcher:** You can click the **Admin**, **Staff**, or **Parent** buttons in the top sidebar at any time to instantly switch profiles and test permission barriers and data isolation live!

---

## 📦 The 11 Core Modules

### 1. Attendance Tracking & Auto Absent Marking
- All attendance records link to **Academic Term** and **School Week** (Week 1 through 12).
- **Auto Absent Marking**: Any active student in the class not explicitly marked present is automatically recorded as `absent` with remark `"Auto-marked absent"`.
- Daily roll-call matrix with 4 statuses: `Present`, `Absent`, `Late`, `Excused`.
- Staff inputs daily records; only Administrators can edit past attendance entries.
- Computes weekly and term attendance percentages. Parents view child attendance breakdown by week and term.

### 2. Grades & Academic Reports
- Linked to **School Week** and **Academic Term**.
- Grade entry: `Assignment (20)`, `Quiz (20)`, `Midterm (20)`, `Exam (40)` $\to$ `Total (100)`.
- Auto-calculated Grade Letter (`A`, `B`, `C`, `D`, `F`) and GPA points (`4.0` scale).
- **Class Rankings Engine**: Auto-computes overall average score across all subjects and ranks students (`1st`, `2nd`, `3rd`, etc.).
- **Excel Import & Export**: One-click export to `.xlsx` format using SheetJS, and batch import from spreadsheets.
- **Official Report Cards**: Generates printable report card with school letterhead, student info, subject breakdown, overall average, GPA, class rank, attendance summary, and principal signature block.
- **Academic Transcripts**: Multi-term transcript with cumulative GPA.

### 3. Fees & Payment Management
- Fee categories: School Tuition, PTA Development Dues, Examination Fee, Lab & Computer Fee, Library Fines.
- Tracks `Total Due`, `Total Paid`, and `Remaining Balance` per student per term.
- Supports **Partial Payments** (e.g. paying $200 of $840).
- Payment methods supported:
  - `Cash` (Accounts Counter)
  - `Mobile Money` (M-Pesa, MTN MoMo, Airtel Money)
  - `Bank Wire Transfer`
  - `Debit / Credit Card`
- **Only Admin** can add or change fee structure amounts.

### 4. Receipt Generation (Short SMS / WhatsApp Ready)
- Auto-generates a unique sequence receipt for every payment (e.g. `REC-2026-00003`).
- Generates **short text format** receipt with variables `{student_name}`, `{amount_paid}`, `{date}`, `{receipt_number}`, `{balance}`.
- Standard short template:
  ```
  *GREENWOOD ACADEMY RECEIPT*
  Receipt: REC-2026-00003
  Student: Ethan Miller (SCH-2026-001)
  Paid: $200.00
  Date: 2026-10-02
  Method: MOBILE MONEY
  For: School Tuition Fee
  Balance Left: $240.00
  Verified by Greenwood Accounts.
  ```
- **1-Click WhatsApp Link**: Pre-populates `https://wa.me/?text=...` for instant mobile forwarding.
- **Printable Slip**: Compact receipt voucher view for physical receipt printers.
- **Admin Resend**: Only Admin can resend receipts to parents via SMS.

### 5. Timetable & Clash-Free Scheduling
- Weekly scheduling grid from Monday to Friday.
- **Automated Clash Detection Engine**:
  - Teacher Clash check: Prevents scheduling the same teacher in two rooms at the same time.
  - Room Clash check: Prevents double-booking a classroom for two classes.
  - Class Clash check: Prevents the same class from having two overlapping lessons.
  - Returns `HTTP 409 Conflict` with exact clash details if a conflict occurs.
- Admin assigns schedules; Users and Parents view only.

### 6. Notices & Messaging Broadcasts
- One-way broadcasts from Administrator to Students, Parents, or Staff.
- Short pre-configured SMS/WhatsApp templates with variable placeholders:
  - Fee Reminder Template
  - Daily Attendance Alert Template
  - Examination Schedule Notice
  - General Announcement
- Parents and students receive announcements in real-time in their portal.

### 7. Library Management
- Catalog tracking: ISBN, Title, Author, Category, Total Copies, Available Copies, Shelf Location, Daily fine rate.
- **Admin manages stock**: Add books, modify inventory counts.
- **Loan circulation**: Issue books to students (auto-sets 14-day due date, decrements available stock).
- **Return & Fine calculation**: Auto-computes overdue days and charges daily overdue fine.

### 8. Exam Builder & Auto-Grading
- Exam scheduling linked to Subject, Term, and Week.
- Objective question banks:
  - Multiple Choice (A, B, C, D) with answer keys and point values.
  - True / False questions.
- **Auto-Grading Engine**: When student answers are submitted, the engine evaluates every question against the answer key, tallies earned points, calculates percentage score, flags correct/incorrect items, and stores graded submissions instantly.

### 9. Asset & Inventory Tracking
- Inventory management for:
  - Lab gear (microscopes, balance scales, chemicals)
  - Classroom furniture (desks, ergonomic chairs)
  - IT equipment (desktop workstations, projectors, Wi-Fi routers)
  - Sports equipment
- Tracks Asset Tag, Category, Location, Quantity, Condition (`good`, `fair`, `needs_repair`, `damaged`), Custodian, and Estimated Value.

### 10. Audit Log & Security
- Immutable audit ledger recording every `CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `SYNC`, `RESOLVE_CONFLICT`, and `RESEND_RECEIPT` action.
- Captures: Timestamp, User ID, Username, Role, Module, Record ID, and Details/Diffs.
- **Only Admin can view**; unauthorized access attempts are blocked with `HTTP 403`.

### 11. Offline Mode & Conflict Resolution
- Full offline operation on both Desktop and Mobile!
- Local mutations made while disconnected are queued in an `outbox` (`localStorage` / IndexedDB).
- Network listener monitors connectivity; upon reconnection, automatically synchronizes outbox to `/api/sync`.
- **Conflict Detection**: If a record was modified concurrently on the central server while the client was offline, the mutation is flagged as a `conflict`.
- **Admin Conflict Resolution Screen**:
  - Displays side-by-side diff: Local Offline Version vs Central Server Version.
  - Admin decides resolution strategy:
    - **Accept Offline Edits** (`keep_local`): Overwrites server with client's changes.
    - **Discard Offline** (`keep_server`): Keeps server version.
    - **Custom Merge** (`merge`): Admin supplies merged payload.

---

## 🚀 Running the Project

### Prerequisites
- Node.js v18+ and npm installed.

### Quick Start (Full Stack in 1 Command)
```bash
# 1. Start backend server (also serves production frontend SPA and uploads)
npm start
```
Open your browser to: **`http://localhost:5000`**

### Running in Development Mode
```bash
# Terminal 1: Start API server
cd backend
npm run dev

# Terminal 2: Start Vite Dev Server with hot-reload
cd frontend
npm run dev
```
Open your browser to: **`http://localhost:5173`**

### Running Verification Tests
```bash
npm run test
# Executes 12 comprehensive automated tests covering authentication, role barriers,
# parent data isolation, timetable clash detection, short receipt generation,
# auto-grading, and offline sync!
```

---

## 🖥️ Desktop App Packaging (Windows & macOS)

The desktop application is powered by **Electron**:
```bash
# Run desktop app locally in Electron window:
npm run desktop

# Build Windows (.exe installer) or macOS (.dmg / .app):
npm run desktop:build
```
Features included:
- Native application menu with "File > Sync Now" and zoom controls.
- Offline SQLite local cache and IndexedDB storage.
- Native desktop window with minimize, maximize, and custom icon.

---

## 📱 Mobile App Packaging (Android & iOS)

The mobile application is powered by **Capacitor**:
```bash
# 1. Build web distribution
npm run build:frontend

# 2. Sync web assets into Capacitor platforms
cd frontend
npx cap sync

# 3. Open Android project in Android Studio (to generate APK or run on emulator/device):
npx cap open android

# 4. Open iOS project in Xcode (on macOS):
npx cap open ios
```
Features included:
- Mobile touch-first responsive layout with bottom tab navigation.
- Offline Service Worker caching.
- Haptic touch targets and 1-click WhatsApp intent forwarding.

---

## 🗄️ Database & Cloud Deployment

1. **Local & Desktop Deployment**: The system uses a high-performance SQLite relational database (`backend/school.db`) out-of-the-box with foreign keys enabled, indexing, and cascade rules.
2. **PostgreSQL / Cloud Cluster**: A complete PostgreSQL / MySQL DDL script is provided in `backend/schema.sql` for zero-friction migration to Amazon RDS, Supabase, Google Cloud SQL, or Neon.
3. **File Storage**: Uploaded files and generated report cards/PDFs are stored in `./uploads/` and `./reports/`, with file paths, MIME types, and sizes indexed in the `uploaded_files` relational table.

---

## 📄 License
MIT License. Built for Greenwood Academy by Google DeepMind Agentic Assistant.
