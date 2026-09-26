/* Hero scrollytelling: the smash. GSAP + ScrollTrigger, scrubbed to scroll.
 * Reduced motion (or no GSAP): the finished frame is shown statically. */
(function () {
  'use strict';
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const steps = [...document.querySelectorAll('.hero__steps li')];
  const setStep = i => steps.forEach((li, k) => li.classList.toggle('is-on', k === i));
  if (!window.gsap || !window.ScrollTrigger) { root.classList.add('no-motion'); setStep(2); return; }
  gsap.registerPlugin(ScrollTrigger);
  const q = s => document.querySelector(s);
  const drops = [...document.querySelectorAll('.g-sizzle circle')];

  // Initial state
  gsap.set('.g-patty', { y: -130 });
  gsap.set('.g-shadow', { attr: { rx: 30 }, opacity: 0.15 });
  gsap.set('.g-press', { y: -300 });
  gsap.set('.g-cheese', { y: -140, opacity: 0 });
  gsap.set(drops, { opacity: 0 });
  gsap.set('.griddle__photo', { clipPath: 'circle(0% at 50% 68%)' });

  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  // 1 — the ball drops
  tl.to('.g-patty', { y: 0, duration: 0.14, ease: 'power2.in' }, 0)
    .to('.g-shadow', { attr: { rx: 84 }, opacity: 0.45, duration: 0.14, ease: 'power2.in' }, 0)
    .to('.g-heat', { opacity: 1, duration: 0.2 }, 0)
  // 2 — the press comes down and SMASHES
    .to('.g-press', { y: 152, duration: 0.16, ease: 'power2.in' }, 0.16)
    .addLabel('smash', 0.32)
    .to('.g-press', { y: 236, duration: 0.08, ease: 'power4.out' }, 'smash')
    .to('.g-patty-raw, .g-patty-sear', { attr: { cy: 388, rx: 182, ry: 44 }, duration: 0.08, ease: 'power4.out' }, 'smash')
    .to('.g-patty-edge', { attr: { cy: 394, rx: 184, ry: 46 }, opacity: 1, duration: 0.08, ease: 'power4.out' }, 'smash')
    .to('.g-shadow', { attr: { rx: 196, ry: 20 }, duration: 0.08 }, 'smash')
    .to('.g-ball-hi', { opacity: 0, duration: 0.05 }, 'smash')
    .to('.g-lace', { opacity: 1, duration: 0.14 }, 'smash+=0.04')
    .to('.g-patty-sear', { opacity: 1, duration: 0.3 }, 'smash+=0.02');
  drops.forEach((d, i) => {
    const a = (i / drops.length) * Math.PI * 2 + 0.3; const r = 190 + (i % 3) * 40;
    tl.fromTo(d, { opacity: 1, x: Math.cos(a) * 120, y: Math.sin(a) * 30 },
      { opacity: 0, x: Math.cos(a) * r, y: Math.sin(a) * 60 - 70 - (i % 4) * 22, duration: 0.14, ease: 'power2.out', immediateRender: false }, 'smash');
  });
  // 3 — lift, steam, cheese
  tl.to('.g-press', { y: -320, duration: 0.14, ease: 'power2.in' }, 0.46)
    .fromTo('.g-steam', { opacity: 0, y: 30 }, { opacity: 0.35, y: -30, duration: 0.2, immediateRender: false }, 0.44)
    .to('.g-steam', { opacity: 0, y: -80, duration: 0.14 }, 0.66)
    .to('.g-cheese', { y: 0, opacity: 1, duration: 0.1, ease: 'power2.in' }, 0.6)
    .to('.g-cheese-flat', { opacity: 0, duration: 0.12 }, 0.72)
    .to('.g-cheese-melt', { opacity: 1, duration: 0.12 }, 0.72)
  // 4 — the real thing
    .to('.griddle__photo', { clipPath: 'circle(78% at 50% 68%)', duration: 0.16, ease: 'power2.inOut' }, 0.84)
    .to('.griddle__cap', { opacity: 1, duration: 0.06 }, 0.92);

  if (reduce) { tl.progress(1); root.classList.add('no-motion'); setStep(2); return; }

  const mm = gsap.matchMedia();
  mm.add({ desk: '(min-width: 900px)', mob: '(max-width: 899px)' }, ctx => {
    const st = ScrollTrigger.create({
      trigger: '.hero', start: () => `top ${document.querySelector('.nav').offsetHeight}px`, end: ctx.conditions.desk ? '+=220%' : '+=170%',
      pin: '.hero__pin', scrub: 0.6, animation: tl, anticipatePin: 1,
      onUpdate: self => setStep(self.progress < 0.3 ? 0 : self.progress < 0.58 ? 1 : 2)
    });
    return () => st.kill();
  });
})();
