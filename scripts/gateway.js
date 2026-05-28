const gatewayHubs = window.MHHorizonHubs || [];

document.addEventListener("DOMContentLoaded", () => {
  const ringColumn = document.querySelector("#ring-column");
  const ringScene = document.querySelector("#ring-scene");
  const overlay = document.querySelector("#hub-overlay");
  const closeButton = document.querySelector("#close-overlay");
  const overlayLink = document.querySelector("#overlay-link");
  let openTimer = 0;
  let closeTimer = 0;

  if (!ringColumn || !ringScene || !overlay || !gatewayHubs.length) {
    return;
  }

  const ringElements = renderRings(ringColumn);

  ringElements.forEach((ring) => {
    ring.addEventListener("click", () => openHub(ring.dataset.hubId));
  });

  closeButton?.addEventListener("click", closeHub);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeHub();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeHub();
    }
  });

  overlayLink?.addEventListener("click", (event) => {
    if (overlayLink.getAttribute("href") === "#") {
      event.preventDefault();
    }
  });

  const requestedHub = new URLSearchParams(window.location.search).get("hub");
  const hashHub = window.location.hash.replace("#", "");
  const initialHub = gatewayHubs.find((hub) => hub.id === requestedHub || hub.id === hashHub);

  if (initialHub) {
    window.requestAnimationFrame(() => openHub(initialHub.id));
  }

  function openHub(hubId) {
    const hub = gatewayHubs.find((entry) => entry.id === hubId);
    const ring = ringColumn.querySelector(`[data-hub-id="${hubId}"]`);

    if (!hub || !ring) {
      return;
    }

    window.clearTimeout(closeTimer);
    window.clearTimeout(openTimer);

    ringElements.forEach((node) => {
      node.classList.toggle("is-selected", node === ring);
    });

    // Shift the orbital stack so the selected ring feels like the camera focus point.
    const sceneRect = ringScene.getBoundingClientRect();
    const ringRect = ring.getBoundingClientRect();
    const focusOffset = ringRect.top + ringRect.height / 2 - (sceneRect.top + sceneRect.height / 2);

    ringScene.style.setProperty("--focus-offset", `${focusOffset.toFixed(2)}px`);
    ringScene.classList.add("is-focused");
    document.body.classList.add("hub-open");
    document.dispatchEvent(
      new CustomEvent("mh-horizon:ring-focus", {
        detail: { hubId: hub.id },
      })
    );

    populateOverlay(hub);
    overlay.setAttribute("data-state", hub.state);
    overlay.classList.remove("is-visible");

    openTimer = window.setTimeout(() => {
      overlay.classList.add("is-visible");
      overlay.setAttribute("aria-hidden", "false");
    }, 220);

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("hub", hub.id);
    nextUrl.hash = hub.id;
    window.history.replaceState({}, "", nextUrl);
  }

  function closeHub() {
    window.clearTimeout(openTimer);
    window.clearTimeout(closeTimer);

    overlay.classList.remove("is-visible");
    overlay.setAttribute("aria-hidden", "true");
    closeTimer = window.setTimeout(() => {
      ringScene.classList.remove("is-focused");
      document.body.classList.remove("hub-open");
      ringElements.forEach((node) => {
        node.classList.remove("is-selected");
      });
    }, 120);
    document.dispatchEvent(new CustomEvent("mh-horizon:ring-reset"));

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("hub");
    nextUrl.hash = "";
    window.history.replaceState({}, "", nextUrl);
  }

  function populateOverlay(hub) {
    const overlayState = document.querySelector("#overlay-state");
    const overlayName = document.querySelector("#overlay-name");
    const overlayDescription = document.querySelector("#overlay-description");
    const overlayTagline = document.querySelector("#overlay-tagline");
    const overlayFeatures = document.querySelector("#overlay-features");
    const overlayNote = document.querySelector("#overlay-note");
    const overlayLinkLabel = document.querySelector("#overlay-link-label");

    overlayState.textContent = hub.status;
    overlayName.textContent = hub.name;
    overlayDescription.textContent = hub.description;
    overlayTagline.textContent = hub.tagline;
    overlayFeatures.innerHTML = hub.features
      .map((feature) => `<span class="feature-pill">${feature}</span>`)
      .join("");
    overlayNote.textContent = hub.note;
    updateGatewayHubLogo(document.querySelector(".overlay-copy"), hub, "overlay-logo");

    if (overlayLink) {
      overlayLink.setAttribute("href", hub.link || "#");
      overlayLink.classList.toggle("is-placeholder", !hub.link || hub.link === "#");
      const externalLink = isExternalHubLink(hub.link);
      overlayLink.target = externalLink ? "_blank" : "";
      overlayLink.rel = externalLink ? "noopener noreferrer" : "";
    }

    if (overlayLinkLabel) {
      overlayLinkLabel.textContent = !hub.link || hub.link === "#" ? "Link Slot Ready" : "Open Hub";
    }
  }
});

function renderRings(container) {
  const compact = window.innerWidth < 600;
  const mid = window.innerWidth < 980;
  const baseSize = compact ? 28 : mid ? 34 : 40;
  const maxSize = compact ? 92 : mid ? 114 : 120;
  const minDuration = 12.5;
  const maxDuration = 22.5;
  const count = gatewayHubs.length;

  container.innerHTML = gatewayHubs
    .map((hub, index) => {
      const progress = count > 1 ? index / (count - 1) : 0;
      const size = baseSize + (maxSize - baseSize) * progress;
      const hue = getGatewayHue(hub.state);
      const duration = minDuration + (maxDuration - minDuration) * progress;
      const delay = -(duration * progress * 0.82);

      return `
        <button
          class="ring-node ring-state-${hub.state}"
          type="button"
          data-hub-id="${hub.id}"
          aria-label="Open ${hub.name}"
          style="--ring-size:${size}px; --ring-hue:${hue}; --orbit-duration:${duration}s; --orbit-delay:${delay.toFixed(2)}s;"
        >
          <span class="ring-shell"></span>
          <span class="ring-track">
            <span class="ring-ball"></span>
          </span>
          <span class="ring-glow"></span>
          <span class="ring-label">${hub.name}</span>
        </button>
      `;
    })
    .join("");

  return Array.from(container.querySelectorAll(".ring-node"));
}

function getGatewayHue(state) {
  if (state === "maintenance") {
    return 36;
  }

  if (state === "construction") {
    return 10;
  }

  return 186;
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
