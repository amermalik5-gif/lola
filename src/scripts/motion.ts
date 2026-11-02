import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const rtl = document.documentElement.dir === 'rtl';
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll<T>(sel));

/* ---------- Smooth scroll ---------- */

let lenis: Lenis | null = null;
/** Set while a pinned section sits under the header, so the header doesn't hide and leave a gap. */
let holdHeader = false;
let refreshHeader = () => {};
if (!reduced) {
  lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 0.95 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis!.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}
/** Page scripts scroll through Lenis when it is running, so the two never disagree. */
export function scrollToY(y: number) {
  lenis ? lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo({ top: y, behavior: 'instant' });
}
(window as unknown as { __scrollToY: typeof scrollToY }).__scrollToY = scrollToY;

/* ---------- Header: solid after scrolling, hides on the way down ---------- */

function header() {
  const el = document.querySelector<HTMLElement>('[data-header]');
  if (!el) return;
  let last = window.scrollY;
  const always = el.hasAttribute('data-always-solid');
  const update = () => {
    const y = window.scrollY;
    el.classList.toggle('is-solid', always || y > 24);
    if (y > 480 && y > last + 2 && !holdHeader) el.classList.add('is-hidden');
    if (y < last - 2 || y <= 480 || holdHeader) el.classList.remove('is-hidden');
    document.documentElement.classList.toggle('header-hidden', el.classList.contains('is-hidden'));
    last = y;
  };
  update();
  refreshHeader = update;
  window.addEventListener('scroll', update, { passive: true });
  // keyboard users tabbing into a hidden header bring it back
  el.addEventListener('focusin', () => {
    el.classList.remove('is-hidden');
    document.documentElement.classList.remove('header-hidden');
  });

  const toggle = el.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = el.querySelector<HTMLElement>('[data-mobile-menu]');
  if (!toggle || !menu) return;
  const links = $$('ol a', menu);
  const setOpen = (open: boolean) => {
    toggle.setAttribute('aria-expanded', String(open));
    el.classList.toggle('menu-open', open);
    toggle.querySelector('[data-label-open]')!.toggleAttribute('hidden', open);
    toggle.querySelector('[data-label-close]')!.toggleAttribute('hidden', !open);
    const r = toggle.getBoundingClientRect();
    menu.style.setProperty('--cx', `${r.left + r.width / 2}px`);
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add('is-open'));
      lenis?.stop();
      document.body.style.overflow = 'hidden';
      gsap.fromTo(links, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.05, delay: 0.2, ease: 'expo.out' });
      links[0]?.focus({ preventScroll: true });
    } else {
      menu.classList.remove('is-open');
      lenis?.start();
      document.body.style.overflow = '';
      setTimeout(() => !menu.classList.contains('is-open') && (menu.hidden = true), 800);
    }
  };
  // a page restored from the back/forward cache must not come back with the menu open
  window.addEventListener('pageshow', (e) => e.persisted && toggle.getAttribute('aria-expanded') === 'true' && setOpen(false));
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true' && (setOpen(false), toggle.focus()));
}

/* ---------- Generic reveals ---------- */

function reveals() {
  $$('[data-reveal-group]').forEach((g) =>
    Array.from(g.querySelectorAll<HTMLElement>('[data-reveal]')).forEach((el, i) => el.style.setProperty('--d', `${i * 0.08}s`)),
  );
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }),
    { rootMargin: '0px 0px -10% 0px' },
  );
  $$('[data-reveal]').forEach((el) => io.observe(el));
}

/* ---------- Headings rise line by line (words stay whole: Arabic letters join) ---------- */

function splitHeadings() {
  const els = $$('[data-split]');
  if (reduced || !els.length) {
    els.forEach((el) => (el.style.visibility = 'visible'));
    return;
  }
  els.forEach((el) => {
    const split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true });
    el.style.visibility = 'visible';
    const delay = Number(el.dataset.splitDelay || 0);
    gsap.from(split.lines, {
      yPercent: 115,
      duration: 1.25,
      ease: 'expo.out',
      stagger: 0.09,
      delay,
      scrollTrigger: el.hasAttribute('data-split-now') ? undefined : { trigger: el, start: 'top 88%' },
    });
  });
}

/* ---------- Technical drawings draw themselves in ---------- */

function drawings() {
  $$<SVGSVGElement>('[data-drawing]').forEach((svg) => {
    const strokes = $$<SVGGeometryElement>('.dw', svg);
    if (reduced) return svg.classList.add('is-drawn');
    strokes.forEach((p) => {
      p.setAttribute('pathLength', '1');
      p.style.strokeDasharray = '1';
      p.style.strokeDashoffset = '1';
    });
    ScrollTrigger.create({
      trigger: svg,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        gsap.to(strokes, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut', stagger: 0.05 });
        gsap.delayedCall(0.6, () => svg.classList.add('is-drawn'));
      },
    });
  });
}

/* ---------- Brand petals: hairlines draw, then drift with scroll ---------- */

function petals() {
  $$<SVGSVGElement>('[data-petals]').forEach((svg) => {
    const paths = $$<SVGPathElement>('path', svg);
    if (reduced) return;
    paths.forEach((p) => {
      p.style.strokeDasharray = '1';
      p.style.strokeDashoffset = '1';
    });
    gsap.to(paths, {
      strokeDashoffset: 0,
      duration: 2.4,
      ease: 'power2.inOut',
      stagger: 0.12,
      scrollTrigger: { trigger: svg, start: 'top 95%' },
    });
    gsap.fromTo(
      svg,
      { rotate: rtl ? 4 : -4, yPercent: 6 },
      { rotate: rtl ? -4 : 4, yPercent: -6, ease: 'none', scrollTrigger: { trigger: svg, start: 'top bottom', end: 'bottom top', scrub: 1 } },
    );
  });
}

/* ---------- Numbers count up ---------- */

function counters() {
  const nf = new Intl.NumberFormat('en-US');
  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    const plain = el.hasAttribute('data-plain');
    const fmt = (n: number) => (plain ? String(Math.round(n)) : nf.format(Math.round(n)));
    if (reduced) return void (el.textContent = fmt(to));
    const from = plain ? to - 30 : 0;
    const o = { v: from };
    el.textContent = fmt(from);
    gsap.to(o, {
      v: to,
      duration: 2.2,
      ease: 'expo.out',
      onUpdate: () => (el.textContent = fmt(o.v)),
      scrollTrigger: { trigger: el, start: 'top 90%' },
    });
  });
}

/* ---------- Marquee that leans into scroll velocity ---------- */

function marquees() {
  $$('[data-marquee]').forEach((root) => {
    const track = root.querySelector<HTMLElement>('[data-marquee-track]');
    if (!track || reduced) return;
    track.innerHTML += track.innerHTML;
    // the track is laid out LTR; Arabic pages travel the other way
    const tween = gsap.fromTo(track, { xPercent: rtl ? -50 : 0 }, { xPercent: rtl ? 0 : -50, duration: 38, ease: 'none', repeat: -1 });
    // scroll speed pushes the marquee; it eases back to cruising speed on its own
    const settle = gsap.quickTo(tween, 'timeScale', { duration: 1.2, ease: 'power2.out' });
    ScrollTrigger.create({
      trigger: root,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        const dir = self.direction === 1 ? 1 : -1;
        tween.timeScale(dir * (1 + Math.min(Math.abs(self.getVelocity()) / 300, 6)));
        settle(dir);
      },
    });
  });
}

/* ---------- Magnetic buttons ---------- */

function magnetic() {
  if (!finePointer || reduced) return;
  $$('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'expo.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'expo.out' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * 0.22);
      yTo((e.clientY - r.top - r.height / 2) * 0.3);
    });
    el.addEventListener('pointerleave', () => (xTo(0), yTo(0)));
  });
}

/* ---------- Factory process: pinned, step by step ---------- */

function processSteps() {
  const root = document.querySelector<HTMLElement>('[data-process]');
  if (!root) return;
  const steps = $$('[data-step]', root);
  const fill = root.querySelector<HTMLElement>('[data-process-fill]');
  const num = root.querySelector<HTMLElement>('[data-process-num]');
  const setActive = (i: number) => {
    steps.forEach((s, j) => s.classList.toggle('is-active', j === i));
    steps.forEach((s, j) => s.classList.toggle('is-done', j < i));
    if (num) num.textContent = String(i + 1).padStart(2, '0');
    root.style.setProperty('--step', String(i));
  };
  setActive(0);
  if (reduced) return;
  const mm = gsap.matchMedia();
  mm.add('(min-width: 1025px)', () => {
    ScrollTrigger.create({
      trigger: root,
      start: 'top top',
      end: () => `+=${steps.length * window.innerHeight * 0.55}`,
      pin: true,
      scrub: true,
      refreshPriority: 1,
      onUpdate: (self) => {
        const i = Math.min(steps.length - 1, Math.floor(self.progress * steps.length));
        setActive(i);
        if (fill) fill.style.transform = `scaleY(${self.progress})`;
      },
    });
  });
  mm.add('(max-width: 1024px)', () => {
    steps.forEach((s, i) => ScrollTrigger.create({ trigger: s, start: 'top 70%', onEnter: () => setActive(i), onEnterBack: () => setActive(i) }));
  });
}

/* ---------- Featured products: horizontal travel on desktop ---------- */

function hscroll() {
  const root = document.querySelector<HTMLElement>('[data-hscroll]');
  const track = root?.querySelector<HTMLElement>('[data-hscroll-track]');
  if (!root || !track || reduced) return;
  const mm = gsap.matchMedia();
  mm.add('(min-width: 1025px)', () => {
    const distance = () => Math.max(0, track.scrollWidth - root.clientWidth);
    gsap.to(track, {
      x: () => distance() * (rtl ? 1 : -1),
      ease: 'none',
      scrollTrigger: {
        trigger: root,
        start: 'top top+=' + (document.querySelector('[data-header]')?.clientHeight ?? 0),
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        // pins first, so every trigger below includes their scroll length
        refreshPriority: 1,
        onToggle: (self) => {
          holdHeader = self.isActive;
          refreshHeader();
        },
      },
    });
  });
}

/* ---------- Parallax ---------- */

function parallax() {
  if (reduced) return;
  $$('[data-parallax]').forEach((el) => {
    const amt = Number(el.dataset.parallax || 12);
    gsap.fromTo(el, { yPercent: -amt / 2 }, { yPercent: amt / 2, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
}

/* ---------- Home hero: the catalogue cover mixer ---------- */

function hero() {
  const root = document.querySelector<HTMLElement>('[data-hero]');
  if (!root) return;
  const product = root.querySelector<HTMLElement>('[data-hero-product]');
  if (reduced || !product) return;

  gsap
    .timeline({ defaults: { ease: 'expo.out' }, delay: 0.1 })
    .from($$('[data-hero-fade]', root), { y: 24, opacity: 0, duration: 1.4, stagger: 0.08 }, 0.5)
    .from(product, { yPercent: 10, duration: 2.2, ease: 'power3.out' }, 0);

  // a slight turn towards the pointer, as if the mixer were on a turntable
  if (finePointer) {
    gsap.set(product, { transformPerspective: 1400 });
    const rotY = gsap.quickTo(product, 'rotationY', { duration: 1.2, ease: 'power3.out' });
    const rotX = gsap.quickTo(product, 'rotationX', { duration: 1.2, ease: 'power3.out' });
    root.addEventListener('pointermove', (e) => {
      const r = root.getBoundingClientRect();
      rotY(((e.clientX - r.left) / r.width - 0.5) * 10);
      rotX(-((e.clientY - r.top) / r.height - 0.5) * 5);
    });
    root.addEventListener('pointerleave', () => (rotY(0), rotX(0)));
  }

  // the product rises out of frame as the page scrolls
  gsap.to(root.querySelector('[data-hero-stage]'), {
    yPercent: -12,
    ease: 'none',
    scrollTrigger: { trigger: root, start: 'top top', end: 'bottom top', scrub: true },
  });
}

/* ---------- Pause looping decoration while it is off-screen ---------- */

function pauseOffscreen() {
  const io = new IntersectionObserver((entries) =>
    entries.forEach((e) => (e.target as HTMLElement).classList.toggle('is-paused', !e.isIntersecting)),
  );
  $$('[data-hero], .window-light').forEach((el) => io.observe(el));
}

/* ---------- Boot ---------- */

header();
hscroll();
processSteps();
reveals();
drawings();
petals();
counters();
marquees();
magnetic();
parallax();
hero();
pauseOffscreen();
document.fonts.ready.then(() => {
  splitHeadings();
  ScrollTrigger.refresh();
});
window.addEventListener('load', () => ScrollTrigger.refresh());
