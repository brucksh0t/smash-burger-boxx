/* Hero scrollytelling: the smash. GSAP + ScrollTrigger, scrubbed to scroll with realistic video.
 * Reduced motion (or no GSAP): video plays or shows the finished frame statically. */
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
    if (badge && stepLabels[stepIndex]) {
      badge.textContent = stepLabels[stepIndex];
    }
  }

  if (reduce) {
    root.classList.add('no-motion');
    setStep(2);
    updateBadge(3);
    if (vid) {
      vid.pause();
      vid.currentTime = vid.duration ? vid.duration * 0.8 : 0;
    }
    return;
  }

  if (!window.gsap || !window.ScrollTrigger) {
    root.classList.add('no-motion');
    setStep(2);
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // When video loads metadata, ensure it can be scrubbed
  if (vid) {
    vid.pause();
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
          // Clamps and locks on the finished burger from 0.85 to 1.0 (cannot scroll forward past it)
          const clampedP = Math.min(1.0, p / 0.86);
          vid.currentTime = Math.max(0, clampedP * (vid.duration - 0.05));
        }
      }
    });
    return () => st.kill();
  });
})();
