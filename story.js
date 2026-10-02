/* Hero scrollytelling: photoreal smash video scrubbed to scroll.
 * Reduced motion / no GSAP: show the finished still (no play, no scrub). */
(function () {
  'use strict';
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const steps = [...document.querySelectorAll('.hero__steps li')];
  const setStep = i => steps.forEach((li, k) => li.classList.toggle('is-on', k === i));
  const badge = document.querySelector('[data-video-step]');
  const vid = document.querySelector('.griddle__video');

  const stepLabels = [
    '01 · Fresh beef hits the hot griddle',
    '02 · Smashed hard · lacy crust',
    '03 · Melted cheese & steam',
    '04 · The finished smashburger'
  ];

  function updateBadge(stepIndex) {
    if (badge && stepLabels[stepIndex]) badge.textContent = stepLabels[stepIndex];
  }

  function showFinalStill() {
    root.classList.add('no-motion');
    setStep(2);
    updateBadge(3);
    if (vid) {
      try { vid.pause(); } catch (_) {}
      vid.removeAttribute('autoplay');
    }
  }

  if (reduce || !window.gsap || !window.ScrollTrigger) {
    showFinalStill();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  if (vid) {
    try { vid.pause(); } catch (_) {}
    const toStart = () => { try { vid.currentTime = 0; } catch (_) {} };
    if (vid.readyState >= 1) toStart();
    else vid.addEventListener('loadedmetadata', toStart, { once: true });
  }

  const mm = gsap.matchMedia();
  mm.add({ desk: '(min-width: 900px)', mob: '(max-width: 899px)' }, ctx => {
    const st = ScrollTrigger.create({
      trigger: '.hero',
      start: () => `top ${document.querySelector('.nav').offsetHeight}px`,
      end: ctx.conditions.desk ? '+=220%' : '+=170%',
      pin: '.hero__pin',
      scrub: 0.2,
      anticipatePin: 1,
      onUpdate: self => {
        const p = self.progress;
        const stepIdx = p < 0.25 ? 0 : p < 0.55 ? 1 : p < 0.85 ? 2 : 3;
        setStep(Math.min(2, stepIdx));
        updateBadge(stepIdx);
        if (vid && vid.duration) {
          // Lock on finished burger from ~0.85 → 1.0
          const clampedP = Math.min(1.0, p / 0.86);
          vid.currentTime = Math.max(0, clampedP * (vid.duration - 0.05));
        }
      }
    });
    return () => st.kill();
  });
})();
