// ==========================================================================
// PARANOVA ARCADE TRANSFORMATION ENGINE
// Bidirectional Pac-Man Continuous Loop (Left-to-Right & Right-to-Left)
// Exact 3-Second Holds • Zero Layout Shift • Pure Client-Side
// ==========================================================================

(function() {
  const stage = document.getElementById("arcade-heading-stage");
  const title = document.getElementById("arcade-title");
  const wordParanova = document.getElementById("word-paranova");
  const wordHackathon = document.getElementById("word-hackathon");
  const pacman = document.getElementById("pacman-actor");
  const particleContainer = document.getElementById("arcade-particles");

  if (!stage || !title || !wordParanova || !wordHackathon || !pacman) {
    console.warn("Arcade heading elements not found.");
    return;
  }

  let isRunning = true;
  let activeTimeouts = [];

  function wait(ms) {
    return new Promise(resolve => {
      const id = setTimeout(resolve, ms);
      activeTimeouts.push(id);
    });
  }

  // Particle burst effects
  function createParticle(x, y, type = "pixel", color = "#ff29d9", vx = 0, vy = 0) {
    if (!particleContainer) return;
    const p = document.createElement("div");
    p.className = `arcade-particle particle-${type}`;
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    if (color && type === "pixel") p.style.backgroundColor = color;
    particleContainer.appendChild(p);

    let life = 0;
    const maxLife = 20 + Math.random() * 10;
    let curX = x;
    let curY = y;
    const gravity = 0.35;

    function anim() {
      life++;
      curX += vx;
      curY += vy;
      vy += gravity;
      p.style.transform = `translate(${curX - x}px, ${curY - y}px) scale(${Math.max(0, 1 - life / maxLife)})`;
      p.style.opacity = String(Math.max(0, 1 - life / maxLife));

      if (life < maxLife) {
        requestAnimationFrame(anim);
      } else {
        if (p.parentNode) p.parentNode.removeChild(p);
      }
    }
    requestAnimationFrame(anim);
  }

  function spawnBurst(x, y, count = 8, types = ["pixel", "star", "coin"]) {
    const colors = ["#ffe600", "#ff29d9", "#21c7ff", "#ffd21f", "#fff"];
    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const angle = (Math.PI * 2 * i) / count + (Math.random() * 0.4 - 0.2);
      const speed = 2.5 + Math.random() * 4;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 2;
      createParticle(x, y, type, color, vx, vy);
    }
  }

  // Compute centered element coordinates relative to stage
  function getRelativePos(elem) {
    const stageRect = stage.getBoundingClientRect();
    const elemRect = elem.getBoundingClientRect();
    return {
      x: elemRect.left - stageRect.left,
      y: elemRect.top - stageRect.top,
      width: elemRect.width,
      height: elemRect.height,
      centerX: elemRect.left - stageRect.left + elemRect.width / 2,
      centerY: elemRect.top - stageRect.top + elemRect.height / 2
    };
  }

  function resetWordLetters(wordElem) {
    const letters = Array.from(wordElem.querySelectorAll(".letter"));
    letters.forEach(letter => {
      letter.classList.remove("eaten", "eating-flash");
      letter.style.opacity = "1";
      letter.style.transform = "none";
      letter.style.visibility = "visible";
    });
  }

  // ==========================================================================
  // DIRECTION 1: PAC-MAN EATS LEFT-TO-RIGHT (FOR PARANOVA)
  // ==========================================================================
  async function eatWordLeftToRight(wordElem) {
    const letters = Array.from(wordElem.querySelectorAll(".letter"));
    const pacmanW = pacman.offsetWidth || 50;

    // Face right
    pacman.classList.remove("face-left");

    // Start off-screen left
    const firstPos = getRelativePos(letters[0]);
    const startX = -pacmanW * 1.5;

    pacman.style.transition = "none";
    pacman.style.left = `${startX}px`;
    pacman.style.top = `${firstPos.centerY}px`;
    pacman.classList.add("active");

    await wait(30);

    // Smoothly approach first letter (P)
    pacman.style.transition = "left 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    pacman.style.left = `${firstPos.centerX}px`;
    pacman.style.top = `${firstPos.centerY}px`;

    await wait(550);

    // Eat each letter from left to right (P -> A -> R -> A -> N -> O -> V -> A)
    for (let i = 0; i < letters.length; i++) {
      const letter = letters[i];
      const pos = getRelativePos(letter);

      pacman.style.transition = "left 0.22s linear";
      pacman.style.left = `${pos.centerX}px`;
      pacman.style.top = `${pos.centerY}px`;

      await wait(180);

      letter.classList.add("eating-flash");
      spawnBurst(pos.centerX, pos.centerY, 5, ["pixel"]);

      await wait(70);
      letter.classList.add("eaten");
    }

    // Exit off-screen right
    const exitX = stage.offsetWidth + pacmanW * 1.5;
    pacman.style.transition = "left 0.4s ease-in, opacity 0.2s 0.2s";
    pacman.style.left = `${exitX}px`;

    await wait(420);
    pacman.classList.remove("active");
  }

  // ==========================================================================
  // DIRECTION 2: PAC-MAN EATS RIGHT-TO-LEFT (FOR HACKATHON)
  // ==========================================================================
  async function eatWordRightToLeft(wordElem) {
    const letters = Array.from(wordElem.querySelectorAll(".letter"));
    const pacmanW = pacman.offsetWidth || 50;

    // Face left (mirrored)
    pacman.classList.add("face-left");

    // Start off-screen right
    const lastLetterPos = getRelativePos(letters[letters.length - 1]);
    const startX = stage.offsetWidth + pacmanW * 1.5;

    pacman.style.transition = "none";
    pacman.style.left = `${startX}px`;
    pacman.style.top = `${lastLetterPos.centerY}px`;
    pacman.classList.add("active");

    await wait(30);

    // Smoothly approach first letter from right (N)
    pacman.style.transition = "left 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    pacman.style.left = `${lastLetterPos.centerX}px`;
    pacman.style.top = `${lastLetterPos.centerY}px`;

    await wait(550);

    // Eat each letter from right to left (N -> O -> H -> T -> A -> K -> C -> A -> H)
    for (let i = letters.length - 1; i >= 0; i--) {
      const letter = letters[i];
      const pos = getRelativePos(letter);

      pacman.style.transition = "left 0.22s linear";
      pacman.style.left = `${pos.centerX}px`;
      pacman.style.top = `${pos.centerY}px`;

      await wait(180);

      letter.classList.add("eating-flash");
      spawnBurst(pos.centerX, pos.centerY, 5, ["pixel"]);

      await wait(70);
      letter.classList.add("eaten");
    }

    // Exit off-screen left
    const exitX = -pacmanW * 1.5;
    pacman.style.transition = "left 0.4s ease-in, opacity 0.2s 0.2s";
    pacman.style.left = `${exitX}px`;

    await wait(420);
    pacman.classList.remove("active");
    pacman.classList.remove("face-left");
  }

  // ==========================================================================
  // MAIN CONTINUOUS LOOP
  // ==========================================================================
  async function startPacmanArcadeLoop() {
    // Initial display: Only PARANOVA visible
    resetWordLetters(wordParanova);
    resetWordLetters(wordHackathon);

    wordParanova.classList.remove("hidden");
    wordHackathon.classList.add("hidden");

    while (isRunning) {
      // ----------------------------------------------------------------------
      // STEP 1: PARANOVA_VISIBLE (Exactly 3 seconds)
      // ----------------------------------------------------------------------
      await wait(3000);
      if (!isRunning) break;

      // ----------------------------------------------------------------------
      // STEP 2: EAT_PARANOVA (Pac-Man enters from left, eats Left-to-Right)
      // ----------------------------------------------------------------------
      await eatWordLeftToRight(wordParanova);
      if (!isRunning) break;

      await wait(150); // Temporary empty heading area

      // ----------------------------------------------------------------------
      // STEP 3: SHOW_HACKATHON (Arcade glitch/scale transition)
      // ----------------------------------------------------------------------
      wordParanova.classList.add("hidden");
      resetWordLetters(wordHackathon);
      wordHackathon.classList.remove("hidden");
      wordHackathon.classList.remove("word-glitch-in");
      void wordHackathon.offsetWidth; // trigger reflow
      wordHackathon.classList.add("word-glitch-in");

      const hackPos = getRelativePos(wordHackathon);
      spawnBurst(hackPos.centerX, hackPos.centerY, 12, ["star", "coin", "pixel"]);

      await wait(500); // Transition duration

      // ----------------------------------------------------------------------
      // STEP 4: HACKATHON_VISIBLE (Exactly 3 seconds)
      // ----------------------------------------------------------------------
      await wait(3000);
      if (!isRunning) break;

      // ----------------------------------------------------------------------
      // STEP 5: EAT_HACKATHON (Pac-Man enters from right, faces left, eats Right-to-Left)
      // ----------------------------------------------------------------------
      await eatWordRightToLeft(wordHackathon);
      if (!isRunning) break;

      await wait(150); // Temporary empty heading area

      // ----------------------------------------------------------------------
      // STEP 6: SHOW_PARANOVA_AGAIN (Arcade glitch/scale transition)
      // ----------------------------------------------------------------------
      wordHackathon.classList.add("hidden");
      resetWordLetters(wordParanova);
      wordParanova.classList.remove("hidden");
      wordParanova.classList.remove("word-glitch-in");
      void wordParanova.offsetWidth; // trigger reflow
      wordParanova.classList.add("word-glitch-in");

      const paraPos = getRelativePos(wordParanova);
      spawnBurst(paraPos.centerX, paraPos.centerY, 12, ["star", "coin", "pixel"]);

      await wait(500); // Transition duration

      // ----------------------------------------------------------------------
      // STEP 7: REPEAT (Returns to Step 1: 3-second hold on PARANOVA)
      // ----------------------------------------------------------------------
    }
  }

  // Start loop on DOM load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startPacmanArcadeLoop);
  } else {
    startPacmanArcadeLoop();
  }
})();
