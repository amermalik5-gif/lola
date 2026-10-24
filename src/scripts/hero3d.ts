/**
 * Hero scene: a single-lever basin mixer rendered in real time, lit by a
 * blue studio that matches the brand gradient. A pearl-like drop forms at
 * the aerator, falls and ripples — the brand name (اللؤلؤة, "the pearl")
 * told through water. Finishes switch live.
 */
import * as THREE from 'three';
import { gsap } from 'gsap';

export type Finish = 'chrome' | 'matte-black' | 'gold' | 'rose-gold';

const FINISHES: Record<Finish, { color: number; metalness: number; roughness: number; clearcoat: number }> = {
  chrome: { color: 0xffffff, metalness: 1, roughness: 0.055, clearcoat: 0 },
  'matte-black': { color: 0x1b1d22, metalness: 0.35, roughness: 0.48, clearcoat: 0.15 },
  gold: { color: 0xe6bd6a, metalness: 1, roughness: 0.16, clearcoat: 0.2 },
  'rose-gold': { color: 0xeaae96, metalness: 1, roughness: 0.16, clearcoat: 0.2 },
};

type Options = { reduced: boolean };

export function createHero(canvas: HTMLCanvasElement, { reduced }: Options) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  camera.position.set(2.6, 1.85, 5.6);
  const target = new THREE.Vector3(0.22, 1.02, 0);
  camera.lookAt(target);

  scene.environment = buildStudio(renderer);

  // ---------- Mixer ----------
  const metal = new THREE.MeshPhysicalMaterial({ ...FINISHES.chrome, envMapIntensity: 1.25 });
  const dark = new THREE.MeshPhysicalMaterial({ color: 0x20262f, metalness: 0.6, roughness: 0.5 });

  const mixer = new THREE.Group();

  // body: lathe profile gives a soft radius on the top edge for clean highlights
  const profile = [
    [0, 0], [0.33, 0], [0.335, 0.012], [0.335, 0.05], [0.325, 0.062], [0.27, 0.068],
    [0.265, 0.08], [0.265, 1.72], [0.262, 1.75], [0.252, 1.772], [0.235, 1.784], [0, 1.786],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 128), metal);
  mixer.add(body);

  // spout
  const spoutLen = 0.92;
  const spout = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, spoutLen, 16, 64), metal);
  spout.rotation.z = Math.PI / 2;
  spout.position.set(spoutLen / 2 + 0.05, 1.43, 0);
  mixer.add(spout);

  const tipX = spoutLen + 0.02;
  const aerator = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.066, 0.024, 48), dark);
  aerator.position.set(tipX - 0.06, 1.33, 0);
  mixer.add(aerator);

  // lever cap + lever
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.225, 0.16, 96), metal);
  cap.position.y = 1.86;
  mixer.add(cap);
  const leverLen = 0.78;
  const tilt = 0.24;
  const lever = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, leverLen, 12, 32), metal);
  lever.rotation.z = Math.PI / 2 - tilt;
  lever.position.set(-Math.cos(tilt) * (leverLen / 2 + 0.06), 1.96 + Math.sin(tilt) * (leverLen / 2), 0);
  mixer.add(lever);
  const leverHub = new THREE.Mesh(new THREE.SphereGeometry(0.075, 48, 24), metal);
  leverHub.position.set(0, 1.95, 0);
  mixer.add(leverHub);

  // soft contact shadow
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 3.4),
    new THREE.MeshBasicMaterial({ map: radialTexture(), transparent: true, depthWrite: false, opacity: 0.55 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0.35, 0.001, 0);
  mixer.add(shadow);

  const rig = new THREE.Group();
  rig.add(mixer);
  scene.add(rig);

  // ---------- Pearl drop ----------
  const pearlMat = new THREE.MeshPhysicalMaterial({
    color: 0xf6f2ea,
    roughness: 0.14,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    iridescence: 1,
    iridescenceIOR: 1.55,
    iridescenceThicknessRange: [180, 620],
    sheen: 0.6,
    sheenColor: new THREE.Color(0xbfe2f5),
    envMapIntensity: 1.4,
  });
  const drop = new THREE.Mesh(new THREE.SphereGeometry(0.058, 48, 32), pearlMat);
  const dropX = aerator.position.x;
  const dropTop = 1.318 - 0.058;
  drop.position.set(dropX, dropTop, 0);
  drop.scale.setScalar(0.001);
  mixer.add(drop);

  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
  const rings = [0, 1].map(() => {
    const r = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 96), ringMat.clone());
    r.rotation.x = -Math.PI / 2;
    r.position.set(dropX, 0.004, 0);
    r.scale.setScalar(0.01);
    mixer.add(r);
    return r;
  });

  const dropTl = gsap.timeline({ repeat: -1, repeatDelay: 1.1, paused: true });
  const fallTime = Math.sqrt((2 * (dropTop - 0.05)) / 9.8) * 1.15;
  dropTl
    .set(drop.position, { y: dropTop })
    .fromTo(drop.scale, { x: 0.001, y: 0.001, z: 0.001 }, { x: 1, y: 1.12, z: 1, duration: 1.8, ease: 'power2.inOut' })
    .to(drop.position, { y: dropTop - 0.02, duration: 0.5, ease: 'sine.inOut' })
    .to(drop.position, { y: 0.05, duration: fallTime, ease: 'power2.in' })
    .to(drop.scale, { y: 1.35, x: 0.85, z: 0.85, duration: fallTime, ease: 'power2.in' }, '<')
    .set(drop.scale, { x: 0.001, y: 0.001, z: 0.001 });
  rings.forEach((r, i) => {
    const m = r.material as THREE.MeshBasicMaterial;
    dropTl
      .fromTo(r.scale, { x: 0.02, y: 0.02, z: 0.02 }, { x: 0.42 + i * 0.22, y: 0.42 + i * 0.22, z: 0.42 + i * 0.22, duration: 1.4, ease: 'expo.out' }, `<${i ? 0.12 : 0}`)
      .fromTo(m, { opacity: 0.75 }, { opacity: 0, duration: 1.4, ease: 'power2.out' }, '<');
  });

  if (reduced) {
    drop.scale.set(1, 1.12, 1);
  }

  // ---------- Interaction ----------
  const base = { y: -0.55 };
  const pointer = { x: 0, y: 0 };
  const eased = { x: 0, y: 0 };
  const spin = { value: 0 };
  let scrollP = 0;

  function onPointer(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    pointer.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
  }
  if (!reduced) window.addEventListener('pointermove', onPointer, { passive: true });

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the mixer framed on narrow screens
    camera.position.setLength(w / h < 0.8 ? 7.2 : 5.6 + (1 - Math.min(w / h, 1.4) / 1.4) * 0.8);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    render();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const clock = new THREE.Clock();
  let running = false;
  let visible = true;

  function render() {
    renderer.render(scene, camera);
  }

  function tick() {
    if (!running) return;
    const t = clock.getElapsedTime();
    eased.x += (pointer.x - eased.x) * 0.05;
    eased.y += (pointer.y - eased.y) * 0.05;
    rig.rotation.y = base.y + Math.sin(t * 0.35) * 0.12 + eased.x * 0.45 + spin.value + scrollP * 0.9;
    rig.rotation.x = eased.y * 0.05;
    rig.position.y = -scrollP * 0.35;
    render();
    requestAnimationFrame(tick);
  }

  function start() {
    if (running || reduced || !visible) return;
    running = true;
    dropTl.play();
    requestAnimationFrame(tick);
  }
  function stop() {
    running = false;
    dropTl.pause();
  }

  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    visible ? start() : stop();
  });
  io.observe(canvas);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  resize();
  rig.rotation.y = base.y;
  render();
  start();

  return {
    setFinish(name: Finish) {
      const f = FINISHES[name];
      const c = new THREE.Color(f.color);
      gsap.to(metal.color, { r: c.r, g: c.g, b: c.b, duration: 0.9, ease: 'power2.inOut', onUpdate: render });
      gsap.to(metal, { metalness: f.metalness, roughness: f.roughness, clearcoat: f.clearcoat, duration: 0.9, ease: 'power2.inOut' });
      if (!reduced) gsap.to(spin, { value: spin.value + Math.PI * 2, duration: 1.8, ease: 'power3.inOut' });
      else render();
    },
    setScroll(p: number) {
      scrollP = p;
      if (reduced) render();
    },
  };
}

/** A blue cyclorama with white softbox strips — gives chrome its streaks. */
function buildStudio(renderer: THREE.WebGLRenderer) {
  const env = new THREE.Scene();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(20, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        top: { value: new THREE.Color(0xf2f7fb) },
        mid: { value: new THREE.Color(0x6f8fae) },
        bot: { value: new THREE.Color(0x06142b) },
      },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader:
        'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, pow(h, 0.8)) : mix(mid, bot, pow(-h, 0.6)); gl_FragColor = vec4(c, 1.0); }',
    }),
  );
  env.add(sky);

  const box = (w: number, h: number, intensity: number, pos: [number, number, number], rotY = 0, rotX = 0) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(intensity, intensity, intensity), side: THREE.DoubleSide }),
    );
    m.position.set(...pos);
    m.rotation.set(rotX, rotY, 0);
    env.add(m);
  };
  box(1.4, 9, 7, [-6, 2, 2], Math.PI / 2.4); // tall strip left
  box(1.0, 9, 5, [6, 2, 1], -Math.PI / 2.2); // strip right
  box(0.5, 9, 0.02, [3.5, 2, -5], -Math.PI / 5); // dark flag for contrast
  box(7, 2.2, 3.2, [0, 7, 0], 0, Math.PI / 2); // overhead
  box(3, 1.2, 1.4, [2, 1, 7], Math.PI); // front fill

  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.035).texture;
  pmrem.dispose();
  return tex;
}

function radialTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(1,20,45,0.9)');
  grd.addColorStop(0.18, 'rgba(1,20,45,0.55)');
  grd.addColorStop(0.55, 'rgba(1,20,45,0.12)');
  grd.addColorStop(1, 'rgba(1,20,45,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
