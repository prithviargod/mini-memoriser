# SūtraMitra — Product Architecture & Frontend Structure

## App Name & Tagline
- **Name:** SūtraMitra
- **Tagline:** “Your daily companion to master the Aṣṭādhyāyī.”

## Goals & Design Principles
- **Calm, minimal UI** for daily study focus.
- **Three-mode navigation** with a persistent left sidebar.
- **Linear learning** with flexible schedules; missed days shift without penalty.
- **Raw sūtras only** (no meanings or commentary).

## Final Module Breakdown

### 1) Shell & Navigation
- **App Shell** (layout, theme, typography, responsiveness)
- **Left Sidebar**
  - Learn Mode
  - Revise Mode
  - Test Mode
- **Top Header** (contextual info: page title, streak, quick stats)

### 2) Learn Mode (Core Module)
- **Learn Dashboard**
  - Daily completion status
  - Current streak
  - Estimated finish timeline
- **Study Config**
  - Study days per week (default 5)
  - Sūtras per study day (default 20)
- **Daily Study Page**
  - Distraction-free list of next *N* sūtras
  - Progress indicator (completed / total)
- **Progress & Estimation**
  - Total sūtras completed
  - % of full Aṣṭādhyāyī memorised
  - Estimated time to completion

### 3) Revise Mode
- **Revise Selector**
  - Adhyāya dropdown (1–8)
  - Pāda dropdown (1–4)
- **Chanting View**
  - URL mapping to `https://ashtadhyayi.com/chanting/{pageNumber}`
  - Embedded iframe or external redirect

### 4) Test Mode
- **Flashcard Queue**
  - Sūtra cards hidden by default
  - Reveal action
  - Mark “Remembered” or “Need More Practice”
- **Recall Summary**
  - Basic counts (remembered vs needs practice)
  - No gamification yet

### 5) Data & Services
- **Sūtra Data Service**
  - Fetch from `https://ashtadhyayi.com/sutraani`
  - Parse into structured data grouped by Adhyāya/Pāda
- **Local Persistence**
  - User preferences and progress in local storage (or indexed DB later)

---

## Component Hierarchy

### App Shell
- `App`
  - `AppLayout`
    - `Sidebar`
      - `NavItem` (Learn, Revise, Test)
    - `MainContent`
      - `Header`
        - `PageTitle`
        - `QuickStats` (streak, completion)
      - `RouterOutlet`

### Learn Mode
- `LearnPage`
  - `LearnDashboard`
    - `DailyStatusCard`
    - `StreakCard`
    - `EstimatedFinishCard`
  - `StudyConfigPanel`
    - `StudyDaysSelector`
    - `SutrasPerDaySelector`
  - `DailyStudyPanel`
    - `DistractionFreeList`
      - `SutraItem`
    - `ProgressIndicator`

### Revise Mode
- `RevisePage`
  - `ReviseSelector`
    - `AdhyayaSelect`
    - `PadaSelect`
    - `GoToChantingButton`
  - `ChantingEmbed` (iframe or redirect)

### Test Mode
- `TestPage`
  - `FlashcardQueue`
    - `Flashcard`
      - `RevealButton`
      - `RecallActions` (Remembered / Need More Practice)
  - `RecallSummary`

---

## Data Models / State Shape

### 1) User Progress
```json
{
  "userProgress": {
    "currentSutraIndex": 0,
    "completedSutraCount": 0,
    "lastStudyDate": "YYYY-MM-DD",
    "streakCount": 0,
    "totalSutras": 4000
  }
}
```

### 2) Daily Allocation Logic
```json
{
  "studyPlan": {
    "studyDaysPerWeek": 5,
    "sutrasPerDay": 20,
    "nextStudySutraIndex": 0,
    "lastScheduledDate": "YYYY-MM-DD",
    "missedDays": 0
  }
}
```

**Allocation Notes**
- Each study session pulls the next *N* sūtras from the linear list.
- If a study day is missed, the plan shifts forward **without increasing** the daily load.
- Streak may reset based on gaps, but daily workload remains constant.

### 3) Test Mode Results
```json
{
  "testResults": {
    "sessionId": "uuid",
    "testedSutraIds": ["1.1.1", "1.1.2"],
    "rememberedIds": ["1.1.1"],
    "needsPracticeIds": ["1.1.2"],
    "lastTestedAt": "YYYY-MM-DD"
  }
}
```

---

## Data Flow Overview

1. **Fetch sūtras** once from `sutraani` and normalize into a linear array + grouped map.
2. **Learn Mode** uses `currentSutraIndex` + `sutrasPerDay` to derive today’s list.
3. **Progress update** increments `currentSutraIndex` and `completedSutraCount`.
4. **Revise Mode** maps (Adhyāya, Pāda) to chanting page number, then routes.
5. **Test Mode** uses a subset of sūtras for recall checks; updates `testResults`.

---

## Simple User Journey Flow Diagram

```
          ┌──────────────────────────────┐
          │          SūtraMitra          │
          │  (Sidebar: Learn/Revise/Test)│
          └───────────────┬──────────────┘
                          │
          ┌───────────────▼──────────────┐
          │          Learn Mode           │
          │  - Configure study plan       │
          │  - View daily sūtras           │
          │  - Update progress            │
          └───────────────┬──────────────┘
                          │
          ┌───────────────▼──────────────┐
          │          Revise Mode          │
          │  - Select (Adhyāya, Pāda)     │
          │  - Open chanting page         │
          └───────────────┬──────────────┘
                          │
          ┌───────────────▼──────────────┐
          │           Test Mode           │
          │  - Flashcards & recall stats  │
          └──────────────────────────────┘
```
