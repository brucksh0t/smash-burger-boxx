/* Hero scrollytelling: crossfade real Boxx photos on scroll.
 * Reduced motion / no GSAP: show one finished still (no scrub). */
(function () {
  'use strict';
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const steps = [...document.querySelectorAll('.hero__steps li')];
  const setStep = i => steps.forEach((li, k) => li.classList.toggle('is-on', k === i));
  const badge = document.querySelector('[data-video-step]');
  const photos = [...document.querySelectorAll('[data-hero-photos] .griddle__photo')];

  const stepLabels = [
    '01 · At the walk-up window',
    '02 · Stacked & ready',
    '03 · Picnic-table tray',
    '04 · The Boxx sign'
  ];

  function updateBadge(stepIndex) {
    if (badge && stepLabels[stepIndex]) badge.textContent = stepLabels[stepIndex];
  }

  function showPhoto(i) {
    const idx = Math.max(0, Math.min(photos.length - 1, i));
    photos.forEach((img, k) => img.classList.toggle('is-on', k === idx));
  }

  function showFinalStill() {
    root.classList.add('no-motion');
    setStep(Math.min(2, steps.length - 1));
    updateBadge(1);
  }

  if (reduce || !window.gsap || !window.ScrollTrigger || !photos.length) {
    showFinalStill();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  showPhoto(0);
  updateBadge(0);

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
        const n = photos.length;
        const photoIdx = Math.min(n - 1, Math.floor(p * n));
        const stepIdx = p < 0.25 ? 0 : p < 0.55 ? 1 : p < 0.85 ? 2 : 3;
        setStep(Math.min(steps.length - 1, Math.min(2, stepIdx)));
        updateBadge(stepIdx);
        showPhoto(photoIdx);
      }
    });
    return () => st.kill();
  });
})();
