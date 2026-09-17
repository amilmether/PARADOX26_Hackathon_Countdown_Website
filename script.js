const $ = id => document.getElementById(id);

function pad(n){ return String(Math.max(0,n)).padStart(2,"0"); }

let endTime = null;
let timerInterval = null;
const DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours
const RESET_CODE = "paradox"; // Change this to your desired secret code

// Check for reset code in URL
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('reset') === RESET_CODE) {
  localStorage.removeItem('hackathonEndTime');
  // Clean up URL so it doesn't reset again on refresh
  const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
  window.history.replaceState({path:newUrl}, '', newUrl);
  alert("Timer has been reset!");
}

// Load existing end time if it exists
const savedEndTime = localStorage.getItem('hackathonEndTime');
if (savedEndTime) {
  endTime = parseInt(savedEndTime, 10);
}

function updateCountdown(){
  if (!endTime) return; // Don't do anything if not started

  const now = Date.now();
  let diff = endTime - now;

  if(diff > 0){
    const days = Math.floor(diff / 86400000);
    diff %= 86400000;
    const hours = Math.floor(diff / 3600000);
    diff %= 3600000;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    $("days").textContent = pad(days);
    $("hours").textContent = pad(hours);
    $("minutes").textContent = pad(minutes);
    $("seconds").textContent = pad(seconds);
    $("status").textContent = "SYSTEM ONLINE • COUNTDOWN ACTIVE";
  }else{
    $("days").textContent = "00";
    $("hours").textContent = "00";
    $("minutes").textContent = "00";
    $("seconds").textContent = "00";
    $("status").textContent = "🚀 HACKATHON IS LIVE • TIME IS UP!";
    clearInterval(timerInterval);
  }
}

function startHackathon() {
  if (timerInterval) return; // Prevent multiple starts
  
  endTime = Date.now() + DURATION_MS;
  localStorage.setItem('hackathonEndTime', endTime.toString()); // Save to local storage
  updateCountdown(); // Update immediately
  timerInterval = setInterval(updateCountdown, 1000);
  
  // Hide the button and update status
  $("start-btn").style.display = "none";
  $("status").textContent = "SYSTEM ONLINE • COUNTDOWN ACTIVE";
}

$("start-btn").addEventListener("click", startHackathon);

// Initialize Display
if (endTime) {
  // Timer was already running, resume it
  $("start-btn").style.display = "none";
  updateCountdown();
  timerInterval = setInterval(updateCountdown, 1000);
} else {
  // Timer has not started yet
  $("days").textContent = "00";
  $("hours").textContent = "08";
  $("minutes").textContent = "00";
  $("seconds").textContent = "00";
  $("status").textContent = "WAITING TO START...";
}
