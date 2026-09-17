// PARADOX '26 PUBLIC COUNTDOWN DISPLAY SCRIPT
// Designed for multi-device sync without resets across phones & computers

const $ = id => document.getElementById(id);

function pad(n) {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

const STORAGE_KEY = "paradox_timer_state";
const CHANNEL_NAME = "paradox_timer_channel";
const RESET_CODE = "paradox";

// ============================================================================
// 📅 OFFICIAL EVENT SCHEDULE CONFIGURATION
// If opened from a new phone during event hours, it auto-syncs to this schedule!
// ============================================================================
const OFFICIAL_START_TIME = new Date("2026-09-17T10:00:00+05:30").getTime();
const OFFICIAL_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours
const OFFICIAL_END_TIME = OFFICIAL_START_TIME + OFFICIAL_DURATION_MS;

// Default State
let timerState = {
  isRunning: false,
  isPaused: false,
  endTime: null,
  remainingMs: OFFICIAL_DURATION_MS,
  durationMs: OFFICIAL_DURATION_MS,
  customStatus: null,
  lastUpdated: Date.now()
};

let timerInterval = null;

// BroadcastChannel setup for local multi-tab sync
let broadcastChannel = null;
try {
  broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  broadcastChannel.onmessage = (event) => {
    if (event.data && (event.data.type === "SYNC_STATE" || event.data.state)) {
      syncFromStorage();
    }
  };
} catch (e) {
  console.warn("BroadcastChannel not supported, relying on storage events.", e);
}

// 1. Check for manual reset URL param: ?reset=paradox
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get("reset") === RESET_CODE) {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("hackathonEndTime");
  sessionStorage.removeItem("manual_reset_done");
  const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
  window.history.replaceState({ path: newUrl }, "", newUrl);
  alert("Timer has been reset!");
}

// 2. Check for URL sync parameters: ?end=TIMESTAMP or ?t=TIMESTAMP or ?status=...
const paramEnd = urlParams.get("end") || urlParams.get("t");
const paramStatus = urlParams.get("status");

if (paramEnd) {
  const targetEnd = parseInt(paramEnd, 10);
  if (!isNaN(targetEnd) && targetEnd > 0) {
    const now = Date.now();
    timerState.isRunning = true;
    timerState.isPaused = false;
    timerState.endTime = targetEnd;
    timerState.remainingMs = Math.max(0, targetEnd - now);
    if (paramStatus) timerState.customStatus = decodeURIComponent(paramStatus);
    timerState.lastUpdated = now;

    // Save to this phone's localStorage so subsequent visits stay in sync
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timerState));
    localStorage.setItem("hackathonEndTime", targetEnd.toString());
  }
}

// Load state from localStorage or fallback to official schedule
function syncFromStorage() {
  const now = Date.now();
  const raw = localStorage.getItem(STORAGE_KEY);

  if (raw) {
    try {
      timerState = JSON.parse(raw);
    } catch (e) {
      console.error("Error parsing timer state", e);
    }
  } else {
    // Check legacy key
    const legacy = localStorage.getItem("hackathonEndTime");
    if (legacy) {
      const end = parseInt(legacy, 10);
      if (end > now) {
        timerState.isRunning = true;
        timerState.isPaused = false;
        timerState.endTime = end;
        timerState.remainingMs = end - now;
      }
    } else {
      // 🌟 MULTI-PHONE AUTO-SYNC FALLBACK:
      // If a new phone opens the website during the hackathon, automatically
      // sync to the official schedule without requiring manual start!
      if (now >= OFFICIAL_START_TIME && now < OFFICIAL_END_TIME) {
        timerState.isRunning = true;
        timerState.isPaused = false;
        timerState.endTime = OFFICIAL_END_TIME;
        timerState.remainingMs = OFFICIAL_END_TIME - now;
        timerState.durationMs = OFFICIAL_DURATION_MS;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(timerState));
        localStorage.setItem("hackathonEndTime", OFFICIAL_END_TIME.toString());
      }
    }
  }

  updateDisplay();
}

function updateDisplay() {
  const startBtn = $("start-btn");
  const statusEl = $("status");
  const now = Date.now();

  if (timerState.isRunning && !timerState.isPaused && timerState.endTime) {
    const diff = timerState.endTime - now;

    if (diff > 0) {
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      $("days").textContent = pad(days);
      $("hours").textContent = pad(hours);
      $("minutes").textContent = pad(minutes);
      $("seconds").textContent = pad(seconds);

      if (startBtn) startBtn.style.display = "none";
      if (statusEl) {
        statusEl.textContent = timerState.customStatus || "SYSTEM ONLINE • COUNTDOWN ACTIVE";
        statusEl.style.color = "#8cffae";
      }
    } else {
      $("days").textContent = "00";
      $("hours").textContent = "00";
      $("minutes").textContent = "00";
      $("seconds").textContent = "00";

      if (startBtn) {
        startBtn.style.display = "none";
      }
      if (statusEl) {
        statusEl.textContent = timerState.customStatus || "🚀 HACKATHON IS LIVE • TIME IS UP!";
        statusEl.style.color = "var(--pink)";
      }
    }
  } else if (timerState.isPaused) {
    const diff = timerState.remainingMs || 0;
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    $("days").textContent = pad(days);
    $("hours").textContent = pad(hours);
    $("minutes").textContent = pad(minutes);
    $("seconds").textContent = pad(seconds);

    if (startBtn) startBtn.style.display = "none";
    if (statusEl) {
      statusEl.textContent = timerState.customStatus || "⏸ HACKATHON TIMER PAUSED";
      statusEl.style.color = "var(--orange)";
    }
  } else {
    // Waiting / Initial state
    const diff = timerState.remainingMs || timerState.durationMs || OFFICIAL_DURATION_MS;
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    $("days").textContent = pad(days);
    $("hours").textContent = pad(hours);
    $("minutes").textContent = pad(minutes);
    $("seconds").textContent = pad(seconds);

    if (startBtn) {
      startBtn.style.display = "inline-block";
      startBtn.textContent = "START HACKATHON";
    }
    if (statusEl) {
      statusEl.textContent = timerState.customStatus || "WAITING TO START...";
      statusEl.style.color = "#ffd21f";
    }
  }
}

function startHackathon() {
  const dur = timerState.remainingMs > 0 ? timerState.remainingMs : (timerState.durationMs || OFFICIAL_DURATION_MS);
  timerState.isRunning = true;
  timerState.isPaused = false;
  timerState.endTime = Date.now() + dur;
  timerState.lastUpdated = Date.now();

  localStorage.setItem(STORAGE_KEY, JSON.stringify(timerState));
  localStorage.setItem("hackathonEndTime", timerState.endTime.toString());

  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: "SYNC_STATE", state: timerState });
    } catch (e) {
      console.warn("Broadcast failed", e);
    }
  }

  updateDisplay();
}

const startBtn = $("start-btn");
if (startBtn) {
  startBtn.addEventListener("click", startHackathon);
}

// Storage event listener for multi-tab sync on same device
window.addEventListener("storage", (e) => {
  if (e.key === STORAGE_KEY || e.key === "hackathonEndTime") {
    syncFromStorage();
  }
});

// Keyboard shortcut: Alt+A or Ctrl+Shift+A opens Admin panel
window.addEventListener("keydown", (e) => {
  if ((e.altKey && e.key.toLowerCase() === "a") || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a")) {
    window.location.href = "admin.html";
  }
});

// Run live sync loop
syncFromStorage();
if (timerInterval) clearInterval(timerInterval);
timerInterval = setInterval(updateDisplay, 500);
