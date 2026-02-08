const DEFAULT_STATE = {
  sutras: [],
  sutraMap: {},
  isLoading: true,
  userProgress: {
    currentSutraIndex: 0,
    completedSutraCount: 0,
    lastStudyDate: null,
    streakCount: 0,
    totalSutras: 4000,
  },
  studyPlan: {
    studyDaysPerWeek: 5,
    sutrasPerDay: 20,
    nextStudySutraIndex: 0,
    lastScheduledDate: null,
    missedDays: 0,
  },
  testResults: {
    sessionId: null,
    testedSutraIds: [],
    rememberedIds: [],
    needsPracticeIds: [],
    lastTestedAt: null,
  },
};

const STORAGE_KEY = "sutraMitraState";

const state = loadState();

const routeContent = document.getElementById("route-content");
const pageTitle = document.getElementById("page-title");
const pageSubtitle = document.getElementById("page-subtitle");
const headerCompletion = document.getElementById("header-completion");
const headerEstimate = document.getElementById("header-estimate");
const sidebarStreak = document.getElementById("sidebar-streak");
const sidebarCompleted = document.getElementById("sidebar-completed");

const navItems = document.querySelectorAll(".nav-item");
navItems.forEach((item) =>
  item.addEventListener("click", () => setRoute(item.dataset.route))
);

init();

function init() {
  const savedRoute = window.location.hash.replace("#", "") || "learn";
  setRoute(savedRoute);
  updateHeaderStats();
  loadSutras();
}

function setRoute(route) {
  window.location.hash = route;
  navItems.forEach((item) =>
    item.classList.toggle("active", item.dataset.route === route)
  );

  if (route === "learn") {
    pageTitle.textContent = "Learn Mode";
    pageSubtitle.textContent = "Focus on today’s sūtras.";
    renderLearn();
  } else if (route === "revise") {
    pageTitle.textContent = "Revise Mode";
    pageSubtitle.textContent = "Jump to chanting pages by Adhyāya and Pāda.";
    renderRevise();
  } else {
    pageTitle.textContent = "Test Mode";
    pageSubtitle.textContent = "Reveal, recall, and track memory.";
    renderTest();
  }
}

function updateHeaderStats() {
  const completion = state.userProgress.totalSutras
    ? Math.min(
        100,
        Math.round(
          (state.userProgress.completedSutraCount /
            state.userProgress.totalSutras) *
            100
        )
      )
    : 0;
  headerCompletion.textContent = `${completion}%`;
  sidebarCompleted.textContent = state.userProgress.completedSutraCount;
  sidebarStreak.textContent = state.userProgress.streakCount;
  headerEstimate.textContent = estimateFinish();
}

function estimateFinish() {
  const remaining =
    state.userProgress.totalSutras - state.userProgress.completedSutraCount;
  const perWeek = state.studyPlan.studyDaysPerWeek * state.studyPlan.sutrasPerDay;
  if (!perWeek) return "—";
  const weeks = Math.ceil(remaining / perWeek);
  if (weeks < 4) return `${weeks} weeks`;
  const months = Math.ceil(weeks / 4);
  return `${months} months`;
}

async function loadSutras() {
  state.isLoading = true;
  renderLearn();
  try {
    const response = await fetch("https://ashtadhyayi.com/sutraani");
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const sutraNodes = Array.from(
      doc.querySelectorAll(".sutra, .sutra-text, li")
    );
    const sutras = sutraNodes
      .map((node) => node.textContent.trim())
      .filter((text) => text.length > 0);

    if (sutras.length > 0) {
      state.sutras = sutras.map((text, index) => ({
        id: `sutra-${index + 1}`,
        text,
        adhyaya: Math.ceil((index + 1) / 500),
        pada: ((index % 500) % 4) + 1,
        order: index + 1,
      }));
    }
  } catch (error) {
    notify("Unable to fetch sūtras. Using offline sample set.");
  }

  if (state.sutras.length === 0) {
    state.sutras = Array.from({ length: 40 }, (_, index) => ({
      id: `sample-${index + 1}`,
      text: `Sample sūtra ${index + 1}`,
      adhyaya: Math.ceil((index + 1) / 5),
      pada: ((index % 5) % 4) + 1,
      order: index + 1,
    }));
  }

  state.userProgress.totalSutras = state.sutras.length;
  state.isLoading = false;
  persistState();
  updateHeaderStats();
  renderLearn();
  renderTest();
}

function renderLearn() {
  if (window.location.hash.replace("#", "") !== "learn") return;

  const dailySutras = getDailySutras();
  const completed = state.userProgress.completedSutraCount;
  const total = state.userProgress.totalSutras;

  routeContent.innerHTML = `
    <div class="grid-3">
      <div class="card">
        <h3>Daily Status</h3>
        <p>${dailySutras.length} sūtras ready for today.</p>
        <span class="badge">${completed}/${total} completed</span>
      </div>
      <div class="card">
        <h3>Current Streak</h3>
        <p>${state.userProgress.streakCount} study days in a row.</p>
        <span class="badge">Consistency matters</span>
      </div>
      <div class="card">
        <h3>Estimated Finish</h3>
        <p>${estimateFinish()}</p>
        <span class="badge">At current pace</span>
      </div>
    </div>
    <div class="card flex">
      <div class="field">
        <label>Study days per week</label>
        <select id="study-days">
          ${[3, 5, 6, 7]
            .map(
              (value) =>
                `<option value="${value}" ${
                  value === state.studyPlan.studyDaysPerWeek ? "selected" : ""
                }>${value}</option>`
            )
            .join("")}
        </select>
      </div>
      <div class="field">
        <label>Sūtras per study day</label>
        <select id="sutras-per-day">
          ${[5, 10, 15, 20]
            .map(
              (value) =>
                `<option value="${value}" ${
                  value === state.studyPlan.sutrasPerDay ? "selected" : ""
                }>${value}</option>`
            )
            .join("")}
        </select>
      </div>
    </div>
    <div class="card">
      <h3>Today’s Sūtras</h3>
      ${
        state.isLoading
          ? "<p>Loading sūtras…</p>"
          : `
      <div class="sutra-list">
        ${dailySutras
          .map(
            (sutra) =>
              `<div class="sutra-item">
                <strong>#${sutra.order}</strong> — ${sutra.text}
              </div>`
          )
          .join("")}
      </div>`
      }
      <div class="flex" style="margin-top: 16px;">
        <button class="primary" id="complete-study">Complete today</button>
        <button class="ghost" id="reset-study">Reset day</button>
      </div>
    </div>
  `;

  const studyDaysSelect = document.getElementById("study-days");
  const sutrasPerDaySelect = document.getElementById("sutras-per-day");
  const completeButton = document.getElementById("complete-study");
  const resetButton = document.getElementById("reset-study");

  studyDaysSelect?.addEventListener("change", (event) => {
    state.studyPlan.studyDaysPerWeek = Number(event.target.value);
    persistState();
    updateHeaderStats();
  });

  sutrasPerDaySelect?.addEventListener("change", (event) => {
    state.studyPlan.sutrasPerDay = Number(event.target.value);
    persistState();
    renderLearn();
    updateHeaderStats();
  });

  completeButton?.addEventListener("click", () => {
    markStudyComplete();
  });

  resetButton?.addEventListener("click", () => {
    resetToday();
  });
}

function getDailySutras() {
  const start = state.userProgress.currentSutraIndex;
  const end = Math.min(
    start + state.studyPlan.sutrasPerDay,
    state.sutras.length
  );
  return state.sutras.slice(start, end);
}

function markStudyComplete() {
  const today = new Date().toISOString().slice(0, 10);
  if (state.userProgress.lastStudyDate === today) {
    notify("You already completed today’s study.");
    return;
  }

  const dailyCount = getDailySutras().length;
  const previousDate = state.userProgress.lastStudyDate;
  state.userProgress.currentSutraIndex += dailyCount;
  state.userProgress.completedSutraCount += dailyCount;
  state.userProgress.lastStudyDate = today;
  state.userProgress.streakCount = calculateStreak(previousDate);

  persistState();
  updateHeaderStats();
  renderLearn();
}

function resetToday() {
  const today = new Date().toISOString().slice(0, 10);
  if (state.userProgress.lastStudyDate !== today) {
    notify("No completion to reset today.");
    return;
  }
  const dailyCount = state.studyPlan.sutrasPerDay;
  state.userProgress.currentSutraIndex = Math.max(
    0,
    state.userProgress.currentSutraIndex - dailyCount
  );
  state.userProgress.completedSutraCount = Math.max(
    0,
    state.userProgress.completedSutraCount - dailyCount
  );
  state.userProgress.lastStudyDate = null;
  state.userProgress.streakCount = 0;
  persistState();
  updateHeaderStats();
  renderLearn();
}

function calculateStreak(previousDate) {
  if (!previousDate) return 1;
  const last = new Date(previousDate);
  const today = new Date();
  const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return state.userProgress.streakCount + 1;
  if (diffDays > 1) return 1;
  return state.userProgress.streakCount || 1;
}

function renderRevise() {
  if (window.location.hash.replace("#", "") !== "revise") return;

  routeContent.innerHTML = `
    <div class="card flex-column">
      <h3>Revise by Adhyāya and Pāda</h3>
      <div class="flex">
        <div class="field">
          <label>Adhyāya</label>
          <select id="adhyaya">
            ${Array.from({ length: 8 }, (_, i) => i + 1)
              .map((value) => `<option value="${value}">${value}</option>`)
              .join("")}
          </select>
        </div>
        <div class="field">
          <label>Pāda</label>
          <select id="pada">
            ${Array.from({ length: 4 }, (_, i) => i + 1)
              .map((value) => `<option value="${value}">${value}</option>`)
              .join("")}
          </select>
        </div>
      </div>
      <button class="primary" id="go-chant">Open chanting page</button>
      <p class="muted">Opens ashtadhyayi.com in a new tab.</p>
    </div>
    <div class="card" id="chanting-preview">
      <h3>Chanting Preview</h3>
      <p>Select Adhyāya and Pāda to preview the chanting page link.</p>
      <a href="#" id="chanting-link">—</a>
    </div>
  `;

  const adhyayaSelect = document.getElementById("adhyaya");
  const padaSelect = document.getElementById("pada");
  const goButton = document.getElementById("go-chant");
  const link = document.getElementById("chanting-link");

  const updateLink = () => {
    const adhyaya = Number(adhyayaSelect.value);
    const pada = Number(padaSelect.value);
    const pageNumber = (adhyaya - 1) * 4 + (pada - 1) + 2;
    const url = `https://ashtadhyayi.com/chanting/${pageNumber}`;
    link.href = url;
    link.textContent = url;
  };

  updateLink();
  adhyayaSelect.addEventListener("change", updateLink);
  padaSelect.addEventListener("change", updateLink);
  goButton.addEventListener("click", () => {
    window.open(link.href, "_blank", "noopener,noreferrer");
  });
}

function renderTest() {
  if (window.location.hash.replace("#", "") !== "test") return;

  const queue = getTestQueue();
  const current = queue[0];
  const hasQueue = Boolean(current);

  routeContent.innerHTML = `
    <div class="card flex-column">
      <h3>Flashcard Session</h3>
      <p>${
        hasQueue
          ? "Reveal the sūtra and mark your recall."
          : "Study a few sūtras to start a recall session."
      }</p>
      <div class="card flashcard">
        <div class="sutra-text ${hasQueue ? "hidden" : ""}" id="flashcard-text">
          ${hasQueue ? "Tap reveal to see the sūtra." : "No sūtras queued."}
        </div>
        <div class="flex">
          <button class="ghost" id="reveal">Reveal</button>
          <button class="primary" id="remembered">Remembered</button>
          <button id="practice">Need More Practice</button>
        </div>
      </div>
    </div>
    <div class="card">
      <h3>Recall Summary</h3>
      <p>${state.testResults.rememberedIds.length} remembered, ${
    state.testResults.needsPracticeIds.length
  } need practice.</p>
    </div>
  `;

  const revealButton = document.getElementById("reveal");
  const rememberedButton = document.getElementById("remembered");
  const practiceButton = document.getElementById("practice");
  const flashcardText = document.getElementById("flashcard-text");

  if (!hasQueue) {
    revealButton.disabled = true;
    rememberedButton.disabled = true;
    practiceButton.disabled = true;
    return;
  }

  revealButton.addEventListener("click", () => {
    flashcardText.textContent = current.text;
    flashcardText.classList.remove("hidden");
  });

  rememberedButton.addEventListener("click", () => {
    recordRecall(current.id, true);
  });

  practiceButton.addEventListener("click", () => {
    recordRecall(current.id, false);
  });
}

function getTestQueue() {
  const learnedCount = state.userProgress.completedSutraCount;
  const available = state.sutras.slice(0, Math.max(learnedCount, 1));
  return available.slice(0, 5);
}

function recordRecall(id, remembered) {
  state.testResults.testedSutraIds.push(id);
  if (remembered) {
    state.testResults.rememberedIds.push(id);
  } else {
    state.testResults.needsPracticeIds.push(id);
  }
  state.testResults.lastTestedAt = new Date().toISOString().slice(0, 10);
  persistState();
  renderTest();
}

function notify(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.hidden = false;
  setTimeout(() => {
    toast.hidden = true;
  }, 2800);
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(DEFAULT_STATE);
  try {
    return { ...structuredClone(DEFAULT_STATE), ...JSON.parse(raw) };
  } catch (error) {
    return structuredClone(DEFAULT_STATE);
  }
}
