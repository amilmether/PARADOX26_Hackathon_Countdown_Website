// PARADOX '26 ADMIN CONTROL DECK JAVASCRIPT
// 100% Client-Side Pure Vanilla JS — No Python or Backend required!

// ==========================================
// 🔑 HARDCODED CREDENTIALS
// ==========================================
const HARDCODED_USERNAME = "admin";
const HARDCODED_PASSWORD = "paradox2026";

const CHANNEL_NAME = "paradox_timer_channel";
const STORAGE_KEY = "paradox_timer_state";
const AUTH_SESSION_KEY = "paradox_admin_auth";

// DOM Elements
const authSection = document.getElementById("auth-section");
const dashboardSection = document.getElementById("dashboard-section");
const loginForm = document.getElementById("login-form");
const adminUsernameInput = document.getElementById("admin-username");
const adminPasscodeInput = document.getElementById("admin-passcode");
const authError = document.getElementById("auth-error");
const togglePassBtn = document.getElementById("toggle-pass-btn");
const logoutBtn = document.getElementById("logout-btn");
const displayUserTag = document.getElementById("display-user-tag");

// Timer Mirror DOM
const mirrorDays = document.getElementById("admin-days");
const mirrorHours = document.getElementById("admin-hours");
const mirrorMinutes = document.getElementById("admin-minutes");
const mirrorSeconds = document.getElementById("admin-seconds");
const mirrorStatusLabel = document.getElementById("mirror-status-label");
const mirrorBadge = document.getElementById("mirror-badge");

// Controls
const ctrlStart = document.getElementById("ctrl-start");
const ctrlPause = document.getElementById("ctrl-pause");
const ctrlReset = document.getElementById("ctrl-reset");

// Duration Inputs
const durHours = document.getElementById("dur-hours");
const durMins = document.getElementById("dur-mins");
const durSecs = document.getElementById("dur-secs");
const applyDurationBtn = document.getElementById("apply-duration-btn");

// Target Time
const targetDatetimeInput = document.getElementById("target-datetime");
const applyTargetBtn = document.getElementById("apply-target-btn");

// Custom Status
const customStatusInput = document.getElementById("custom-status-input");
const applyStatusBtn = document.getElementById("apply-status-btn");
const resetStatusBtn = document.getElementById("reset-status-btn");

// Terminal Log
const logTerminal = document.getElementById("log-terminal");

// Broadcast Channel for live multi-tab communication
let broadcastChannel = null;
try {
  broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  broadcastChannel.onmessage = (event) => {
    if (event.data && event.data.type === "SYNC_STATE") {
      loadStateFromStorage();
    }
  };
} catch (e) {
  console.warn("BroadcastChannel not supported, falling back to localStorage events", e);
}

// Global Timer State Object
let timerState = {
  isRunning: false,
  isPaused: false,
  endTime: null,
  remainingMs: 8 * 60 * 60 * 1000,
  durationMs: 8 * 60 * 60 * 1000,
  customStatus: null,
  lastUpdated: Date.now()
};

let adminTickInterval = null;

// Helper: Format leading zero
function pad(n) {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

// Helper: Append log to on-screen terminal
function logMessage(msg, type = "system") {
  if (!logTerminal) return;
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement("div");
  entry.className = `log-entry log-${type}`;
  entry.textContent = `[${time}] ${msg}`;
  logTerminal.appendChild(entry);
  logTerminal.scrollTop = logTerminal.scrollHeight;
}

// ==========================================
// 🔐 AUTHENTICATION (HARDCODED)
// ==========================================
function checkAuth() {
  const isAuth = sessionStorage.getItem(AUTH_SESSION_KEY) === "true";
  if (isAuth) {
    authSection.classList.add("hidden");
    dashboardSection.classList.remove("hidden");
    if (displayUserTag) displayUserTag.textContent = HARDCODED_USERNAME.toUpperCase();
    initDashboard();
  } else {
    authSection.classList.remove("hidden");
    dashboardSection.classList.add("hidden");
  }
}

function login() {
  const enteredUser = (adminUsernameInput ? adminUsernameInput.value.trim() : "");
  const enteredPass = (adminPasscodeInput ? adminPasscodeInput.value.trim() : "");

  if (enteredUser === HARDCODED_USERNAME && enteredPass === HARDCODED_PASSWORD) {
    sessionStorage.setItem(AUTH_SESSION_KEY, "true");
    authError.classList.add("hidden");
    if (adminUsernameInput) adminUsernameInput.value = "";
    if (adminPasscodeInput) adminPasscodeInput.value = "";
    checkAuth();
    logMessage(`Operator '${enteredUser}' authenticated successfully.`, "system");
  } else {
    authError.classList.remove("hidden");
    authError.style.animation = "none";
    void authError.offsetWidth; // Trigger reflow
    authError.style.animation = "shake 0.3s cubic-bezier(0.36, 0.07, 0.19, 0.97) both";
    logMessage(`Failed login attempt for user '${enteredUser}'.`, "danger");
  }
}

function logout() {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  clearInterval(adminTickInterval);
  checkAuth();
}

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  login();
});

logoutBtn.addEventListener("click", logout);

togglePassBtn.addEventListener("click", () => {
  if (adminPasscodeInput.type === "password") {
    adminPasscodeInput.type = "text";
    togglePassBtn.textContent = "🙈";
  } else {
    adminPasscodeInput.type = "password";
    togglePassBtn.textContent = "👁";
  }
});

// ==========================================
// 📡 STATE SYNC & STORAGE
// ==========================================
function loadStateFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      timerState = JSON.parse(raw);
    } catch (e) {
      console.error("Failed to parse timer state", e);
    }
  } else {
    // Backward compatibility with legacy key
    const legacyEndTime = localStorage.getItem("hackathonEndTime");
    if (legacyEndTime) {
      const end = parseInt(legacyEndTime, 10);
      const now = Date.now();
      if (end > now) {
        timerState.isRunning = true;
        timerState.isPaused = false;
        timerState.endTime = end;
        timerState.remainingMs = end - now;
      }
    }
  }
  updateUI();
}

function saveStateAndBroadcast(actionName = "STATE_UPDATE") {
  timerState.lastUpdated = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(timerState));

  // Sync legacy key for backward compatibility
  if (timerState.isRunning && !timerState.isPaused && timerState.endTime) {
    localStorage.setItem("hackathonEndTime", timerState.endTime.toString());
  } else {
    localStorage.removeItem("hackathonEndTime");
  }

  // Broadcast to other open tabs/screens
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: "SYNC_STATE", state: timerState, action: actionName });
    } catch (e) {
      console.warn("Broadcast failed", e);
    }
  }

  updateUI();
}

// Storage listener across tabs
window.addEventListener("storage", (e) => {
  if (e.key === STORAGE_KEY || e.key === "hackathonEndTime") {
    loadStateFromStorage();
  }
});

// ==========================================
// ⏱️ TIMER OPERATIONS
// ==========================================
function startTimer() {
  const now = Date.now();

  if (timerState.isPaused) {
    // Resuming paused timer
    timerState.endTime = now + timerState.remainingMs;
    timerState.isPaused = false;
    timerState.isRunning = true;
    logMessage(`Timer RESUMED. Target end: ${new Date(timerState.endTime).toLocaleTimeString()}`, "action");
  } else {
    // Fresh start
    const dur = timerState.remainingMs > 0 ? timerState.remainingMs : timerState.durationMs;
    timerState.endTime = now + dur;
    timerState.isRunning = true;
    timerState.isPaused = false;
    logMessage(`Hackathon STARTED. Duration: ${(dur / 3600000).toFixed(2)}h`, "action");
  }

  saveStateAndBroadcast("START");
}

function pauseTimer() {
  if (!timerState.isRunning || timerState.isPaused) return;

  const now = Date.now();
  timerState.remainingMs = Math.max(0, timerState.endTime - now);
  timerState.isPaused = true;
  timerState.isRunning = true;
  timerState.endTime = null;

  logMessage(`Timer PAUSED with ${(timerState.remainingMs / 1000).toFixed(0)}s remaining.`, "warn");
  saveStateAndBroadcast("PAUSE");
}

function resetTimer() {
  if (!confirm("⚠️ Are you sure you want to RESET the hackathon countdown?")) return;

  timerState.isRunning = false;
  timerState.isPaused = false;
  timerState.endTime = null;
  timerState.remainingMs = timerState.durationMs;

  logMessage("Timer RESET to initial state.", "danger");
  saveStateAndBroadcast("RESET");
}

function adjustTime(diffMs) {
  const sign = diffMs > 0 ? "+" : "";
  const minutes = diffMs / 60000;

  if (timerState.isRunning && !timerState.isPaused && timerState.endTime) {
    timerState.endTime += diffMs;
    logMessage(`Adjusted running timer by ${sign}${minutes} min. New end: ${new Date(timerState.endTime).toLocaleTimeString()}`, "action");
  } else {
    timerState.remainingMs = Math.max(0, timerState.remainingMs + diffMs);
    logMessage(`Adjusted remaining buffer by ${sign}${minutes} min. New duration: ${(timerState.remainingMs / 60000).toFixed(0)} min`, "action");
  }

  saveStateAndBroadcast("ADJUST_TIME");
}

function applyCustomDuration() {
  const h = parseInt(durHours.value, 10) || 0;
  const m = parseInt(durMins.value, 10) || 0;
  const s = parseInt(durSecs.value, 10) || 0;

  const totalMs = (h * 3600 + m * 60 + s) * 1000;
  if (totalMs <= 0) {
    alert("Please enter a duration greater than 0 seconds.");
    return;
  }

  timerState.durationMs = totalMs;
  timerState.remainingMs = totalMs;

  if (timerState.isRunning && !timerState.isPaused) {
    if (confirm("The timer is currently running. Would you like to restart it with this new duration immediately?")) {
      timerState.endTime = Date.now() + totalMs;
      logMessage(`Updated running timer duration to ${h}h ${m}m ${s}s.`, "action");
    } else {
      logMessage(`Updated default duration to ${h}h ${m}m ${s}s (will take effect on next reset).`, "action");
    }
  } else {
    timerState.isPaused = false;
    timerState.isRunning = false;
    timerState.endTime = null;
    logMessage(`Configured new duration: ${h}h ${m}m ${s}s.`, "action");
  }

  saveStateAndBroadcast("SET_DURATION");
}

function applyTargetDateTime() {
  const val = targetDatetimeInput.value;
  if (!val) {
    alert("Please select a target date and time.");
    return;
  }

  const targetMs = new Date(val).getTime();
  const now = Date.now();

  if (targetMs <= now) {
    alert("Target end time must be in the future!");
    return;
  }

  timerState.endTime = targetMs;
  timerState.isRunning = true;
  timerState.isPaused = false;
  timerState.durationMs = targetMs - now;
  timerState.remainingMs = targetMs - now;

  logMessage(`Target end time locked to: ${new Date(targetMs).toLocaleString()}`, "action");
  saveStateAndBroadcast("SET_TARGET_TIME");
}

function applyCustomStatus() {
  const text = customStatusInput.value.trim();
  if (!text) return;

  timerState.customStatus = text;
  logMessage(`Custom public banner broadcasted: "${text}"`, "action");
  saveStateAndBroadcast("CUSTOM_STATUS");
}

function resetCustomStatus() {
  timerState.customStatus = null;
  customStatusInput.value = "";
  logMessage("Restored system default status messages.", "system");
  saveStateAndBroadcast("RESTORE_STATUS");
}

// ==========================================
// 🖥️ UI & TICK LOOP
// ==========================================
function updateUI() {
  let diff = 0;
  const now = Date.now();

  if (timerState.isRunning && !timerState.isPaused && timerState.endTime) {
    diff = Math.max(0, timerState.endTime - now);
  } else {
    diff = timerState.remainingMs || timerState.durationMs || 0;
  }

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  mirrorDays.textContent = pad(days);
  mirrorHours.textContent = pad(hours);
  mirrorMinutes.textContent = pad(minutes);
  mirrorSeconds.textContent = pad(seconds);

  // Status & Button states
  if (timerState.isRunning && !timerState.isPaused) {
    if (diff <= 0) {
      mirrorStatusLabel.textContent = "HACKATHON ENDED";
      mirrorBadge.className = "mirror-state-badge state-finished";
      mirrorBadge.textContent = "STATUS: 🏁 TIME IS UP";
      ctrlStart.textContent = "▶ RESTART";
      ctrlStart.disabled = false;
      ctrlPause.disabled = true;
    } else {
      mirrorStatusLabel.textContent = timerState.customStatus || "HACKATHON IN PROGRESS";
      mirrorBadge.className = "mirror-state-badge state-running";
      mirrorBadge.textContent = "STATUS: 🟢 RUNNING (COUNTDOWN ACTIVE)";
      ctrlStart.disabled = true;
      ctrlPause.disabled = false;
      ctrlPause.textContent = "⏸ PAUSE";
    }
  } else if (timerState.isPaused) {
    mirrorStatusLabel.textContent = timerState.customStatus || "PAUSED";
    mirrorBadge.className = "mirror-state-badge state-paused";
    mirrorBadge.textContent = "STATUS: ⏸ PAUSED";
    ctrlStart.textContent = "▶ RESUME";
    ctrlStart.disabled = false;
    ctrlPause.disabled = true;
  } else {
    mirrorStatusLabel.textContent = timerState.customStatus || "WAITING TO START";
    mirrorBadge.className = "mirror-state-badge state-waiting";
    mirrorBadge.textContent = "STATUS: 🟡 WAITING TO START";
    ctrlStart.textContent = "▶ START";
    ctrlStart.disabled = false;
    ctrlPause.disabled = true;
  }
}

// Attach event listeners
ctrlStart.addEventListener("click", startTimer);
ctrlPause.addEventListener("click", pauseTimer);
ctrlReset.addEventListener("click", resetTimer);

document.querySelectorAll(".adjust-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const adj = parseInt(btn.getAttribute("data-adjust"), 10);
    adjustTime(adj);
  });
});

document.querySelectorAll(".preset-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const h = btn.getAttribute("data-h");
    const m = btn.getAttribute("data-m");
    durHours.value = h;
    durMins.value = m;
    durSecs.value = 0;
  });
});

applyDurationBtn.addEventListener("click", applyCustomDuration);
applyTargetBtn.addEventListener("click", applyTargetDateTime);
applyStatusBtn.addEventListener("click", applyCustomStatus);
resetStatusBtn.addEventListener("click", resetCustomStatus);

function initDashboard() {
  loadStateFromStorage();
  if (adminTickInterval) clearInterval(adminTickInterval);
  adminTickInterval = setInterval(updateUI, 1000);

  if (timerState.durationMs) {
    const totalSec = Math.floor(timerState.durationMs / 1000);
    durHours.value = Math.floor(totalSec / 3600);
    durMins.value = Math.floor((totalSec % 3600) / 60);
    durSecs.value = totalSec % 60;
  }

  const defaultTarget = new Date(Date.now() + (timerState.remainingMs || 8 * 3600 * 1000));
  const offset = defaultTarget.getTimezoneOffset() * 60000;
  const localISOTime = new Date(defaultTarget.getTime() - offset).toISOString().slice(0, 16);
  targetDatetimeInput.value = localISOTime;

  if (timerState.customStatus) {
    customStatusInput.value = timerState.customStatus;
  }
}

// Check auth on load
checkAuth();
