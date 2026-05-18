document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.querySelector("#hero-three-canvas");
  const frame = document.querySelector(".portal-frame");

  if (!canvas || !frame || !window.THREE) {
    return;
  }

  const THREE = window.THREE;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 0.2, 8.8);

  const root = new THREE.Group();
  scene.add(root);

  const ambient = new THREE.AmbientLight(0xffffff, 1.6);
  scene.add(ambient);

  const cyanLight = new THREE.PointLight(0xf8dfaa, 18, 24, 2);
  cyanLight.position.set(-2.4, 1.8, 5.4);
  scene.add(cyanLight);

  const goldLight = new THREE.PointLight(0xffd07a, 16, 22, 2);
  goldLight.position.set(2.8, -1.2, 4.6);
  scene.add(goldLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 1);
  rimLight.position.set(3.5, 4.2, 6.2);
  scene.add(rimLight);

  const coreMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xd9faff,
    emissive: 0x3db8cf,
    emissiveIntensity: 0.9,
    metalness: 0.18,
    roughness: 0.16,
    clearcoat: 1,
    clearcoatRoughness: 0.14,
    transparent: true,
    opacity: 0.9,
  });

  const core = new THREE.Mesh(new THREE.TorusKnotGeometry(1.12, 0.22, 180, 18, 2, 3), coreMaterial);
  core.rotation.x = 0.35;
  core.rotation.z = 0.18;
  root.add(core);

  const rings = [];
  const ringSpecs = [
    { radius: 1.95, tube: 0.048, color: 0xffd07a, tilt: 0.98, widthScale: 1.35 },
    { radius: 1.44, tube: 0.038, color: 0xf8dfaa, tilt: 1.18, widthScale: 1.15 },
    { radius: 2.52, tube: 0.042, color: 0x9ff7ff, tilt: 1.05, widthScale: 1.48 },
  ];

  ringSpecs.forEach((spec, index) => {
    const ringGroup = new THREE.Group();
    ringGroup.rotation.x = spec.tilt;
    ringGroup.rotation.z = index * 0.55;

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(spec.radius, spec.tube, 24, 180),
      new THREE.MeshPhysicalMaterial({
        color: spec.color,
        emissive: spec.color,
        emissiveIntensity: 0.55,
        metalness: 0.16,
        roughness: 0.2,
        clearcoat: 1,
        clearcoatRoughness: 0.18,
        transparent: true,
        opacity: 0.82,
      })
    );

    ring.scale.x = spec.widthScale;
    ringGroup.add(ring);
    root.add(ringGroup);
    rings.push(ringGroup);
  });

  const orbGroup = new THREE.Group();
  root.add(orbGroup);

  const orbMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 32, 32),
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      emissive: 0xffd07a,
      emissiveIntensity: 1.2,
      metalness: 0.08,
      roughness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    })
  );
  orbGroup.add(orbMesh);

  const orbHalo = new THREE.Mesh(
    new THREE.SphereGeometry(0.44, 24, 24),
    new THREE.MeshBasicMaterial({
      color: 0xf8dfaa,
      transparent: true,
      opacity: 0.18,
    })
  );
  orbGroup.add(orbHalo);

  const stars = new THREE.Group();
  const starGeometry = new THREE.IcosahedronGeometry(0.03, 0);
  const starMaterial = new THREE.MeshBasicMaterial({
    color: 0xf8dfaa,
    transparent: true,
    opacity: 0.72,
  });

  for (let index = 0; index < 64; index += 1) {
    const star = new THREE.Mesh(starGeometry, starMaterial);
    star.position.set(
      (Math.random() - 0.5) * 9.5,
      (Math.random() - 0.5) * 6.2,
      (Math.random() - 0.5) * 3
    );
    star.scale.setScalar(Math.random() * 1.8 + 0.4);
    stars.add(star);
  }

  scene.add(stars);
  frame.classList.add("hero-three-ready");

  const pointer = { x: 0, y: 0 };

  function resize() {
    const bounds = frame.getBoundingClientRect();
    const width = Math.max(bounds.width, 1);
    const height = Math.max(bounds.height, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  const timer = new THREE.Timer();
  timer.connect(document);
  timer.reset();

  function render() {
    timer.update();
    const elapsed = timer.getElapsed();
    const targetX = pointer.y * 0.18;
    const targetY = pointer.x * 0.22;

    root.rotation.x += (targetX - root.rotation.x) * 0.04;
    root.rotation.y += (targetY - root.rotation.y) * 0.04;

    core.rotation.y += 0.01;
    core.rotation.z += 0.004;

    rings.forEach((ring, index) => {
      ring.rotation.z += 0.002 + index * 0.0009;
    });

    const orbitAngle = elapsed * 0.9;
    orbGroup.position.set(Math.cos(orbitAngle) * 2.55, Math.sin(orbitAngle * 1.25) * 1.05, Math.sin(orbitAngle) * 0.85);

    stars.rotation.z += 0.0009;
    stars.rotation.y -= 0.0006;

    renderer.render(scene, camera);
    window.requestAnimationFrame(render);
  }

  frame.addEventListener("pointermove", (event) => {
    const bounds = frame.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    pointer.y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
  });

  frame.addEventListener("pointerleave", () => {
    pointer.x = 0;
    pointer.y = 0;
  });

  window.addEventListener("resize", resize);

  resize();
  render();
});
