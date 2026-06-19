# IronLog — Premium Athletic Workout Tracker

IronLog is a premium, dark-themed, offline-first workout tracking application engineered for athletic power, strength, and explosive performance. Designed for mobile and web screens, IronLog operates completely client-side to keep your training data private, secure, and accessible in environments with poor connectivity.

Built using **React**, **Vite**, **Capacitor**, and **IndexedDB**.

---

## ✨ Recent Enhancements (v1.2.0)

A full redesign + major feature expansion:

* **New look — "Graphite + Electric Blue":** professional, high-contrast dark theme with a single restrained electric-blue accent (replaced the loud multi-accent gold theme), tighter radii, softer depth, and crisp typography.
* **Progress & analytics:** dependency-free SVG charts — volume over the last 10 sessions and per-exercise estimated-1RM strength trend, plus lifetime totals.
* **Body & progress photos:** log bodyweight + measurements with a trend chart, and capture progress photos (stored offline in IndexedDB).
* **Gamification:** an XP/level system (with titles), unlockable achievement badges, and a level bar on the dashboard.
* **Goals → auto-generated plans:** pick your objective, days/week, equipment and experience, and the app builds a tailored weekly split for you.
* **Smart progressive overload:** during a workout, each exercise suggests your next target weight/reps from your last session — one tap to apply.
* **Calculators:** barbell plate loader, estimated 1RM with %-table, and a warm-up set builder.
* **Custom exercises + editable logs:** add your own movements to the library (they appear in every picker), and edit/correct any saved workout.
* **Reorganised navigation:** Home · Plan · Progress · History · More (a hub for Body, Achievements, Goals, Calculators, Library, Programs, Settings).
* **Earlier fix:** the rest timer now opens reliably after every completed set (was intermittent due to a state-update timing bug).

## ✨ Enhancements (v1.1.0)

A pass focused on making the app more interactive, fixing dead controls, and closing UX gaps:

* **Functional Settings:** Weight unit (kg/lbs), default rest length, sound and haptic toggles now actually drive the app everywhere (previously they had no effect). Powered by a new shared `SettingsContext`.
* **In-app toasts & confirm dialogs:** Replaced every jarring native `alert()` / `window.confirm()` with styled, non-blocking toast notifications and a themed confirm modal.
* **Resume interrupted workouts:** An active session auto-saves; if the app reloads or closes mid-workout, you're offered to resume exactly where you left off (no more lost progress).
* **My Routines:** Saved routines are no longer orphaned — a new *My Routines* tab in the Plan Builder lets you create, start, edit and delete reusable routines. Quick Workouts saved here show up immediately.
* **Real plan progress:** The dashboard progress bar now reflects actual sessions completed vs. scheduled this week (was hard-coded to 0%), plus a "trained today" indicator and a one-tap Quick Session.
* **Personal Records view:** The History screen now surfaces your best lift per exercise.
* **Bug fix:** Editing a saved routine no longer drops it out of the routines list.

---

## 🚀 Key Features

* **Active Workout Interface & TUT Stopwatch:**
  * Log sets, reps, and weights with instant indicators showing your previous performance.
  * **Time Under Tension (TUT) Set Timer:** Start a stopwatch per set to track exact work duration. Completed set times are logged automatically.
  * **Dynamic Exercises:** Add additional master exercises to your workout on-the-fly during active sessions.

* **Advanced Plan & Split Customizer:**
  * **Follow Program:** Activate structured preloaded athletic training cycles.
  * **Hybrid Splits:** Mix and match different workouts across your weekly schedule.
  * **Custom Plans:** Create templates, rename workout days, and drag-and-drop exercises.
  * **Quick Workout Generator:** Instantly compile sessions based on target time limits (15, 30, 45, or 60 mins) and muscle focus.

* **Interactive Rest Timer:**
  * Configurable circular rest ring overlay with quick-adjust controls (+15s / -15s).
  * Plays high-frequency audio beeps (Web Audio API) and triggers native haptic device vibration upon completion.

* **Activity Log & Calendar:**
  * Visual monthly consistency calendar detailing days with logged sessions.
  * Historical breakdown including total volume lifted, elapsed time, and list of sets.
  * Personal Record (PR) trophies highlighted automatically when hitting new strength thresholds.

* **Settings & Offline Backups:**
  * Toggle weight units (kg/lbs) and vibration/sound alerts.
  * Complete export/import functionality to download your database to a JSON backup file and restore it anytime.

---

## 🛠️ Tech Stack

* **Frontend:** React, HashRouter (Capacitor webview friendly)
* **Build System:** Vite
* **Styling:** Vanilla CSS Modules (Glassmorphism card effects, dark theme variables, responsive grids)
* **Database:** IndexedDB (via `idb` wrapper)
* **Native Wrap:** Capacitor (Core, CLI, Android Bridge)
* **Icons:** Lucide React

---

## 💻 Local Development Setup

### Prerequisites
* Node.js (version 18+)
* Android SDK (if building the native mobile app)

### 1. Web Preview
Install dependencies and run the local development server:
```bash
npm install
npm run dev
```
Open [http://localhost:5173/](http://localhost:5173/) in your web browser.

### 2. Android App Compilation
Build the production assets and sync them to Capacitor:
```bash
# Build the production bundle
npm run build

# Sync assets to the native Android project
npx cap sync

# Compile the Android Debug APK (Windows PowerShell)
$env:ANDROID_HOME="C:\Users\jagga\AppData\Local\Android\Sdk"
cd android
.\gradlew.bat assembleDebug
```
The compiled package will be located at:
`android/app/build/outputs/apk/debug/app-debug.apk`
