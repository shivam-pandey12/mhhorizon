const scene = document.getElementById("scene");
const truck = document.getElementById("truck");
const truckBed = document.getElementById("truckBed");
const trolley = document.getElementById("trolley");
const cable = document.getElementById("cable");
const hook = document.getElementById("hook");
const hookAnchor = document.getElementById("hookAnchor");
const truckBedAnchor = document.getElementById("truckBedAnchor");
const pickupAnchor = document.getElementById("pickupAnchor");
const crate = document.getElementById("crate");
const statusText = document.getElementById("statusText");
const deliveryCount = document.getElementById("deliveryCount");
const progressCount = document.getElementById("progressCount");
const progressFill = document.getElementById("progressFill");
const progressPercent = document.getElementById("progressPercent");
const weldFlash = document.getElementById("weldFlash");

const headlineLetters = new Map(
  [...document.querySelectorAll("[data-letter-mark]")].map((node) => [node.dataset.letterMark, node])
);

const buildSequence = [
  "seg-i-top",
  "seg-i-upper",
  "seg-i-lower",
  "seg-i-bottom",
  "seg-o-left",
  "seg-o-top",
  "seg-o-right",
  "seg-o-bottom",
  "seg-n-left",
  "seg-n-diagonal",
  "seg-n-right"
].map((id) => document.getElementById(id));

const state = {
  truckLeft: -30,
  bedAngle: 0,
  trolleyX: 29,
  hookDrop: 0,
  hookSwing: 0,
  crateMode: "bed",
  crateVisible: true,
  cratePoint: { x: 0, y: 0, rotation: 0 }
};

const config = {
  truckStop: 31,
  truckExit: 116,
  truckStart: -30,
  restTrolleyX: 29
};

const segmentCounts = buildSequence.reduce((accumulator, segment) => {
  const letter = segment.dataset.letter;
  accumulator[letter] = (accumulator[letter] || 0) + 1;
  return accumulator;
}, {});

let builtCount = 0;
let deliveryRuns = 0;
let hookCargoBaseY = 0;

const statusPools = {
  approach: [
    "Delivery {delivery} entering the yard with fresh steel.",
    "Supply run {delivery} is rolling under the crane.",
    "Truck {delivery} is lining up with a new beam section."
  ],
  dump: [
    "Truck dumping steel at the pickup pad.",
    "Bed tipping. Fresh steel is sliding onto the pad.",
    "Unload sequence active. New framing steel is on the way down."
  ],
  hookDown: [
    "Crane hook lowering for the next piece.",
    "Rigging line descending toward the pickup pad.",
    "Hook set is dropping in for the next lift."
  ],
  hoist: [
    "Hoisting steel toward {letter}.",
    "Swinging the next section into the {letter} lane.",
    "Crane trolley is carrying steel toward {letter}."
  ],
  place: [
    "Lowering into place for {letter}.",
    "Aligning the next steel section for {letter}.",
    "Crew is guiding the final drop onto {letter}."
  ],
  reset: [
    "Truck heading back while the crane resets.",
    "Hauler is clearing the lane for another pickup.",
    "Outbound run underway while the crane returns to center."
  ],
  complete: [
    "ION complete. Resetting for another cycle.",
    "Final section welded. The site is resetting to rebuild ION.",
    "Structure complete. Cycling the yard for another pass."
  ],
  standby: [
    "Fresh materials queued for the next build.",
    "Next steel shipment is being prepped off-screen.",
    "The yard is ready for another construction run."
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

function setStatus(message) {
  statusText.textContent = message;
}

function nextStatus(key, variables = {}) {
  const pool = statusPools[key];
  const index = statusCursor[key] || 0;
  statusCursor[key] = (index + 1) % pool.length;

  return pool[index].replace(/\{(\w+)\}/g, (_, token) => variables[token] ?? "");
}

function updateStats() {
  deliveryCount.textContent = String(deliveryRuns).padStart(2, "0");
  progressCount.textContent = `${builtCount} / ${buildSequence.length}`;
  const percent = Math.round((builtCount / buildSequence.length) * 100);
  progressFill.style.width = `${percent}%`;
  progressPercent.textContent = `${percent}%`;
}

function updateHeadline() {
  headlineLetters.forEach((node, letter) => {
    const relevantSegments = buildSequence.filter((segment) => segment.dataset.letter === letter);
    const completed = relevantSegments.filter((segment) => segment.classList.contains("is-built")).length;

    node.classList.toggle("is-live", completed > 0);
    node.classList.toggle("is-complete", completed === segmentCounts[letter]);
  });
}

function triggerWeldFlash(targetPoint) {
  weldFlash.style.left = `${targetPoint.x}%`;
  weldFlash.style.top = `${targetPoint.y}%`;
  weldFlash.classList.remove("is-active");
  void weldFlash.offsetWidth;
  weldFlash.classList.add("is-active");
}

function setCrateVisible(isVisible) {
  state.crateVisible = isVisible;
  crate.classList.toggle("is-visible", isVisible);
}

function render() {
  truck.style.left = `${state.truckLeft}%`;
  truckBed.style.setProperty("--bed-angle", `${state.bedAngle}deg`);

  trolley.style.left = `${state.trolleyX}%`;
  cable.style.left = `${state.trolleyX}%`;
  cable.style.height = `${Math.max(state.hookDrop, 0)}%`;
  cable.style.transform = `translateX(-50%) rotate(${state.hookSwing * 0.28}deg)`;

  hook.style.left = `${state.trolleyX}%`;
  hook.style.top = `${20.2 + Math.max(state.hookDrop, 0)}%`;
  hook.style.transform = `translateX(-50%) rotate(${state.hookSwing}deg)`;

  if (!state.crateVisible) {
    crate.classList.remove("is-visible");
    return;
  }

  let point;

  if (state.crateMode === "bed") {
    point = getScenePoint(truckBedAnchor);
  } else if (state.crateMode === "pad") {
    point = getScenePoint(pickupAnchor);
  } else if (state.crateMode === "hook") {
    point = {
      ...getScenePoint(hookAnchor),
      rotation: state.hookSwing * 0.72
    };
  } else {
    point = state.cratePoint;
  }

  crate.classList.add("is-visible");
  crate.style.left = `${point.x}%`;
  crate.style.top = `${point.y}%`;
  crate.style.transform = `translate(-50%, -50%) rotate(${point.rotation || 0}deg)`;
}

function calibrateHookBase() {
  const previousDrop = state.hookDrop;
  state.hookDrop = 0;
  render();
  hookCargoBaseY = getScenePoint(hookAnchor).y;
  state.hookDrop = previousDrop;
  render();
}

function resetSite() {
  builtCount = 0;
  buildSequence.forEach((segment) => {
    segment.classList.remove("is-built", "is-flashing");
  });

  state.truckLeft = config.truckStart;
  state.bedAngle = 0;
  state.trolleyX = config.restTrolleyX;
  state.hookDrop = 0;
  state.hookSwing = 0;
  state.crateMode = "bed";
  truck.classList.remove("is-driving");
  setCrateVisible(true);
  updateStats();
  updateHeadline();
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

async function buildOneSegment(segment) {
  const segmentPoint = getScenePoint(segment);
  const pickupPoint = getScenePoint(pickupAnchor);
  const pickupDrop = Math.max(pickupPoint.y - hookCargoBaseY, 2);
  const segmentDrop = Math.max(segmentPoint.y - hookCargoBaseY, 4);

  deliveryRuns += 1;
  updateStats();
  setStatus(nextStatus("approach", {
    delivery: String(deliveryRuns).padStart(2, "0"),
    letter: segment.dataset.letter
  }));
  state.crateMode = "bed";
  state.bedAngle = 0;
  state.truckLeft = config.truckStart;
  state.trolleyX = config.restTrolleyX;
  state.hookDrop = 0;
  state.hookSwing = 0;
  truck.classList.add("is-driving");
  setCrateVisible(true);
  render();

  await animate(3200, (progress) => {
    state.truckLeft = lerp(config.truckStart, config.truckStop, progress);
  }, easeOut);
  truck.classList.remove("is-driving");

  setStatus(nextStatus("dump", { letter: segment.dataset.letter }));
  state.crateMode = "free";
  await animate(1700, (progress) => {
    state.bedAngle = lerp(0, -24, progress);

    const from = getScenePoint(truckBedAnchor);
    const to = getScenePoint(pickupAnchor);

    state.cratePoint = {
      x: lerp(from.x, to.x, progress),
      y: lerp(from.y, to.y, easeOut(progress)),
      rotation: lerp(0, -14, progress)
    };
  }, easeInOut);

  state.crateMode = "pad";
  state.bedAngle = -24;
  render();
  await wait(220);

  await animate(900, (progress) => {
    state.bedAngle = lerp(-24, 0, progress);
  }, easeOut);

  setStatus(nextStatus("hookDown", { letter: segment.dataset.letter }));
  await animate(1150, (progress) => {
    state.hookDrop = lerp(0, pickupDrop, progress);
    state.hookSwing = Math.sin(progress * Math.PI * 1.5) * 4;
  }, easeInOut);

  await wait(120);
  state.crateMode = "hook";
  render();

  setStatus(nextStatus("hoist", { letter: segment.dataset.letter }));
  await animate(950, (progress) => {
    state.hookDrop = lerp(pickupDrop, 2.2, progress);
    state.hookSwing = Math.sin(progress * Math.PI * 2.4) * 6 * (1 - progress * 0.3);
  }, easeInOut);

  await animate(1550, (progress) => {
    state.trolleyX = lerp(config.restTrolleyX, segmentPoint.x, progress);
    state.hookSwing = Math.sin(progress * Math.PI * 2.8) * 5 * (1 - progress * 0.35);
  }, easeInOut);

  setStatus(nextStatus("place", { letter: segment.dataset.letter }));
  await animate(1100, (progress) => {
    state.hookDrop = lerp(2.2, segmentDrop, progress);
    state.hookSwing = Math.sin(progress * Math.PI * 1.8) * 2.4 * (1 - progress);
  }, easeInOut);

  setCrateVisible(false);
  segment.classList.add("is-built", "is-flashing");
  triggerWeldFlash(segmentPoint);
  builtCount += 1;
  updateStats();
  updateHeadline();

  window.setTimeout(() => {
    segment.classList.remove("is-flashing");
  }, 520);

  await wait(220);

  await animate(900, (progress) => {
    state.hookDrop = lerp(segmentDrop, 0, progress);
    state.hookSwing = lerp(state.hookSwing, 0, progress);
  }, easeInOut);

  setStatus(nextStatus("reset", { letter: segment.dataset.letter }));
  truck.classList.add("is-driving");
  await animate(2300, (progress) => {
    state.truckLeft = lerp(config.truckStop, config.truckExit, progress);
    state.trolleyX = lerp(segmentPoint.x, config.restTrolleyX, progress);
    state.hookSwing = lerp(state.hookSwing, 0, progress);
  }, easeInOut);
  truck.classList.remove("is-driving");

  state.truckLeft = config.truckStart;
  state.crateMode = "bed";
  state.hookSwing = 0;
  setCrateVisible(true);
  render();
}

async function runLoop() {
  while (true) {
    for (const segment of buildSequence) {
      await buildOneSegment(segment);
      await wait(240);
    }

    setStatus(nextStatus("complete"));
    await wait(2600);
    resetSite();
    setStatus(nextStatus("standby"));
    await wait(900);
  }
}

window.addEventListener("resize", () => {
  calibrateHookBase();
  render();
});

resetSite();
window.requestAnimationFrame(() => {
  calibrateHookBase();
  window.setTimeout(() => {
    document.body.classList.add("is-ready");
  }, 220);
  runLoop();
});
