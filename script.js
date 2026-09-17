// PARADOX '26 PUBLIC COUNTDOWN DISPLAY SCRIPT

const $ = id => document.getElementById(id);

function pad(n) {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

const STORAGE_KEY = "paradox_timer_state";
const CHANNEL_NAME = "paradox_timer_channel";
const RESET_CODE = "paradox";

// Default State
let timerState = {
  isRunning: false,
  isPaused: false,
  endTime: null,
  remainingMs: 8 * 60 * 60 * 1000,
  durationMs: 8 * 60 * 60 * 1000,
  customStatus: null,
  lastUpdated: Date.now()
};

let timerInterval = null;

// BroadcastChannel setup
let broadcastChannel = null;
try {
  broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  broadcastChannel.onmessage = (event) => {
    if (event.data && (event.data.type === "SYNC_STATE" || event.data.state)) {
      syncFromStorage();
    }
  };
} catch (e) {
  console.warn("BroadcastChannel not supported in this browser, relying on storage events.", e);
}

// Check for legacy reset query param: ?reset=paradox
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get("reset") === RESET_CODE) {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("hackathonEndTime");
  const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
  window.history.replaceState({ path: newUrl }, "", newUrl);
  alert("Timer has been reset!");
}

// Load state from localStorage
function syncFromStorage() {
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
      const now = Date.now();
      if (end > now) {
        timerState.isRunning = true;
        timerState.isPaused = false;
        timerState.endTime = end;
        timerState.remainingMs = end - now;
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
    const diff = timerState.remainingMs || timerState.durationMs || 8 * 3600 * 1000;
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
  const dur = timerState.remainingMs > 0 ? timerState.remainingMs : (timerState.durationMs || 8 * 3600 * 1000);
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

// Storage event listener for multi-tab sync
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

// Run live loop
syncFromStorage();
if (timerInterval) clearInterval(timerInterval);
timerInterval = setInterval(updateDisplay, 500);
