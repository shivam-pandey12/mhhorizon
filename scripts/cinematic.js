(function () {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  document.addEventListener("DOMContentLoaded", () => {
    document.documentElement.classList.add("cinematic-ready");
    initCinematicNav();
    initOrbitSpotlight();
    initCinematicMotion();
  });

  function initCinematicNav() {
    const header = document.querySelector(".site-header");

    if (!header) {
      return;
    }

    const update = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 18);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  function initOrbitSpotlight() {
    const orbitStages = document.querySelectorAll(".home-orbit-frame, .orbit-stage");

    orbitStages.forEach((stage) => {
      stage.addEventListener("pointermove", (event) => {
        const bounds = stage.getBoundingClientRect();
        const x = ((event.clientX - bounds.left) / bounds.width) * 100;
        const y = ((event.clientY - bounds.top) / bounds.height) * 100;

        stage.style.setProperty("--spotlight-x", `${x.toFixed(2)}%`);
        stage.style.setProperty("--spotlight-y", `${y.toFixed(2)}%`);
      });

      stage.addEventListener("pointerleave", () => {
        stage.style.setProperty("--spotlight-x", "50%");
        stage.style.setProperty("--spotlight-y", "42%");
      });
    });
  }

  function initCinematicMotion() {
    if (reducedMotion.matches) {
      document.documentElement.classList.add("cinematic-reduced-motion");
      return;
    }

    const gsap = window.gsap;

    if (!gsap) {
      runFallbackMotion();
      return;
    }

    if (window.ScrollTrigger) {
      gsap.registerPlugin(window.ScrollTrigger);
    }

    document.documentElement.classList.add("gsap-ready");
    releaseCssRevealState();

    const heroTimeline = gsap.timeline({
      defaults: { ease: "power3.out" },
      delay: 0.1,
    });

    addFrom(heroTimeline, ".site-header", { y: -26, opacity: 0, duration: 0.75 });
    addFrom(heroTimeline, ".hero-kicker", { y: 18, opacity: 0, duration: 0.65 }, "-=0.36");
    addFrom(
      heroTimeline,
      ".hero-title",
      { y: 46, opacity: 0, filter: "blur(14px)", duration: 0.9 },
      "-=0.34"
    );
    addFrom(
      heroTimeline,
      ".hero-manifest, .orbit-legal-links",
      { y: 28, opacity: 0, filter: "blur(10px)", duration: 0.72 },
      "-=0.42"
    );
    addFrom(
      heroTimeline,
      ".hero-subtitle, .hero .cta-row",
      { y: 20, opacity: 0, stagger: 0.08, duration: 0.62 },
      "-=0.36"
    );
    addFrom(
      heroTimeline,
      ".home-orbit-frame, .orbit-stage-immersive",
      {
        scale: 0.94,
        opacity: 0,
        filter: "blur(18px)",
        duration: 1,
      },
      "-=0.78"
    );
    addFrom(
      heroTimeline,
      ".home-orbit-ring, #orbit-system .orbit-ring",
      {
        scale: 0.72,
        opacity: 0,
        stagger: 0.045,
        duration: 0.78,
      },
      "-=0.56"
    );
    addFrom(
      heroTimeline,
      ".orbit-satellite",
      {
        scale: 0,
        opacity: 0,
        stagger: 0.035,
        duration: 0.5,
      },
      "-=0.42"
    );
    addFrom(
      heroTimeline,
      ".home-orbit-preview, .floating-chip",
      {
        y: 18,
        opacity: 0,
        stagger: 0.06,
        duration: 0.58,
      },
      "-=0.32"
    );

    const coreTargets = document.querySelectorAll(".orbit-core, .home-orbit-core");
    if (coreTargets.length) {
      gsap.to(coreTargets, {
        scale: 1.035,
        duration: 3.6,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }

    const hazeTargets = document.querySelectorAll(".home-orbit-haze-one, .orbit-grid-glow");
    if (hazeTargets.length) {
      gsap.to(hazeTargets, {
        opacity: 0.92,
        scale: 1.08,
        duration: 5.6,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }

    if (window.ScrollTrigger) {
      gsap.utils.toArray(".section:not(.hero)").forEach((section) => {
        const revealTargets = section.querySelectorAll(".section-head, .intro-card, .spotlight-card, .hub-card, .roadmap-card, .faq-item, .focus-card, .legal-card, .timeline-item, .contact-card");

        if (!revealTargets.length) {
          return;
        }

        gsap.fromTo(
          revealTargets,
          { y: 24, opacity: 0, filter: "blur(10px)" },
          {
            scrollTrigger: {
              trigger: section,
              start: "top 82%",
              once: true,
            },
            stagger: 0.06,
            duration: 0.72,
            y: 0,
            opacity: 1,
            filter: "blur(0px)",
            clearProps: "transform,opacity,filter",
            ease: "power2.out",
          }
        );
      });
    }
  }

  function releaseCssRevealState() {
    document.querySelectorAll(".reveal").forEach((item) => {
      item.classList.add("is-visible");
      item.style.transitionDelay = "0ms";
    });
  }

  function addFrom(timeline, selector, vars, position) {
    const targets = document.querySelectorAll(selector);

    if (!targets.length) {
      return;
    }

    timeline.from(targets, vars, position);
  }

  function runFallbackMotion() {
    document.documentElement.classList.add("cinematic-fallback");

    const nodes = document.querySelectorAll(
      ".site-header, .hero-copy, .home-orbit-frame, .orbit-stage-immersive, .section-head, .hub-card, .spotlight-card"
    );

    nodes.forEach((node, index) => {
      node.animate(
        [
          { opacity: 0, transform: "translateY(18px)", filter: "blur(8px)" },
          { opacity: 1, transform: "translateY(0)", filter: "blur(0)" },
        ],
        {
          duration: 620,
          delay: Math.min(index * 35, 420),
          easing: "cubic-bezier(.16,.88,.18,1)",
          fill: "both",
        }
      );
    });
  }
})();
