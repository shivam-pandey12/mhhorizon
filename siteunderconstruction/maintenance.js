const scene = document.getElementById("scene");
const serviceBot = document.getElementById("serviceBot");
const botAnchor = document.getElementById("botAnchor");
const botRestAnchor = document.getElementById("botRestAnchor");
const serviceModule = document.getElementById("serviceModule");
const supplyCart = document.getElementById("supplyCart");
const cartAnchor = document.getElementById("cartAnchor");
const statusText = document.getElementById("statusText");
const cycleCount = document.getElementById("cycleCount");
const progressCount = document.getElementById("progressCount");
const healthFill = document.getElementById("healthFill");
const healthValue = document.getElementById("healthValue");
const uptimeValue = document.getElementById("uptimeValue");
const logList = document.getElementById("logList");
const pulseRing = document.getElementById("pulseRing");
const rebootFlash = document.getElementById("rebootFlash");

const headlineLetters = new Map(
  [...document.querySelectorAll("[data-letter-mark]")].map((node) => [node.dataset.letterMark, node])
);

const buildSequence = [
  "seg-n-left",
  "seg-n-diagonal",
  "seg-n-right",
  "seg-c-top",
  "seg-c-left",
  "seg-c-bottom",
  "seg-e-top",
  "seg-e-left",
  "seg-e-middle",
  "seg-e-bottom"
].map((id) => document.getElementById(id));

const state = {
  cartLeft: -24,
  botX: 0,
  botY: 0,
  botRotation: 0,
  moduleMode: "cart",
  moduleVisible: true
};

const config = {
  cartStart: -24,
  cartStop: 12,
  cartExit: 118
};

const segmentCounts = buildSequence.reduce((accumulator, segment) => {
  const letter = segment.dataset.letter;
  accumulator[letter] = (accumulator[letter] || 0) + 1;
  return accumulator;
}, {});

let builtCount = 0;
let cycleRuns = 0;
let bootTimestamp = Date.now();
let logEntries = [
  "Diagnostics queued for startup",
  "Cooling lattice synchronized",
  "Module rack standing by"
];

const statusPools = {
  approach: [
    "Cycle {cycle} rolling in a fresh module.",
    "Service cart {cycle} is approaching the dock.",
    "Repair run {cycle} is loading a calibrated module."
  ],
  pickup: [
    "Repair cart docked for pickup.",
    "Pickup cradle engaged. Bot is taking position.",
    "Module transfer bay is ready for the next lift."
  ],
  carry: [
    "Service bot carrying a module toward {letter}.",
    "Repair drone ferrying a module into the {letter} lane.",
    "Fresh module en route to {letter}."
  ],
  calibrate: [
    "Calibrating {letter}.",
    "Locking fresh output into {letter}.",
    "Signal alignment active for {letter}."
  ],
  return: [
    "Bot returning to the dock.",
    "Repair drone clearing the bay.",
    "Bot is gliding back for another pickup."
  ],
  clear: [
    "Cart clearing the service lane.",
    "Supply cart exiting while diagnostics refresh.",
    "Module cart is rolling clear for the next cycle."
  ],
  complete: [
    "NCE stable. Restarting the maintenance cycle.",
    "Restoration complete. Reboot pulse initiated.",
    "Service pass complete. The lab is resetting NCE."
  ],
  standby: [
    "Fresh modules queued for the next service run.",
    "Diagnostics reset. Another maintenance pass is ready.",
    "The lab is standing by for the next restore cycle."
  ]
};

const statusCursor = {};

const wait = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const lerp = (start, end, progress) => start + (end - start) * progress;

const easeInOut = (t) => {
  if (t < 0.5) {
    return 4 * t * t * t;
  }

  return 1 - Math.pow(-2 * t + 2, 3) / 2;
};

const easeOut = (t) => 1 - Math.pow(1 - t, 3);

function getScenePoint(element) {
  const sceneRect = scene.getBoundingClientRect();
  const rect = element.getBoundingClientRect();

  return {
    x: ((rect.left + rect.width / 2) - sceneRect.left) / sceneRect.width * 100,
    y: ((rect.top + rect.height / 2) - sceneRect.top) / sceneRect.height * 100
  };
}

function getRestPoint() {
  return getScenePoint(botRestAnchor);
}

function getTargetPoint(segment) {
  const point = getScenePoint(segment);

  return {
    x: point.x,
    y: point.y - 8
  };
}

function setStatus(message) {
  statusText.textContent = message;
}

function nextStatus(key, variables = {}) {
  const pool = statusPools[key];
  const index = statusCursor[key] || 0;
  statusCursor[key] = (index + 1) % pool.length;

  return pool[index].replace(/\{(\w+)\}/g, (_, token) => variables[token] ?? "");
}

function renderLogs() {
  logList.innerHTML = logEntries.map((entry) => `<li>${entry}</li>`).join("");
}

function pushLog(entry) {
  logEntries = [entry, ...logEntries].slice(0, 3);
  renderLogs();
}

function updateUptime() {
  const elapsed = Math.floor((Date.now() - bootTimestamp) / 1000);
  const hours = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");
  uptimeValue.textContent = `${hours}:${minutes}:${seconds}`;
}

function updateStats() {
  cycleCount.textContent = String(cycleRuns).padStart(2, "0");
  progressCount.textContent = `${builtCount} / ${buildSequence.length}`;
  const health = Math.min(100, 72 + Math.round((builtCount / buildSequence.length) * 28));
  healthFill.style.width = `${health}%`;
  healthValue.textContent = `${health}%`;
}

function updateHeadline() {
  headlineLetters.forEach((node, letter) => {
    const relevantSegments = buildSequence.filter((segment) => segment.dataset.letter === letter);
    const completed = relevantSegments.filter((segment) => segment.classList.contains("is-built")).length;

    node.classList.toggle("is-live", completed > 0);
    node.classList.toggle("is-complete", completed === segmentCounts[letter]);
  });
}

function triggerPulse(targetPoint) {
  pulseRing.style.left = `${targetPoint.x}%`;
  pulseRing.style.top = `${targetPoint.y}%`;
  pulseRing.classList.remove("is-active");
  void pulseRing.offsetWidth;
  pulseRing.classList.add("is-active");
}

function triggerRebootFlash() {
  rebootFlash.classList.remove("is-active");
  void rebootFlash.offsetWidth;
  rebootFlash.classList.add("is-active");
}

function setModuleVisible(isVisible) {
  state.moduleVisible = isVisible;
  serviceModule.classList.toggle("is-visible", isVisible);
}

function render() {
  supplyCart.style.left = `${state.cartLeft}%`;
  serviceBot.style.left = `${state.botX}%`;
  serviceBot.style.top = `${state.botY}%`;
  serviceBot.style.transform = `translate(-50%, -50%) rotate(${state.botRotation}deg)`;

  if (!state.moduleVisible) {
    serviceModule.classList.remove("is-visible");
    return;
  }

  const anchor = state.moduleMode === "bot" ? botAnchor : cartAnchor;
  const point = getScenePoint(anchor);

  serviceModule.classList.add("is-visible");
  serviceModule.style.left = `${point.x}%`;
  serviceModule.style.top = `${point.y}%`;
  serviceModule.style.transform = "translate(-50%, -50%)";
}

function resetBay() {
  builtCount = 0;
  buildSequence.forEach((segment) => {
    segment.classList.remove("is-built", "is-flashing");
  });

  const restPoint = getRestPoint();

  state.cartLeft = config.cartStart;
  state.botX = restPoint.x;
  state.botY = restPoint.y;
  state.botRotation = 0;
  state.moduleMode = "cart";
  setModuleVisible(true);
  logEntries = [
    "Diagnostics queued for startup",
    "Cooling lattice synchronized",
    "Module rack standing by"
  ];
  renderLogs();
  updateStats();
  updateHeadline();
  updateUptime();
  render();
}

function animate(duration, update, easing = easeInOut) {
  return new Promise((resolve) => {
    const start = performance.now();

    function frame(now) {
      const raw = clamp((now - start) / duration, 0, 1);
      update(easing(raw), raw);
      render();

      if (raw < 1) {
        window.requestAnimationFrame(frame);
      } else {
        resolve();
      }
    }

    window.requestAnimationFrame(frame);
  });
}

async function repairSegment(segment) {
  const restPoint = getRestPoint();

  cycleRuns += 1;
  updateStats();
  setStatus(nextStatus("approach", {
    cycle: String(cycleRuns).padStart(2, "0"),
    letter: segment.dataset.letter
  }));
  pushLog(`Cycle ${String(cycleRuns).padStart(2, "0")} module received`);
  state.cartLeft = config.cartStart;
  state.botX = restPoint.x;
  state.botY = restPoint.y;
  state.botRotation = 0;
  state.moduleMode = "cart";
  setModuleVisible(true);
  render();

  await animate(1700, (progress) => {
    state.cartLeft = lerp(config.cartStart, config.cartStop, progress);
  }, easeOut);

  setStatus(nextStatus("pickup", { letter: segment.dataset.letter }));
  pushLog("Pickup cradle aligned");
  const cartPoint = getScenePoint(cartAnchor);
  const cartHover = {
    x: cartPoint.x,
    y: cartPoint.y - 11
  };

  await animate(900, (progress) => {
    state.botX = lerp(restPoint.x, cartHover.x, progress);
    state.botY = lerp(restPoint.y, cartHover.y, progress);
    state.botRotation = lerp(0, -8, progress);
  }, easeInOut);

  state.moduleMode = "bot";
  render();
  await wait(100);

  const targetPoint = getTargetPoint(segment);

  setStatus(nextStatus("carry", { letter: segment.dataset.letter }));
  pushLog(`Module routed to ${segment.dataset.letter}`);
  await animate(1450, (progress) => {
    state.botX = lerp(cartHover.x, targetPoint.x, progress);
    state.botY = lerp(cartHover.y, targetPoint.y, progress);
    state.botRotation = lerp(-8, 8, progress);
  }, easeInOut);

  setStatus(nextStatus("calibrate", { letter: segment.dataset.letter }));
  triggerPulse(getScenePoint(segment));
  setModuleVisible(false);
  segment.classList.add("is-built", "is-flashing");
  pushLog(`${segment.dataset.letter} channel stabilized`);
  builtCount += 1;
  updateStats();
  updateHeadline();

  window.setTimeout(() => {
    segment.classList.remove("is-flashing");
  }, 480);

  await wait(260);

  setStatus(nextStatus("return", { letter: segment.dataset.letter }));
  await animate(1050, (progress) => {
    state.botX = lerp(targetPoint.x, restPoint.x, progress);
    state.botY = lerp(targetPoint.y, restPoint.y, progress);
    state.botRotation = lerp(8, 0, progress);
  }, easeInOut);

  setStatus(nextStatus("clear", { letter: segment.dataset.letter }));
  pushLog("Service lane reopened");
  await animate(1700, (progress) => {
    state.cartLeft = lerp(config.cartStop, config.cartExit, progress);
  }, easeInOut);

  state.cartLeft = config.cartStart;
  state.moduleMode = "cart";
  setModuleVisible(true);
  render();
}

async function runLoop() {
  while (true) {
    for (const segment of buildSequence) {
      await repairSegment(segment);
      await wait(220);
    }

    setStatus(nextStatus("complete"));
    pushLog("System reboot pulse complete");
    triggerRebootFlash();
    await wait(2400);
    resetBay();
    setStatus(nextStatus("standby"));
    await wait(900);
  }
}

window.addEventListener("resize", () => {
  if (builtCount === 0) {
    const restPoint = getRestPoint();
    state.botX = restPoint.x;
    state.botY = restPoint.y;
  }

  render();
});

window.requestAnimationFrame(() => {
  resetBay();
  window.setTimeout(() => {
    document.body.classList.add("is-ready");
  }, 220);
  runLoop();
});

window.setInterval(updateUptime, 1000);
