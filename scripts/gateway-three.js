document.addEventListener("DOMContentLoaded", () => {
  const canvases = Array.from(document.querySelectorAll("[data-orbit-3d-canvas]"));

  if (!canvases.length || !window.THREE || !window.MHHorizonHubs?.length) {
    return;
  }

  canvases.forEach((canvas) => {
    initOrbit3DGateway(canvas);
  });
});

function initOrbit3DGateway(canvas) {
  const THREE = window.THREE;
  const hubs = window.MHHorizonHubs || [];
  const sceneElement = canvas.closest(".orbit-scene");
  const stageElement = canvas.closest(".orbit-stage") || sceneElement;
  const mode = canvas.getAttribute("data-orbit-3d-mode") || "home";
  const isGateway = mode === "gateway";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!sceneElement || !hubs.length) {
    return;
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 720 ? 1.35 : 1.75));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 110);
  camera.position.set(0, 1.12, 9.2);
  camera.lookAt(0, 0, 0);

  const root = new THREE.Group();
  const orbitRoot = new THREE.Group();
  const coreGroup = new THREE.Group();
  const particleRoot = new THREE.Group();
  root.position.set(0, -0.08, 1.15);
  root.rotation.x = -0.12;
  root.scale.setScalar(isGateway ? 1.24 : 1.18);
  root.add(orbitRoot, coreGroup);
  scene.add(root, particleRoot);

  const label = createOrbitLabel(sceneElement);
  const palette = createThemePalette(THREE);
  const materials = [];
  const ringEntries = [];
  const screenPoints = [];
  const pointer = {
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    down: false,
    moved: false,
  };
  const rotation = {
    x: -0.12,
    y: 0.12,
    targetX: -0.12,
    targetY: 0.12,
    velocityX: 0,
    velocityY: 0,
  };
  const requestedHub = new URLSearchParams(window.location.search).get("hub");
  const initialHub = hubs.find((hub) => hub.id === requestedHub) || hubs[0];
  const ray = { hoveredHubId: "", selectedHubId: initialHub?.id || "" };
  ray.hoverPoint = null;
  const clock = { last: performance.now(), elapsed: 0, frame: 0, visible: true };

  scene.add(new THREE.AmbientLight(0xffffff, 1.6));

  const keyLight = new THREE.PointLight(0xf8dfaa, 18, 26, 2);
  keyLight.position.set(-4.6, 3.8, 6.8);
  scene.add(keyLight);

  const lowGold = new THREE.PointLight(0xd6a840, 14, 24, 2);
  lowGold.position.set(4.8, -3.6, 5.8);
  scene.add(lowGold);

  const rim = new THREE.DirectionalLight(0xffffff, 1.12);
  rim.position.set(3.8, 4.2, 7);
  scene.add(rim);

  buildCore();
  buildRings();
  buildFloor();
  buildParticles();
  applyTheme();

  sceneElement.classList.add("is-3d-ready");
  stageElement?.classList.add("is-3d-ready");
  canvas.setAttribute("aria-label", getCanvasLabel(selectedHub()));
  updateLinkedInterface(ray.selectedHubId, { hoverOnly: false });
  focusCameraOnHub(ray.selectedHubId);

  const resizeObserver = "ResizeObserver" in window ? new ResizeObserver(resize) : null;
  resizeObserver?.observe(sceneElement);
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", handleVisibility);
  observeTheme();
  initPointerControls();
  initKeyboardControls();
  initVisibilityObserver();

  resize();
  render();

  function buildCore() {
    const shellMaterial = trackMaterial(
      new THREE.MeshPhysicalMaterial({
        color: 0xfff2c4,
        emissive: 0xd6a840,
        emissiveIntensity: 0.38,
        metalness: 0.14,
        roughness: 0.18,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
      }),
      "core"
    );

    const core = new THREE.Mesh(new THREE.SphereGeometry(0.92, 64, 40), shellMaterial);
    coreGroup.add(core);

    const horizonMaterial = trackMaterial(
      new THREE.LineBasicMaterial({
        color: 0xf8dfaa,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      "line"
    );

    [-0.42, -0.22, 0, 0.22, 0.42].forEach((y, index) => {
      const radius = Math.sqrt(Math.max(0.04, 0.76 - y * y));
      const line = createEllipseLine(THREE, radius * 1.12, radius * 0.36, 150, horizonMaterial);
      line.position.y = y;
      line.rotation.x = Math.PI / 2;
      line.rotation.z = index % 2 ? 0.04 : -0.04;
      coreGroup.add(line);
    });

    [0, Math.PI / 3, -Math.PI / 3].forEach((angle) => {
      const line = createEllipseLine(THREE, 0.74, 0.96, 150, horizonMaterial);
      line.rotation.y = Math.PI / 2;
      line.rotation.z = angle;
      coreGroup.add(line);
    });

    const lensMaterial = trackMaterial(
      new THREE.MeshBasicMaterial({
        color: 0xfff4d2,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      "glow"
    );
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.5, 64), lensMaterial);
    lens.position.set(0, 0, 0.98);
    coreGroup.add(lens);
  }

  function buildRings() {
    const count = hubs.length;
    const minRadius = 0.62;
    const maxRadius = 2.14;
    const maxStackY = 1.28;
    const maxStackZ = 0.14;
    const minDuration = 26;
    const maxDuration = 50.8;
    const startAngle = Math.PI * 0.18;
    const maxAngleSweep = Math.PI * 1.72;

    hubs.forEach((hub, index) => {
      const hueColor = getHubColor(THREE, hub.state);
      const progress = count > 1 ? index / (count - 1) : 0;
      const y = count > 1 ? maxStackY - progress * maxStackY * 2 : 0;
      const z = count > 1 ? -maxStackZ + progress * maxStackZ * 2 : 0;
      const radius = minRadius + (maxRadius - minRadius) * progress;
      const tiltX = Math.PI / 2;
      const tiltY = 0;
      const tiltZ = 0;
      const duration = minDuration + (maxDuration - minDuration) * progress;
      const angle = startAngle + maxAngleSweep * progress;
      const entryGroup = new THREE.Group();
      const ringGroup = new THREE.Group();
      const nodeSize = 0.108 - progress * 0.022;

      entryGroup.position.set(0, y, z);
      entryGroup.rotation.set(tiltX, tiltY, tiltZ);

      const ringMaterial = trackMaterial(
        new THREE.MeshPhysicalMaterial({
          color: hueColor,
          emissive: hueColor,
          emissiveIntensity: 0.46,
          metalness: 0.16,
          roughness: 0.24,
          clearcoat: 1,
          clearcoatRoughness: 0.16,
          transparent: true,
          opacity: 0.66,
          depthWrite: true,
        }),
        "ring",
        hub.state
      );
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.016 + index * 0.0014, 18, 240), ringMaterial);
      ringGroup.add(ring);

      const rimMaterial = trackMaterial(
        new THREE.LineBasicMaterial({
          color: hueColor,
          transparent: true,
          opacity: 0.34,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
        "line",
        hub.state
      );
      const upperRim = createEllipseLine(THREE, radius, radius, 220, rimMaterial);
      upperRim.position.z = 0.045;
      const lowerRim = createEllipseLine(THREE, radius, radius, 220, rimMaterial);
      lowerRim.position.z = -0.045;
      ringGroup.add(upperRim, lowerRim);

      const innerMaterial = trackMaterial(
        new THREE.LineBasicMaterial({
          color: hueColor,
          transparent: true,
          opacity: 0.28,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
        "line",
        hub.state
      );
      const inner = createEllipseLine(THREE, radius * 0.78, radius * 0.78, 190, innerMaterial);
      ringGroup.add(inner);

      const haloMaterial = trackMaterial(
        new THREE.MeshBasicMaterial({
          color: hueColor,
          transparent: true,
          opacity: 0.055,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
        "ringHalo",
        hub.state
      );
      const halo = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.052, 14, 180), haloMaterial);
      ringGroup.add(halo);

      const nodeGroup = new THREE.Group();
      const nodeMaterial = trackMaterial(
        new THREE.MeshPhysicalMaterial({
          color: 0xfff8de,
          emissive: hueColor,
          emissiveIntensity: 1.18,
          metalness: 0.08,
          roughness: 0.08,
          clearcoat: 1,
          clearcoatRoughness: 0.04,
        }),
        "node",
        hub.state
      );
      const node = new THREE.Mesh(new THREE.SphereGeometry(nodeSize, 30, 24), nodeMaterial);
      nodeGroup.add(node);

      entryGroup.add(ringGroup, nodeGroup);
      orbitRoot.add(entryGroup);

      ringEntries.push({
        hub,
        entryGroup,
        ringGroup,
        ring,
        inner,
        halo,
        nodeGroup,
        node,
        angle,
        baseAngle: angle,
        speed: (Math.PI * 2) / duration,
        radius,
        baseY: y,
        baseZ: z,
        tiltX,
        tiltY,
        tiltZ,
        y,
        index,
      });
    });
  }

  function buildFloor() {
    const geometry = new THREE.BufferGeometry();
    const lines = [];
    const span = 6.2;
    const steps = 10;

    for (let index = -steps; index <= steps; index += 1) {
      const pos = (index / steps) * span;
      lines.push(-span, -2.9, pos, span, -2.9, pos);
      lines.push(pos, -2.9, -span, pos, -2.9, span);
    }

    geometry.setAttribute("position", new THREE.Float32BufferAttribute(lines, 3));
    const grid = new THREE.LineSegments(
      geometry,
      trackMaterial(
        new THREE.LineBasicMaterial({
          color: 0xd6a840,
          transparent: true,
          opacity: 0.12,
          depthWrite: false,
        }),
        "floor"
      )
    );
    grid.rotation.x = 0.02;
    root.add(grid);
  }

  function buildParticles() {
    const geometry = new THREE.BufferGeometry();
    const count = window.innerWidth < 720 ? 90 : 150;
    const positions = new Float32Array(count * 3);

    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (Math.random() - 0.5) * 11.4;
      positions[index * 3 + 1] = (Math.random() - 0.5) * 7.6;
      positions[index * 3 + 2] = (Math.random() - 0.5) * 7.2 - 0.8;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(
      geometry,
      trackMaterial(
        new THREE.PointsMaterial({
          color: 0xf8dfaa,
          size: 0.026,
          transparent: true,
          opacity: 0.48,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
        "particles"
      )
    );
    particleRoot.add(particles);
  }

  function render(now = performance.now()) {
    clock.frame = window.requestAnimationFrame(render);

    if (!clock.visible) {
      clock.last = now;
      return;
    }

    const delta = Math.min((now - clock.last) / 1000, 0.04);
    clock.last = now;
    clock.elapsed += delta;

    if (!reducedMotion.matches && !pointer.down) {
      rotation.targetY += delta * 0.055 + rotation.velocityY;
      rotation.targetX += rotation.velocityX;
      rotation.velocityY *= 0.92;
      rotation.velocityX *= 0.9;
    }

    rotation.x += (rotation.targetX - rotation.x) * 0.09;
    rotation.y += (rotation.targetY - rotation.y) * 0.09;
    root.rotation.x = rotation.x;
    root.rotation.y = rotation.y;

    coreGroup.rotation.y -= reducedMotion.matches ? 0 : delta * 0.11;
    particleRoot.rotation.y += reducedMotion.matches ? 0 : delta * 0.018;
    particleRoot.rotation.z -= reducedMotion.matches ? 0 : delta * 0.01;

    ringEntries.forEach((entry) => {
      const active = entry.hub.id === ray.hoveredHubId || entry.hub.id === ray.selectedHubId;
      const selected = entry.hub.id === ray.selectedHubId;
      const motionSpeed = active ? entry.speed * 0.34 : entry.speed;

      if (!reducedMotion.matches) {
        entry.angle += delta * motionSpeed;
      }

      const float = reducedMotion.matches ? 0 : Math.sin(clock.elapsed * 0.9 + entry.index * 0.72) * 0.026;
      entry.nodeGroup.position.set(Math.cos(entry.angle) * entry.radius, Math.sin(entry.angle) * entry.radius, 0.075);
      entry.entryGroup.position.y = entry.baseY + float;
      entry.entryGroup.position.z = entry.baseZ + Math.cos(clock.elapsed * 0.72 + entry.index) * 0.018;
      entry.entryGroup.rotation.x += (entry.tiltX - entry.entryGroup.rotation.x) * 0.05;
      entry.entryGroup.rotation.y += ((entry.tiltY + (selected ? 0.035 : 0)) - entry.entryGroup.rotation.y) * 0.05;
      entry.entryGroup.rotation.z += ((entry.tiltZ + (active ? 0.012 : 0)) - entry.entryGroup.rotation.z) * 0.05;

      const targetScale = selected ? 1.08 : active ? 1.045 : 1;
      entry.entryGroup.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);
      entry.ring.material.opacity += ((active ? 0.92 : 0.66) - entry.ring.material.opacity) * 0.08;
      entry.ring.material.emissiveIntensity += ((active ? 0.9 : 0.46) - entry.ring.material.emissiveIntensity) * 0.08;
      entry.inner.material.opacity += ((active ? 0.46 : 0.28) - entry.inner.material.opacity) * 0.08;
      entry.halo.material.opacity += ((active ? 0.11 : 0.055) - entry.halo.material.opacity) * 0.08;
    });

    renderer.render(scene, camera);
    updateScreenPoints();
    updateLabelPosition();
  }

  function initPointerControls() {
    canvas.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      pointer.down = true;
      pointer.moved = false;
      pointer.startX = event.clientX;
      pointer.startY = event.clientY;
      pointer.lastX = event.clientX;
      pointer.lastY = event.clientY;
      rotation.velocityX = 0;
      rotation.velocityY = 0;
      canvas.classList.add("is-dragging");
      canvas.setPointerCapture?.(event.pointerId);
      canvas.focus({ preventScroll: true });
    });

    canvas.addEventListener("pointermove", (event) => {
      event.stopPropagation();

      if (pointer.down) {
        const dx = event.clientX - pointer.lastX;
        const dy = event.clientY - pointer.lastY;
        pointer.lastX = event.clientX;
        pointer.lastY = event.clientY;
        pointer.moved = pointer.moved || Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) > 5;
        rotation.targetY += dx * 0.008;
        rotation.targetX = clamp(rotation.targetX + dy * 0.005, -0.92, 0.72);
        rotation.velocityY = dx * 0.00022;
        rotation.velocityX = dy * 0.00012;
        hideLabel();
        return;
      }

      const picked = pickOrbitTarget(event.clientX, event.clientY);
      ray.hoverPoint = picked ? { x: picked.x, y: picked.y } : null;
      setHoveredHub(picked?.hub.id || "");
    });

    canvas.addEventListener("pointerup", (event) => {
      event.preventDefault();
      event.stopPropagation();
      canvas.releasePointerCapture?.(event.pointerId);
      canvas.classList.remove("is-dragging");
      pointer.down = false;

      if (!pointer.moved) {
        const picked = pickOrbitTarget(event.clientX, event.clientY);

        if (picked) {
          selectHub(picked.hub.id, { open: true });
        }
      }
    });

    canvas.addEventListener("pointercancel", () => {
      pointer.down = false;
      canvas.classList.remove("is-dragging");
    });

    canvas.addEventListener("pointerleave", () => {
      if (!pointer.down) {
        setHoveredHub("");
      }
    });
  }

  function initKeyboardControls() {
    canvas.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        selectRelative(1);
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        selectRelative(-1);
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openSelectedHub();
        return;
      }

      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        rotation.targetX = -0.12;
        rotation.targetY = 0.12;
        rotation.velocityX = 0;
        rotation.velocityY = 0;
      }
    });
  }

  function selectRelative(direction) {
    const currentIndex = Math.max(0, hubs.findIndex((hub) => hub.id === ray.selectedHubId));
    const nextHub = hubs[(currentIndex + direction + hubs.length) % hubs.length];
    selectHub(nextHub.id, { open: false });
  }

  function selectHub(hubId, options = {}) {
    const hub = hubs.find((entry) => entry.id === hubId);

    if (!hub) {
      return;
    }

    ray.selectedHubId = hub.id;
    canvas.setAttribute("aria-label", getCanvasLabel(hub));
    updateLinkedInterface(hub.id, { hoverOnly: false });
    focusCameraOnHub(hub.id);

    if (options.open) {
      openSelectedHub();
    }
  }

  function openSelectedHub() {
    const hub = selectedHub();

    if (!hub) {
      return;
    }

    if (isGateway) {
      if (window.MHHorizonGatewayOrbit?.openHub) {
        window.MHHorizonGatewayOrbit.openHub(hub.id);
        return;
      }

      findFallbackButton(hub.id)?.click();
      return;
    }

    window.location.href = `gatewayToHub.html?hub=${encodeURIComponent(hub.id)}`;
  }

  function focusCameraOnHub(hubId) {
    const entry = ringEntries.find((item) => item.hub.id === hubId);

    if (!entry) {
      return;
    }

    rotation.targetY += shortestAngleDelta(rotation.targetY, 0.14 - entry.index * 0.018);
    rotation.targetX = clamp(-0.12 + (entry.index - ringEntries.length / 2) * 0.012, -0.46, 0.28);
  }

  function setHoveredHub(hubId) {
    if (ray.hoveredHubId === hubId) {
      return;
    }

    ray.hoveredHubId = hubId;
    stageElement?.classList.toggle("is-node-hovered", Boolean(hubId));
    canvas.classList.toggle("is-node-hovered", Boolean(hubId));

    if (hubId) {
      updateLinkedInterface(hubId, { hoverOnly: true });
    } else {
      ray.hoverPoint = null;
      updateLinkedInterface(ray.selectedHubId, { hoverOnly: false });
      hideLabel();
    }
  }

  function updateLinkedInterface(hubId, options = {}) {
    const hub = hubs.find((entry) => entry.id === hubId);

    if (!hub) {
      return;
    }

    updateFallbackButtons(hubId, options);

    if (isGateway) {
      return;
    }

    const preview = document.querySelector("[data-home-orbit-preview]");
    const status = preview?.querySelector("[data-home-orbit-status]");
    const link = preview?.querySelector("[data-home-orbit-link]");

    if (!preview || !status) {
      return;
    }

    status.textContent = hub.status;
    status.className = `hub-status hub-status-${hub.state}`;
    preview.querySelector("[data-home-orbit-name]").textContent = hub.name;
    preview.querySelector("[data-home-orbit-category]").textContent = hub.category || "Hub";
    preview.querySelector("[data-home-orbit-copy]").textContent = hub.tagline;
    preview.querySelector("[data-home-orbit-note]").textContent = hub.description;
    updateThreeHubLogo(preview, hub);

    if (link) {
      link.href = `gatewayToHub.html?hub=${encodeURIComponent(hub.id)}`;
      link.setAttribute("aria-label", `Open ${hub.name} in the orbital gateway`);
    }
  }

  function updateThreeHubLogo(container, hub) {
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

    logo.className = "home-orbit-logo hub-logo";
    logo.setAttribute("aria-hidden", "true");
    logo.innerHTML = `<img src="${hub.logo}" alt="" loading="lazy" decoding="async">`;
  }

  function updateFallbackButtons(hubId, options = {}) {
    const buttons = Array.from(sceneElement.querySelectorAll(".orbit-ring"));

    buttons.forEach((button) => {
      const active = button.dataset.hubId === hubId;
      button.classList.toggle("is-hovered", active);
      button.classList.toggle("is-selected", active && !options.hoverOnly);

      if (!isGateway) {
        button.setAttribute("aria-pressed", String(active && !options.hoverOnly));
      }
    });
  }

  function pickOrbitTarget(clientX, clientY) {
    const bounds = canvas.getBoundingClientRect();
    const x = clientX - bounds.left;
    const y = clientY - bounds.top;
    let best = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    screenPoints.forEach((point) => {
      if (point.hidden) {
        return;
      }

      const distance = Math.hypot(point.x - x, point.y - y);
      const hitRadius = point.selected ? 32 : 24;

      if (distance < hitRadius && distance < bestDistance) {
        best = point;
        bestDistance = distance;
      }
    });

    screenPoints.forEach((point) => {
      if (!point.ringSamples?.length) {
        return;
      }

      const distance = distanceToPolyline(x, y, point.ringSamples);
      const ringHitRadius = point.selected ? 22 : 18;

      if (distance < ringHitRadius && distance < bestDistance) {
        const nearest = nearestPointOnPolyline(x, y, point.ringSamples);
        best = {
          ...point,
          x: nearest.x,
          y: nearest.y,
        };
        bestDistance = distance;
      }
    });

    return best;
  }

  function updateScreenPoints() {
    const bounds = canvas.getBoundingClientRect();
    const temp = new THREE.Vector3();
    const ringPoint = new THREE.Vector3();
    screenPoints.length = 0;

    ringEntries.forEach((entry) => {
      entry.nodeGroup.getWorldPosition(temp);
      temp.project(camera);
      const hidden = temp.z < -1 || temp.z > 1;
      const ringSamples = [];

      for (let index = 0; index < 80; index += 1) {
        const angle = (index / 80) * Math.PI * 2;
        ringPoint.set(
          Math.cos(angle) * entry.radius,
          Math.sin(angle) * entry.radius,
          0
        );
        entry.entryGroup.localToWorld(ringPoint);
        ringPoint.project(camera);

        if (ringPoint.z >= -1 && ringPoint.z <= 1) {
          ringSamples.push({
            x: (ringPoint.x * 0.5 + 0.5) * bounds.width,
            y: (-ringPoint.y * 0.5 + 0.5) * bounds.height,
          });
        }
      }

      screenPoints.push({
        entry,
        hub: entry.hub,
        x: (temp.x * 0.5 + 0.5) * bounds.width,
        y: (-temp.y * 0.5 + 0.5) * bounds.height,
        z: temp.z,
        hidden,
        ringSamples,
        selected: entry.hub.id === ray.selectedHubId,
      });
    });
  }

  function updateLabelPosition() {
    const hubId = ray.hoveredHubId || ray.selectedHubId;
    const point = screenPoints.find((entry) => entry.hub.id === hubId);
    const hub = hubs.find((entry) => entry.id === hubId);

    if (!point || !hub || point.hidden || !ray.hoveredHubId) {
      if (!ray.hoveredHubId) {
        hideLabel();
      }
      return;
    }

    label.name.textContent = hub.name;
    label.meta.textContent = `${hub.status} / ${hub.category || "Hub"}`;
    const labelPoint = ray.hoverPoint || point;
    label.node.style.setProperty("--label-x", `${labelPoint.x.toFixed(1)}px`);
    label.node.style.setProperty("--label-y", `${labelPoint.y.toFixed(1)}px`);
    label.node.classList.add("is-visible");
  }

  function hideLabel() {
    label.node.classList.remove("is-visible");
  }

  function resize() {
    const bounds = sceneElement.getBoundingClientRect();
    const width = Math.max(1, Math.floor(bounds.width));
    const height = Math.max(1, Math.floor(bounds.height));

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const mobile = width < 680;
    camera.position.z = mobile ? 10.9 : isGateway ? 9.05 : 8.75;
    camera.position.y = mobile ? 0.92 : 1.08;
    root.scale.setScalar(mobile ? (isGateway ? 1.12 : 1.08) : isGateway ? 1.26 : 1.2);
    root.position.z = mobile ? 0.78 : 1.22;
    root.position.y = mobile ? -0.02 : -0.08;
    camera.lookAt(0, -0.12, 0.6);
    camera.updateProjectionMatrix();
  }

  function selectedHub() {
    return hubs.find((hub) => hub.id === ray.selectedHubId) || hubs[0];
  }

  function findFallbackButton(hubId) {
    const escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(hubId) : hubId.replace(/"/g, '\\"');
    return sceneElement.querySelector(`.orbit-ring[data-hub-id="${escaped}"]`);
  }

  function handleVisibility() {
    clock.visible = document.visibilityState !== "hidden";
  }

  function initVisibilityObserver() {
    if (!("IntersectionObserver" in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        clock.visible = entries.some((entry) => entry.isIntersecting) && document.visibilityState !== "hidden";
      },
      { threshold: 0.02 }
    );
    observer.observe(sceneElement);
  }

  function observeTheme() {
    const observer = new MutationObserver(applyTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

  function applyTheme() {
    const light = document.documentElement.dataset.theme === "light";

    palette.theme = light ? "light" : "dark";
    palette.core.set(light ? 0xfff4d2 : 0xffedbd);
    palette.glow.set(light ? 0xd6a840 : 0xf8dfaa);
    palette.line.set(light ? 0xd6a840 : 0xf8dfaa);
    palette.floor.set(light ? 0xb98934 : 0xd6a840);
    palette.particles.set(light ? 0xd6a840 : 0xf8dfaa);

    materials.forEach((entry) => {
      if (entry.kind === "core") {
        entry.material.color.copy(palette.core);
        entry.material.emissive.copy(palette.glow);
        entry.material.opacity = light ? 0.78 : 0.82;
      }

      if (entry.kind === "glow") {
        entry.material.color.copy(palette.glow);
        entry.material.opacity = light ? 0.1 : 0.14;
      }

      if (entry.kind === "line") {
        const color = entry.state ? getHubColor(THREE, entry.state, light) : palette.line;
        entry.material.color.copy(color);
        entry.material.opacity = light ? Math.min(entry.material.opacity, 0.3) : entry.material.opacity;
      }

      if (entry.kind === "floor") {
        entry.material.color.copy(palette.floor);
        entry.material.opacity = light ? 0.16 : 0.12;
      }

      if (entry.kind === "particles") {
        entry.material.color.copy(palette.particles);
        entry.material.opacity = light ? 0.36 : 0.48;
      }

      if (entry.state && ["ring", "ringHalo", "node"].includes(entry.kind)) {
        const color = getHubColor(THREE, entry.state, light);
        entry.material.color?.copy(color);
        entry.material.emissive?.copy(color);
      }
    });
  }

  function trackMaterial(material, kind, state = "") {
    materials.push({ material, kind, state });
    return material;
  }
}

function createOrbitLabel(sceneElement) {
  const node = document.createElement("div");
  const name = document.createElement("span");
  const meta = document.createElement("small");

  node.className = "orbit-3d-label";
  node.setAttribute("aria-hidden", "true");
  node.append(name, meta);
  sceneElement.append(node);

  return { node, name, meta };
}

function createEllipseLine(THREE, radiusX, radiusZ, segments, material) {
  const points = [];

  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radiusX, Math.sin(angle) * radiusZ, 0));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  return new THREE.LineLoop(geometry, material);
}

function distanceToPolyline(x, y, points) {
  if (points.length < 2) {
    return Number.POSITIVE_INFINITY;
  }

  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < points.length; index += 1) {
    const start = points[index];
    const end = points[(index + 1) % points.length];
    const projected = projectPointToSegment(x, y, start, end);
    const distance = Math.hypot(x - projected.x, y - projected.y);

    if (distance < bestDistance) {
      bestDistance = distance;
    }
  }

  return bestDistance;
}

function nearestPointOnPolyline(x, y, points) {
  let nearest = points[0] || { x, y };
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < points.length; index += 1) {
    const start = points[index];
    const end = points[(index + 1) % points.length];
    const projected = projectPointToSegment(x, y, start, end);
    const distance = Math.hypot(x - projected.x, y - projected.y);

    if (distance < bestDistance) {
      nearest = projected;
      bestDistance = distance;
    }
  }

  return nearest;
}

function projectPointToSegment(x, y, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (!lengthSquared) {
    return start;
  }

  const t = clamp(((x - start.x) * dx + (y - start.y) * dy) / lengthSquared, 0, 1);

  return {
    x: start.x + dx * t,
    y: start.y + dy * t,
  };
}

function createThemePalette(THREE) {
  return {
    theme: "dark",
    core: new THREE.Color(0xffedbd),
    glow: new THREE.Color(0xf8dfaa),
    line: new THREE.Color(0xf8dfaa),
    floor: new THREE.Color(0xd6a840),
    particles: new THREE.Color(0xf8dfaa),
  };
}

function getHubColor(THREE, state, light = document.documentElement.dataset.theme === "light") {
  const darkColors = {
    live: 0xf8dfaa,
    beta: 0xffe7b0,
    maintenance: 0xffb46f,
    "coming-soon": 0xe0ab37,
    experimental: 0xd6c08a,
  };
  const lightColors = {
    live: 0xd6a840,
    beta: 0xc8962e,
    maintenance: 0xd08742,
    "coming-soon": 0xb9873b,
    experimental: 0xae8d49,
  };

  return new THREE.Color((light ? lightColors : darkColors)[state] || (light ? 0xd6a840 : 0xf8dfaa));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function shortestAngleDelta(from, to) {
  let delta = (to - from) % (Math.PI * 2);

  if (delta > Math.PI) {
    delta -= Math.PI * 2;
  }

  if (delta < -Math.PI) {
    delta += Math.PI * 2;
  }

  return delta;
}

function getCanvasLabel(hub) {
  return `Interactive 3D MH Horizon gateway. Selected hub: ${hub?.name || "MH Horizon"}. Drag to rotate, use arrow keys to choose a hub, and press Enter to open it.`;
}
