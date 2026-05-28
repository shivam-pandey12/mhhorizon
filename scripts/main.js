const hubs = window.MHHorizonHubs || [];

const stateHue = {
  live: 42,
  beta: 48,
  maintenance: 38,
  "coming-soon": 24,
  experimental: 34,
};

const stateLabel = {
  live: "Live",
  beta: "Beta",
  maintenance: "Maintenance",
  "coming-soon": "Coming Soon",
  experimental: "Experimental",
};

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointerQuery = window.matchMedia("(pointer: fine)");

document.addEventListener("DOMContentLoaded", () => {
  initManifestLink();
  initPageTransition();
  initThemeToggle();
  initHeroTyping();
  syncHubMetrics();
  initHomeOrbitGateway();
  renderHubGrid();
  renderSpotlightGrid();
  renderNetworkLedger();
  initNavigation();
  initActiveNavigation();
  initRevealObserver();
  initCounters();
  initTilt();
  initMagneticButtons();
  initSurfaceLighting();
  initCosmicCanvases();
  initAmbientShapes();
  initPointerIntent();
  updateYear();
});

function initManifestLink() {
  if (window.location.protocol === "file:" || document.querySelector('link[rel="manifest"]')) {
    return;
  }

  const manifest = document.createElement("link");
  manifest.rel = "manifest";
  manifest.href = "site.webmanifest";
  document.head.append(manifest);
}

function initPageTransition() {
  const overlay = document.querySelector("[data-page-transition]");
  const transitionFlag = "mh-horizon-pending-transition";
  const transitionMessageKey = "mh-horizon-transition-message";
  const isFileProtocol = window.location.protocol === "file:";

  if (!overlay) {
    document.documentElement.classList.remove("is-preload");
    return;
  }

  enhancePageTransition(overlay);

  const storedTransitionMessage = window.sessionStorage.getItem(transitionMessageKey);
  const fromInternalTransition = window.sessionStorage.getItem(transitionFlag) === "1";
  window.sessionStorage.removeItem(transitionMessageKey);
  window.sessionStorage.removeItem(transitionFlag);
  setPageTransitionMessage(
    overlay,
    storedTransitionMessage || getPageTransitionMessage(window.location.href)
  );

  const introDuration = reducedMotionQuery.matches
    ? 180
    : fromInternalTransition
    ? 560
    : 1150;

  const beginIntro = performance.now();
  const releaseIntro = () => {
    const elapsed = performance.now() - beginIntro;
    const waitTime = Math.max(introDuration - elapsed, 0);

    window.setTimeout(() => {
      overlay.classList.add("is-ready");
      document.documentElement.classList.remove("is-preload");
    }, waitTime);
  };

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(releaseIntro);
  });

  if (reducedMotionQuery.matches || isFileProtocol) {
    return;
  }

  document.querySelectorAll("a[href]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const href = link.getAttribute("href");

      if (
        !href ||
        href.startsWith("#") ||
        link.target === "_blank" ||
        link.hasAttribute("download") ||
        link.dataset.noTransition === "true"
      ) {
        return;
      }

      const nextUrl = new URL(link.href, window.location.href);

      if (nextUrl.origin !== window.location.origin) {
        return;
      }

      const isSameDocumentJump =
        nextUrl.pathname === window.location.pathname &&
        nextUrl.search === window.location.search &&
        Boolean(nextUrl.hash);

      if (isSameDocumentJump) {
        return;
      }

      event.preventDefault();
      const nextTransitionMessage = getPageTransitionMessage(nextUrl.href);
      window.sessionStorage.setItem(transitionFlag, "1");
      window.sessionStorage.setItem(transitionMessageKey, nextTransitionMessage);
      setPageTransitionMessage(overlay, nextTransitionMessage);
      document.documentElement.classList.add("is-transitioning");
      overlay.classList.remove("is-ready");

      window.setTimeout(() => {
        window.location.href = nextUrl.href;
      }, 560);
    });
  });
}

function enhancePageTransition(overlay) {
  if (!overlay || overlay.dataset.enhanced === "true") {
    return;
  }

  const constellationStars = [
    [-104, 0, -176, -58, -154, 72, 5.2],
    [-88, -24, -132, -84, -188, -22, 4.2],
    [-58, -34, -72, -104, -112, 92, 4.8],
    [-28, -20, -18, -86, -68, 70, 3.8],
    [0, 0, -8, -118, 8, 108, 5.4],
    [-28, 20, -66, 92, -22, -98, 4.4],
    [-58, 34, -118, 78, -84, -82, 4.9],
    [-88, 24, -184, 24, -144, -76, 3.9],
    [28, -20, 74, -92, 30, 98, 4.3],
    [58, -34, 118, -76, 90, 84, 5],
    [88, -24, 180, -26, 142, 80, 4.1],
    [104, 0, 168, 62, 184, -62, 5.4],
    [88, 24, 146, 90, 172, 18, 4.5],
    [58, 34, 104, 104, 122, -82, 3.9],
    [28, 20, 18, 92, 70, -96, 4.8],
    [-8, -6, -42, -124, 52, 112, 3.6],
    [8, 6, 44, 124, -54, -112, 3.6],
  ]
    .map(
      ([toX, toY, fromX, fromY, scatterX, scatterY, size], index) => `
        <span
          class="page-transition-star"
          style="--to-x:${toX}px; --to-y:${toY}px; --from-x:${fromX}px; --from-y:${fromY}px; --scatter-x:${scatterX}px; --scatter-y:${scatterY}px; --star-size:${size}px; --twinkle-delay:${(index * 0.11).toFixed(2)}s;"
        ></span>
      `
    )
    .join("");

  overlay.innerHTML = `
    <div class="page-transition-stage" aria-hidden="true">
      <span class="page-transition-glow"></span>
      <svg class="page-transition-constellation-lines" viewBox="0 0 260 120" role="img" aria-label="Infinity constellation loading symbol">
        <path
          class="page-transition-constellation-shadow"
          d="M130 60 C98 16 47 18 38 56 C29 98 88 102 130 60 C172 18 231 22 222 64 C213 102 162 104 130 60"
          pathLength="1"
        ></path>
        <path
          class="page-transition-constellation-path"
          d="M130 60 C98 16 47 18 38 56 C29 98 88 102 130 60 C172 18 231 22 222 64 C213 102 162 104 130 60"
          pathLength="1"
        ></path>
      </svg>
      <span class="page-transition-star-field">${constellationStars}</span>
    </div>
    <span class="page-transition-copy" data-page-transition-message>${getPageTransitionMessage(window.location.href)}</span>
  `;

  overlay.dataset.enhanced = "true";
}

function setPageTransitionMessage(overlay, message) {
  const messageNode = overlay.querySelector("[data-page-transition-message]");

  if (messageNode) {
    messageNode.textContent = message || "Connecting worlds...";
  }
}

function getPageTransitionMessage(urlLike) {
  let url;

  try {
    url = new URL(urlLike, window.location.href);
  } catch {
    return "Connecting worlds...";
  }

  const page = (url.pathname.split("/").pop() || "index.html").toLowerCase();
  const isHubFocus = page === "gatewaytohub.html" && url.searchParams.has("hub");

  if (isHubFocus) {
    return "Focusing selected world...";
  }

  const pageMessages = {
    "index.html": "Returning to the horizon...",
    "gatewaytohub.html": "Aligning orbital gateway...",
    "about.html": "Opening the brand story...",
    "connect.html": "Opening signal channel...",
    "privacy.html": "Securing privacy path...",
    "terms.html": "Loading gateway terms...",
    "disclaimer.html": "Clarifying the route...",
    "404.html": "Searching nearby stars...",
    "maintenance.html": "Checking service bay...",
  };

  if (url.pathname.includes("/siteunderconstruction/")) {
    return page === "maintenance.html" ? "Checking service bay..." : "Preparing launch site...";
  }

  return pageMessages[page] || "Connecting worlds...";
}

function initThemeToggle() {
  const storageKey = "mh-horizon-theme";
  const root = document.documentElement;
  const toggles = document.querySelectorAll("[data-theme-toggle]");
  const theme = root.dataset.theme || localStorage.getItem(storageKey) || "dark";

  applyTheme(theme);

  toggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const nextTheme = root.dataset.theme === "light" ? "dark" : "light";
      applyTheme(nextTheme);
      localStorage.setItem(storageKey, nextTheme);
    });
  });

  function applyTheme(nextTheme) {
    root.dataset.theme = nextTheme;

    document.querySelectorAll("[data-theme-label]").forEach((label) => {
      label.textContent = nextTheme === "light" ? "Light mode" : "Dark mode";
    });

    toggles.forEach((toggle) => {
      toggle.setAttribute("aria-pressed", String(nextTheme === "light"));
    });
  }
}

function initHeroTyping() {
  const typingNode = document.querySelector("[data-typing-text]");

  if (!typingNode) {
    return;
  }

  const message = typingNode.dataset.typingText || typingNode.textContent.trim();

  if (!message) {
    return;
  }

  if (reducedMotionQuery.matches) {
    typingNode.textContent = message;
    return;
  }

  typingNode.textContent = "";

  let index = 0;

  const tick = () => {
    typingNode.textContent = message.slice(0, index);
    index += 1;

    if (index <= message.length) {
      window.setTimeout(tick, index < 6 ? 52 : 74);
    }
  };

  window.setTimeout(tick, 360);
}

function syncHubMetrics() {
  const counts = {
    total: hubs.length,
    live: hubs.filter((hub) => hub.state === "live").length,
    reserved: hubs.filter((hub) => hub.state !== "live").length,
  };

  document.querySelectorAll("[data-hub-metric]").forEach((node) => {
    const metricKey = node.dataset.hubMetric;
    const value = counts[metricKey];

    if (typeof value !== "number") {
      return;
    }

    node.dataset.counter = String(value);

    if (reducedMotionQuery.matches) {
      node.textContent = String(value);
    } else {
      node.textContent = "0";
    }
  });
}

function renderHubGrid() {
  const hubGrid = document.querySelector("#hub-grid");

  if (!hubGrid || !hubs.length) {
    return;
  }

  hubGrid.innerHTML = hubs
    .map((hub, index) => {
      const hue = stateHue[hub.state] || 186;
      const indexLabel = String(index + 1).padStart(2, "0");

      return `
        <article class="hub-card hub-card-${hub.state} reveal" data-tilt style="--card-hue:${hue}" aria-labelledby="hub-title-${hub.id}">
          ${renderHubLogo(hub, "hub-card-logo")}
          <div class="hub-card-top">
            <span class="hub-status hub-status-${hub.state}">${getStateLabel(hub.state)}</span>
            <span class="hub-index">${indexLabel}</span>
          </div>
          <span class="hub-category">${hub.category || "Hub"}</span>
          <h3 id="hub-title-${hub.id}">${hub.name}</h3>
          <p>${hub.description}</p>
          <p class="hub-tagline">${hub.tagline}</p>
          <div class="hub-feature-row">
            ${hub.features.map((feature) => `<span class="feature-pill">${feature}</span>`).join("")}
          </div>
          <div class="hub-card-footer">
            <a class="text-link" href="gatewayToHub.html?hub=${hub.id}" aria-label="View ${hub.name} node details">View node</a>
            ${renderHubLaunchLink(hub, "Launch hub")}
            <span class="hub-card-state-note">${hub.status}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderSpotlightGrid() {
  const spotlightGrid = document.querySelector("#spotlight-grid");

  if (!spotlightGrid || !hubs.length) {
    return;
  }

  const featuredHubs = hubs
    .filter((hub) => hub.featured || hub.state === "live")
    .slice(0, 4);

  spotlightGrid.innerHTML = featuredHubs
    .map((hub, index) => {
      const hue = stateHue[hub.state] || 186;
      const meta = hub.features.slice(0, 2);

      return `
        <article class="spotlight-card reveal" data-tilt style="--card-hue:${hue}" aria-labelledby="spotlight-title-${hub.id}">
          ${renderHubLogo(hub, "spotlight-logo")}
          <div class="spotlight-top">
            <span class="hub-status hub-status-${hub.state}">${getStateLabel(hub.state)}</span>
            <span class="spotlight-index">Featured ${String(index + 1).padStart(2, "0")}</span>
          </div>
          <span class="hub-category">${hub.category || "Hub"}</span>
          <h3 id="spotlight-title-${hub.id}">${hub.name}</h3>
          <p>${hub.description}</p>
          <p class="hub-tagline">${hub.tagline}</p>
          <div class="spotlight-meta">
            ${meta.map((item) => `<span class="feature-pill">${item}</span>`).join("")}
          </div>
          <div class="spotlight-footer">
            <span>${hub.status}</span>
            ${renderHubLaunchLink(hub, "Launch hub") || `<a class="text-link" href="gatewayToHub.html?hub=${hub.id}">Focus this hub</a>`}
          </div>
        </article>
      `;
    })
    .join("");
}

function initHomeOrbitGateway() {
  const system = document.querySelector("[data-home-orbit-system]");
  const stage = document.querySelector("[data-home-orbit-stage]");
  const preview = document.querySelector("[data-home-orbit-preview]");

  if (!system || !stage || !preview || !hubs.length) {
    return;
  }

  const nodes = renderHomeOrbits(system);
  const satellites = Array.from(system.querySelectorAll(".orbit-satellite")).map(
    (satellite, index) => ({
      satellite,
      track: satellite.closest(".orbit-track"),
      duration: Number(satellite.dataset.duration || 22),
      phase: Number(satellite.dataset.phase || index * 0.68),
    })
  );
  let hoveredHubId = "";
  let selectedHubId = hubs.find((hub) => hub.featured)?.id || hubs[0].id;
  let animationFrame = 0;

  updateHomePreview(selectedHubId);
  setActiveHomeOrbit(selectedHubId);

  nodes.forEach((button, index) => {
    button.addEventListener("focus", () => {
      hoveredHubId = button.dataset.hubId || "";
      setActiveHomeOrbit(hoveredHubId);
      updateHomePreview(hoveredHubId);
    });

    button.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectedHubId = button.dataset.hubId || selectedHubId;
        updateHomePreview(selectedHubId);
        setActiveHomeOrbit(selectedHubId);
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        nodes[(index + 1) % nodes.length]?.focus();
        return;
      }

      if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        nodes[(index - 1 + nodes.length) % nodes.length]?.focus();
      }
    });
  });

  system.addEventListener("pointermove", (event) => {
    const ring = findHomeOrbit(event.clientX, event.clientY, nodes);
    hoveredHubId = ring?.dataset.hubId || "";
    stage.classList.toggle("is-node-hovered", Boolean(hoveredHubId));
    setActiveHomeOrbit(hoveredHubId || selectedHubId);

    if (hoveredHubId) {
      updateHomePreview(hoveredHubId);
    }
  });

  system.addEventListener("pointerleave", () => {
    hoveredHubId = "";
    stage.classList.remove("is-node-hovered");
    setActiveHomeOrbit(selectedHubId);
    updateHomePreview(selectedHubId);
  });

  system.addEventListener("pointerdown", (event) => {
    const ring = findHomeOrbit(event.clientX, event.clientY, nodes);

    if (ring) {
      selectedHubId = ring.dataset.hubId || selectedHubId;
      setActiveHomeOrbit(selectedHubId);
      updateHomePreview(selectedHubId);
    }
  });

  system.addEventListener("click", (event) => {
    const ring = findHomeOrbit(event.clientX, event.clientY, nodes);

    if (!ring) {
      return;
    }

    selectedHubId = ring.dataset.hubId || selectedHubId;
    const hub = hubs.find((entry) => entry.id === selectedHubId);

    if (hub) {
      window.location.href = `gatewayToHub.html?hub=${encodeURIComponent(hub.id)}`;
    }
  });

  if (!reducedMotionQuery.matches) {
    animateHomeSatellites();
  } else {
    placeHomeSatellites(performance.now());
  }

  function renderHomeOrbits(container) {
    const compact = window.innerWidth < 640;
    const baseSize = compact ? 48 : 62;
    const baseOffset = compact ? -126 : -158;
    const maxSize = compact ? 152 : 198;
    const maxOffset = compact ? 66 : 90;
    const minDuration = 20;
    const maxDuration = 36.8;
    const maxPhase = Math.PI * 1.82;
    const count = hubs.length;

    container.innerHTML = hubs
      .map((hub, index) => {
        const hue = stateHue[hub.state] || 186;
        const progress = count > 1 ? index / (count - 1) : 0;
        const size = baseSize + (maxSize - baseSize) * progress;
        const offset = baseOffset + (maxOffset - baseOffset) * progress;
        const duration = minDuration + (maxDuration - minDuration) * progress;
        const phase = maxPhase * progress;

        return `
          <button
            class="orbit-ring home-orbit-ring orbit-state-${hub.state}"
            type="button"
            data-hub-id="${hub.id}"
            aria-label="Preview ${hub.name}"
            style="--orbit-size:${size}px; --orbit-offset:${offset}px; --orbit-hue:${hue}; --orbit-duration:${duration}s;"
          >
            <span class="orbit-path"></span>
            <span class="orbit-glow"></span>
          <span class="orbit-track">
            <span
              class="orbit-satellite"
              data-duration="${duration}"
              data-phase="${phase.toFixed(2)}"
            ></span>
          </span>
            <span class="orbit-label">${hub.name}</span>
          </button>
        `;
      })
      .join("");

    return Array.from(container.querySelectorAll(".home-orbit-ring"));
  }

  function setActiveHomeOrbit(hubId) {
    nodes.forEach((button) => {
      const active = button.dataset.hubId === hubId;
      button.classList.toggle("is-hovered", active);
      button.classList.toggle("is-selected", active && hubId === selectedHubId);
      button.setAttribute("aria-pressed", String(active && hubId === selectedHubId));
    });
  }

  function updateHomePreview(hubId) {
    const hub = hubs.find((entry) => entry.id === hubId);

    if (!hub) {
      return;
    }

    const status = preview.querySelector("[data-home-orbit-status]");

    status.textContent = hub.status;
    status.className = `hub-status hub-status-${hub.state}`;
    preview.querySelector("[data-home-orbit-name]").textContent = hub.name;
    preview.querySelector("[data-home-orbit-category]").textContent = hub.category || "Hub";
    preview.querySelector("[data-home-orbit-copy]").textContent = hub.tagline;
    preview.querySelector("[data-home-orbit-note]").textContent = hub.description;

    const link = preview.querySelector("[data-home-orbit-link]");

    if (link) {
      link.href = `gatewayToHub.html?hub=${encodeURIComponent(hub.id)}`;
      link.setAttribute("aria-label", `Open ${hub.name} in the orbital gateway`);
    }
  }

  function findHomeOrbit(clientX, clientY, buttons) {
    let bestRing = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    buttons.forEach((button) => {
      const rect = button.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const radiusX = rect.width / 2 - 4;
      const radiusY = rect.height / 2 - 4;
      const dx = clientX - centerX;
      const dy = clientY - centerY;

      if (Math.abs(dx) > radiusX + 28 || Math.abs(dy) > radiusY + 28) {
        return;
      }

      const normalized = Math.sqrt(
        (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY)
      );
      const radialDistance = Math.abs(normalized - 1) * Math.min(radiusX, radiusY);

      if (radialDistance < bestDistance) {
        bestDistance = radialDistance;
        bestRing = button;
      }
    });

    return bestDistance <= 18 ? bestRing : null;
  }

  function placeHomeSatellites(now) {
    satellites.forEach((orbit) => {
      if (!orbit.track) {
        return;
      }

      const width = orbit.track.clientWidth;
      const height = orbit.track.clientHeight;

      if (!width || !height) {
        return;
      }

      const angle = orbit.phase + (now / 1000) * ((Math.PI * 2) / orbit.duration);
      const dotSize = orbit.satellite.offsetWidth || 16;
      const x = width / 2 + Math.cos(angle) * (width / 2 - dotSize / 2 - 1);
      const y = height / 2 + Math.sin(angle) * (height / 2 - dotSize / 2 - 1);

      orbit.satellite.style.left = `${x.toFixed(2)}px`;
      orbit.satellite.style.top = `${y.toFixed(2)}px`;
    });
  }

  function animateHomeSatellites() {
    const tick = (now) => {
      placeHomeSatellites(now);
      animationFrame = window.requestAnimationFrame(tick);
    };

    animationFrame = window.requestAnimationFrame(tick);
    window.addEventListener("beforeunload", () => {
      window.cancelAnimationFrame(animationFrame);
    });
  }
}

function renderNetworkLedger() {
  const ledger = document.querySelector("#network-ledger");

  if (!ledger || !hubs.length) {
    return;
  }

  ledger.innerHTML = hubs
    .map((hub) => {
      return `
        <article class="ledger-row reveal">
          ${renderHubLogo(hub, "ledger-logo")}
          <div class="ledger-copy">
            <div class="spotlight-top">
              <span class="hub-status hub-status-${hub.state}">${getStateLabel(hub.state)}</span>
              <span class="ledger-state">${hub.status}</span>
            </div>
            <h3>${hub.name}</h3>
            <p>${hub.tagline}</p>
          </div>
          <div class="ledger-actions">
            <span class="ledger-note">${hub.note}</span>
            ${renderHubLaunchLink(hub, "Launch hub")}
            <a class="btn btn-secondary" href="gatewayToHub.html?hub=${hub.id}">Open node</a>
          </div>
        </article>
      `;
    })
    .join("");
}

function initNavigation() {
  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-site-nav]");

  if (!toggle || !nav) {
    return;
  }

  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    nav.classList.toggle("nav-open");
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      nav.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}

function initActiveNavigation() {
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  const currentHash = window.location.hash;

  document.querySelectorAll(".site-nav a").forEach((link) => {
    const href = link.getAttribute("href") || "";
    const normalizedHref = href.split("#")[0] || "index.html";
    const isAnchorOnHome = currentPath === "index.html" && href.startsWith("#") && currentHash === href;
    const isCurrentPage = normalizedHref === currentPath;

    if (isCurrentPage || isAnchorOnHome) {
      link.setAttribute("aria-current", "page");
    }
  });
}

function initRevealObserver() {
  const revealItems = Array.from(document.querySelectorAll(".reveal"));

  if (!revealItems.length) {
    return;
  }

  if (reducedMotionQuery.matches) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  revealItems.forEach((item, index) => {
    item.style.transitionDelay = `${Math.min(index * 40, 220)}ms`;
    observer.observe(item);
  });
}

function initCounters() {
  const counters = document.querySelectorAll("[data-counter]");

  if (!counters.length) {
    return;
  }

  if (reducedMotionQuery.matches) {
    counters.forEach((counter) => {
      counter.textContent = counter.dataset.counter || "0";
    });
    return;
  }

  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const element = entry.target;
        const target = Number(element.dataset.counter || "0");
        animateCounter(element, target);
        counterObserver.unobserve(element);
      });
    },
    { threshold: 0.65 }
  );

  counters.forEach((counter) => counterObserver.observe(counter));
}

function animateCounter(element, target) {
  const duration = 1400;
  const start = performance.now();

  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = Math.round(target * eased);

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  };

  requestAnimationFrame(tick);
}

function initTilt() {
  if (reducedMotionQuery.matches || !finePointerQuery.matches) {
    return;
  }

  const tiltNodes = document.querySelectorAll("[data-tilt]");

  tiltNodes.forEach((node) => {
    node.addEventListener("pointermove", (event) => {
      const bounds = node.getBoundingClientRect();
      const offsetX = event.clientX - bounds.left;
      const offsetY = event.clientY - bounds.top;
      const rotateY = (offsetX / bounds.width - 0.5) * 14;
      const rotateX = (0.5 - offsetY / bounds.height) * 14;

      node.style.transform = `perspective(1400px) rotateX(${rotateX.toFixed(
        2
      )}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-6px)`;
    });

    node.addEventListener("pointerleave", () => {
      node.style.transform = "";
    });
  });
}

function initMagneticButtons() {
  if (reducedMotionQuery.matches || !finePointerQuery.matches) {
    return;
  }

  const buttons = document.querySelectorAll(".magnetic");

  buttons.forEach((button) => {
    button.addEventListener("pointermove", (event) => {
      const bounds = button.getBoundingClientRect();
      const shiftX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 12;
      const shiftY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 12;
      button.style.setProperty("--magnetic-x", `${shiftX.toFixed(2)}px`);
      button.style.setProperty("--magnetic-y", `${shiftY.toFixed(2)}px`);
    });

    button.addEventListener("pointerleave", () => {
      button.style.setProperty("--magnetic-x", "0px");
      button.style.setProperty("--magnetic-y", "0px");
    });
  });
}

function initSurfaceLighting() {
  if (reducedMotionQuery.matches || !finePointerQuery.matches) {
    return;
  }

  const surfaces = document.querySelectorAll(".site-header, .btn, .theme-toggle, .nav-toggle");

  surfaces.forEach((surface) => {
    surface.addEventListener("pointermove", (event) => {
      const bounds = surface.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width) * 100;
      const y = ((event.clientY - bounds.top) / bounds.height) * 100;

      surface.style.setProperty("--spot-x", `${x.toFixed(2)}%`);
      surface.style.setProperty("--spot-y", `${y.toFixed(2)}%`);
    });

    surface.addEventListener("pointerleave", () => {
      surface.style.removeProperty("--spot-x");
      surface.style.removeProperty("--spot-y");
    });
  });
}

function initCosmicCanvases() {
  const canvases = document.querySelectorAll("[data-cosmic-canvas]");

  canvases.forEach((canvas) => {
    createStarfield(canvas);
  });
}

function createStarfield(canvas) {
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  const stars = [];
  const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const allowMotion = !reducedMotionQuery.matches;
  let animationFrame = 0;
  let width = 0;
  let height = 0;

  const resize = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    stars.length = 0;

    const count = Math.max(55, Math.floor((width * height) / 18000));

    for (let index = 0; index < count; index += 1) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.8 + 0.35,
        velocityX: (Math.random() - 0.5) * 0.09,
        velocityY: Math.random() * 0.12 + 0.03,
        alpha: Math.random() * 0.55 + 0.15,
        twinkle: Math.random() * Math.PI * 2,
      });
    }

    draw();
  };

  const draw = () => {
    context.clearRect(0, 0, width, height);

    stars.forEach((star) => {
      if (allowMotion) {
        star.twinkle += 0.015;
        star.x += star.velocityX + (pointer.x - width / 2) * 0.000015;
        star.y += star.velocityY + (pointer.y - height / 2) * 0.000015;

        if (star.y > height + 24) {
          star.y = -24;
          star.x = Math.random() * width;
        }

        if (star.x < -24) {
          star.x = width + 24;
        } else if (star.x > width + 24) {
          star.x = -24;
        }
      }

      context.beginPath();
      context.fillStyle = `rgba(248, 223, 170, ${
        star.alpha + Math.sin(star.twinkle) * 0.1
      })`;
      context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      context.fill();
    });

    if (allowMotion) {
      animationFrame = requestAnimationFrame(draw);
    }
  };

  resize();

  window.addEventListener("resize", resize);

  if (allowMotion) {
    window.addEventListener("pointermove", (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    });
  }

  window.addEventListener("beforeunload", () => cancelAnimationFrame(animationFrame));
}

function initAmbientShapes() {
  if (document.querySelector("[data-ambient-scene]")) {
    return;
  }

  const scene = document.createElement("div");
  scene.className = "ambient-scene";
  scene.dataset.ambientScene = "true";
  scene.setAttribute("aria-hidden", "true");
  scene.innerHTML = `
    <span class="ambient-shape ambient-shape-one"></span>
    <span class="ambient-shape ambient-shape-two"></span>
    <span class="ambient-shape ambient-shape-three"></span>
  `;

  document.body.append(scene);
}

function initPointerIntent() {
  if (!finePointerQuery.matches) {
    return;
  }

  const interactiveSelector =
    "a, button, summary, input, textarea, select, .orbit-ring, [data-tilt]";
  let activeTarget = null;

  document.addEventListener("pointerover", (event) => {
    const target = event.target.closest(interactiveSelector);

    if (!target || activeTarget === target) {
      return;
    }

    activeTarget?.classList.remove("pointer-intent");
    activeTarget = target;
    activeTarget.classList.add("pointer-intent");
  });

  document.addEventListener("pointerout", (event) => {
    if (!activeTarget || activeTarget.contains(event.relatedTarget)) {
      return;
    }

    activeTarget.classList.remove("pointer-intent");
    activeTarget = null;
  });
}

function updateYear() {
  document.querySelectorAll("[data-current-year]").forEach((node) => {
    node.textContent = new Date().getFullYear();
  });
}

function getStateLabel(state) {
  return stateLabel[state] || "Reserved";
}

function renderHubLogo(hub, className = "hub-logo") {
  if (!hub.logo) {
    return "";
  }

  return `<span class="${className} hub-logo" aria-hidden="true"><img src="${hub.logo}" alt="" loading="lazy" decoding="async"></span>`;
}

function updateHubLogo(container, hub, className = "hub-logo") {
  if (!container) {
    return;
  }

  const existingLogo = container.querySelector("[data-dynamic-hub-logo]");

  if (!hub.logo) {
    existingLogo?.remove();
    return;
  }

  const logo =
    existingLogo ||
    (() => {
      const node = document.createElement("span");
      node.dataset.dynamicHubLogo = "true";
      container.prepend(node);
      return node;
    })();

  logo.className = `${className} hub-logo`;
  logo.setAttribute("aria-hidden", "true");
  logo.innerHTML = `<img src="${hub.logo}" alt="" loading="lazy" decoding="async">`;
}

function renderHubLaunchLink(hub, label) {
  if (!hub.link || hub.link === "#") {
    return "";
  }

  const attrs = getExternalLinkAttrs(hub.link);
  return `<a class="text-link hub-launch-link" href="${hub.link}"${attrs} aria-label="${label} for ${hub.name}">${label}</a>`;
}

function getExternalLinkAttrs(link) {
  try {
    const url = new URL(link, window.location.href);

    if (url.origin !== window.location.origin) {
      return ' target="_blank" rel="noopener noreferrer"';
    }
  } catch {
    return "";
  }

  return "";
}
