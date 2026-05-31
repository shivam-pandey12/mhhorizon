const orbitGatewayHubs = window.MHHorizonHubs || [];

document.addEventListener("DOMContentLoaded", () => {
  const orbitSystem = document.querySelector("#orbit-system");
  const orbitStage = document.querySelector("#orbit-stage");
  const orbitFocus = document.querySelector("#orbit-focus");
  const orbitFocusClose = document.querySelector("#orbit-focus-close");
  const orbitLink = document.querySelector("#orbit-link");
  let openTimer = 0;
  let closeTimer = 0;
  let orbitAnimationFrame = 0;
  let hoveredHubId = "";

  if (!orbitSystem || !orbitStage || !orbitFocus || !orbitGatewayHubs.length) {
    return;
  }

  renderOrbits(orbitSystem);

  const orbitButtons = Array.from(orbitSystem.querySelectorAll(".orbit-ring"));
  const orbitDots = Array.from(orbitSystem.querySelectorAll(".orbit-satellite"));
  const orbitMetrics = orbitDots.map((satellite, index) => ({
    satellite,
    track: satellite.closest(".orbit-track"),
    duration: Number(satellite.dataset.duration || 20),
    phase: Number(satellite.dataset.phase || index * 0.8),
  }));
  const requestedHub = new URLSearchParams(window.location.search).get("hub");
  const initialHub = orbitGatewayHubs.find((hub) => hub.id === requestedHub);
  let lastFocusedButton = null;

  window.MHHorizonGatewayOrbit = {
    openHub,
    closeHub,
    setHoveredHub,
  };

  document.addEventListener("mh-horizon:open-hub", (event) => {
    const hubId = event.detail?.hubId;

    if (hubId) {
      openHub(hubId);
    }
  });

  orbitLink?.addEventListener("click", (event) => {
    if (orbitLink.getAttribute("href") === "#") {
      event.preventDefault();
    }
  });

  orbitFocusClose?.addEventListener("click", closeHub);

  orbitButtons.forEach((button, index) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openHub(button.dataset.hubId);
    });

    button.addEventListener("focus", () => {
      setHoveredHub(button.dataset.hubId || "");
    });

    button.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openHub(button.dataset.hubId);
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        const nextButton = orbitButtons[(index + 1) % orbitButtons.length];
        nextButton?.focus();
        return;
      }

      if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        const previousButton =
          orbitButtons[(index - 1 + orbitButtons.length) % orbitButtons.length];
        previousButton?.focus();
      }
    });
  });

  orbitFocus.addEventListener("click", (event) => {
    if (event.target === orbitFocus) {
      closeHub();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeHub();
    }
  });

  orbitSystem.addEventListener("pointermove", handlePointerMove);
  orbitSystem.addEventListener("pointerdown", handlePointerMove);
  orbitSystem.addEventListener("pointerleave", () => {
    setHoveredHub("");
  });
  orbitSystem.addEventListener("click", (event) => {
    const clickedRing = findHoveredRing(event.clientX, event.clientY);
    const nextHubId = clickedRing?.dataset.hubId || hoveredHubId;

    if (nextHubId) {
      openHub(nextHubId);
    }
  });

  animateSatellites();

  if (initialHub) {
    window.requestAnimationFrame(() => openHub(initialHub.id));
  }

  function openHub(hubId) {
    const hub = orbitGatewayHubs.find((entry) => entry.id === hubId);
    const button = orbitButtons.find((entry) => entry.dataset.hubId === hubId);

    if (!hub || !button) {
      return;
    }

    window.clearTimeout(openTimer);
    window.clearTimeout(closeTimer);
    const activeElement = document.activeElement;
    lastFocusedButton = activeElement?.matches?.("[data-orbit-3d-canvas]") ? activeElement : button;

    const stageRect = orbitStage.getBoundingClientRect();
    const ringRect = button.getBoundingClientRect();
    const focusOffset =
      ringRect.top + ringRect.height / 2 - (stageRect.top + stageRect.height / 2);

    orbitStage.style.setProperty("--orbit-focus-shift", `${focusOffset.toFixed(2)}px`);
    orbitStage.classList.add("is-focused");
    orbitFocus.classList.remove("is-visible");

    orbitButtons.forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.hubId === hub.id);
      button.setAttribute("aria-expanded", String(button.dataset.hubId === hub.id));
    });

    updateFocus(hub);

    openTimer = window.setTimeout(() => {
      orbitFocus.classList.add("is-visible");
      orbitFocus.setAttribute("aria-hidden", "false");
      orbitFocusClose?.focus();
    }, 220);

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("hub", hub.id);
    window.history.replaceState({}, "", nextUrl);
  }

  function closeHub() {
    window.clearTimeout(openTimer);
    window.clearTimeout(closeTimer);

    orbitFocus.classList.remove("is-visible");
    orbitFocus.setAttribute("aria-hidden", "true");

    closeTimer = window.setTimeout(() => {
      orbitStage.classList.remove("is-focused");
      orbitStage.style.removeProperty("--orbit-focus-shift");
      orbitButtons.forEach((button) => {
        button.classList.remove("is-selected");
        button.setAttribute("aria-expanded", "false");
      });
      lastFocusedButton?.focus();
    }, 180);

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("hub");
    window.history.replaceState({}, "", nextUrl);
  }

  function updateFocus(hub) {
    const orbitStatus = document.querySelector("#orbit-status");
    const orbitName = document.querySelector("#orbit-name");
    const orbitDescription = document.querySelector("#orbit-description");
    const orbitTagline = document.querySelector("#orbit-tagline");
    const orbitFeatures = document.querySelector("#orbit-features");
    const orbitNote = document.querySelector("#orbit-note");
    const orbitLinkLabel = document.querySelector("#orbit-link-label");
    const orbitCopy = document.querySelector(".orbit-focus-copy");

    orbitStatus.textContent = getGatewayStateLabel(hub.state);
    orbitName.textContent = hub.name;
    orbitDescription.textContent = hub.description;
    orbitTagline.textContent = hub.tagline;
    orbitFeatures.innerHTML = hub.features
      .map((feature) => `<span class="feature-pill">${feature}</span>`)
      .join("");
    orbitNote.textContent = hub.note;

    if (orbitLink) {
      orbitLink.href = hub.link || "#";
      const placeholderLink = !hub.link || hub.link === "#";
      orbitLink.classList.toggle("is-placeholder", placeholderLink);
      orbitLink.setAttribute("aria-disabled", String(placeholderLink));
      orbitLink.tabIndex = placeholderLink ? -1 : 0;
      const externalLink = isExternalHubLink(hub.link);
      orbitLink.target = externalLink ? "_blank" : "";
      orbitLink.rel = externalLink ? "noopener noreferrer" : "";
    }

    if (orbitLinkLabel) {
      const placeholderLink = !hub.link || hub.link === "#";
      orbitLinkLabel.textContent = placeholderLink
        ? hub.state === "live"
          ? "Launch Pending"
          : "Status Pending"
        : hub.state === "live"
        ? "Open Hub"
        : "Open Status Page";
    }
  }

  function handlePointerMove(event) {
    const hoveredRing = findHoveredRing(event.clientX, event.clientY);
    setHoveredHub(hoveredRing?.dataset.hubId || "");
  }

  function findHoveredRing(clientX, clientY) {
    let bestRing = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    orbitButtons.forEach((button) => {
      const rect = button.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const radiusX = rect.width / 2 - 4;
      const radiusY = rect.height / 2 - 4;
      const dx = clientX - centerX;
      const dy = clientY - centerY;

      if (Math.abs(dx) > radiusX + 24 || Math.abs(dy) > radiusY + 24) {
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

    if (bestDistance <= 16) {
      return bestRing;
    }

    return null;
  }

  function setHoveredHub(hubId) {
    hoveredHubId = hubId;
    orbitSystem.classList.toggle("is-hovering", Boolean(hubId));

    orbitButtons.forEach((button) => {
      button.classList.toggle("is-hovered", button.dataset.hubId === hubId);
    });
  }

  function animateSatellites() {
    const tick = (now) => {
      orbitMetrics.forEach((orbit) => {
        if (!orbit.track) {
          return;
        }

        const width = orbit.track.clientWidth;
        const height = orbit.track.clientHeight;

        if (!width || !height) {
          return;
        }

        const angle = orbit.phase + (now / 1000) * ((Math.PI * 2) / orbit.duration);
        const centerX = width / 2;
        const centerY = height / 2;
        const dotSize = orbit.satellite.offsetWidth || 16;
        const radiusX = width / 2 - dotSize / 2 - 1;
        const radiusY = height / 2 - dotSize / 2 - 1;
        const x = centerX + Math.cos(angle) * radiusX;
        const y = centerY + Math.sin(angle) * radiusY;

        orbit.satellite.style.left = `${x.toFixed(2)}px`;
        orbit.satellite.style.top = `${y.toFixed(2)}px`;
      });

      orbitAnimationFrame = window.requestAnimationFrame(tick);
    };

    orbitAnimationFrame = window.requestAnimationFrame(tick);
    window.addEventListener("beforeunload", () => {
      window.cancelAnimationFrame(orbitAnimationFrame);
    });
  }
});

function getGatewayStateLabel(state) {
  if (state === "beta") {
    return "Beta";
  }

  if (state === "maintenance") {
    return "Maintenance";
  }

  if (state === "coming-soon") {
    return "Coming Soon";
  }

  if (state === "experimental") {
    return "Experimental";
  }

  return "Live";
}

function renderOrbits(container) {
  const compact = window.innerWidth < 680;
  const baseSize = compact ? 50 : 64;
  const baseOffset = compact ? -148 : -176;
  const maxSize = compact ? 162 : 208;
  const maxOffset = compact ? 68 : 96;
  const minDuration = 18;
  const maxDuration = 37.2;
  const maxPhase = Math.PI * 1.84;
  const count = orbitGatewayHubs.length;

  container.innerHTML = orbitGatewayHubs
    .map((hub, index) => {
      const hue = getOrbitHue(hub.state);
      const progress = count > 1 ? index / (count - 1) : 0;
      const size = baseSize + (maxSize - baseSize) * progress;
      const offset = baseOffset + (maxOffset - baseOffset) * progress;
      const duration = minDuration + (maxDuration - minDuration) * progress;
      const phase = maxPhase * progress;

      return `
        <button
          class="orbit-ring orbit-state-${hub.state}"
          type="button"
          data-hub-id="${hub.id}"
          aria-label="Select ${hub.name}"
          aria-controls="orbit-focus"
          aria-haspopup="dialog"
          aria-expanded="false"
          style="--orbit-size:${size.toFixed(2)}px; --orbit-offset:${offset.toFixed(2)}px; --orbit-hue:${hue}; --orbit-duration:${duration.toFixed(2)}s;"
        >
          <span class="orbit-path"></span>
          <span class="orbit-glow"></span>
          <span class="orbit-track">
            <span
              class="orbit-satellite"
              data-duration="${duration.toFixed(2)}"
              data-phase="${phase.toFixed(2)}"
            ></span>
          </span>
          <span class="orbit-label">${hub.name}</span>
        </button>
      `;
    })
    .join("");
}

function getOrbitHue(state) {
  if (state === "beta") {
    return 48;
  }

  if (state === "maintenance") {
    return 36;
  }

  if (state === "coming-soon") {
    return 24;
  }

  if (state === "experimental") {
    return 34;
  }

  return 42;
}

function isExternalHubLink(link) {
  if (!link || link === "#") {
    return false;
  }

  try {
    return new URL(link, window.location.href).origin !== window.location.origin;
  } catch {
    return false;
  }
}

function updateGatewayHubLogo(container, hub, className) {
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
