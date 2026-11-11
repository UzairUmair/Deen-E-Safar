"use client";
import { useEffect, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OPEN_END, OPEN_START, type Story } from "./story";

export const QURAN_Y = -10;

const DEG = Math.PI / 180;
const FOV = 30;
const VIEW = 2 * Math.tan((FOV * DEG) / 2);
const SHELF: Vec3 = [0, 0.02, 0];
const QURAN: Vec3 = [0, QURAN_Y + 0.28, 0];

type Vec3 = [number, number, number];
/**
 * A camera pose described by composition rather than raw coordinates: which object to
 * frame, from where, how much of the viewport it may fill (fw/fh) and where it sits
 * on screen (fx/fy, fractions from centre). This is what keeps resizing correct.
 */
type Key = { p: number; focus: Vec3; az: number; el: number; width: number; height: number; fw: number; fh: number; fx: number; fy: number };

const shelf = { focus: SHELF, width: 4.9, height: 2.6 };
const quran = { focus: QURAN, width: 3.7, height: 2.9 };

const WIDE: Key[] = [
  { p: 0, ...shelf, az: 0, el: 5, fw: 0.4, fh: 0.5, fx: 0.22, fy: -0.02 },
  { p: 0.05, ...shelf, az: 0, el: 5, fw: 0.4, fh: 0.5, fx: 0.22, fy: -0.02 },
  { p: OPEN_START, ...quran, az: -27, el: 25, fw: 0.36, fh: 0.56, fx: 0, fy: -0.03 },
  { p: OPEN_END, ...quran, az: -9, el: 40, fw: 0.38, fh: 0.6, fx: -0.23, fy: -0.02 },
  { p: 0.9, ...quran, az: -5, el: 42, fw: 0.38, fh: 0.6, fx: -0.23, fy: -0.02 },
  { p: 1, ...quran, az: -3, el: 44, fw: 0.32, fh: 0.5, fx: -0.23, fy: 0.03 },
];

// Portrait screens: objects fill the width and sit in the upper part, copy goes below.
const TALL: Key[] = [
  { p: 0, ...shelf, az: 0, el: 5, fw: 0.94, fh: 0.34, fx: 0, fy: 0.16 },
  { p: 0.05, ...shelf, az: 0, el: 5, fw: 0.94, fh: 0.34, fx: 0, fy: 0.16 },
  { p: OPEN_START, ...quran, az: -27, el: 25, fw: 0.84, fh: 0.4, fx: 0, fy: 0.1 },
  { p: OPEN_END, ...quran, az: -9, el: 42, fw: 0.82, fh: 0.26, fx: 0, fy: 0.235 },
  { p: 0.9, ...quran, az: -5, el: 43, fw: 0.82, fh: 0.26, fx: 0, fy: 0.235 },
  { p: 1, ...quran, az: -3, el: 44, fw: 0.7, fh: 0.22, fx: 0, fy: 0.25 },
];

const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * Monotone cubic interpolation (PCHIP) through key values. Velocity is continuous across
 * keys, so the camera glides through each pose instead of stopping at it, and a held
 * value stays exactly held (no overshoot). It eases in and out at the two ends.
 */
function spline(xs: number[], ys: number[], x: number) {
  const last = xs.length - 1;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[last]) return ys[last];
  let i = 0;
  while (i < last - 1 && x > xs[i + 1]) i++;
  const slope = (k: number) => (ys[k + 1] - ys[k]) / (xs[k + 1] - xs[k]);
  const tangent = (k: number) => {
    if (k === 0 || k === last) return 0;
    const before = slope(k - 1);
    const after = slope(k);
    return before * after <= 0 ? 0 : (2 * before * after) / (before + after);
  };
  const h = xs[i + 1] - xs[i];
  const t = (x - xs[i]) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * tangent(i) + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * tangent(i + 1);
}

const track = (keys: Key[]) => ({
  keys,
  p: keys.map((k) => k.p),
  az: keys.map((k) => k.az),
  el: keys.map((k) => k.el),
  fx: keys.map((k) => k.fx),
  fy: keys.map((k) => k.fy),
  focus: [0, 1, 2].map((axis) => keys.map((k) => k.focus[axis])),
});
const WIDE_TRACK = track(WIDE);
const TALL_TRACK = track(TALL);

export function CameraRig({
  story,
  tall,
  rtl,
  focus,
  shelfRef,
  quranRef,
}: {
  story: Story;
  tall: boolean;
  /** Mirrors the horizontal composition for right-to-left layouts. */
  rtl: boolean;
  focus: THREE.Vector3;
  shelfRef: RefObject<THREE.Group | null>;
  quranRef: RefObject<THREE.Group | null>;
}) {
  const invalidate = useThree((s) => s.invalidate);
  const pointer = useRef({ x: 0, y: 0, sx: 0, sy: 0 });
  const intro = useRef(0);
  const scratch = useRef({ right: new THREE.Vector3(), up: new THREE.Vector3() });

  useEffect(() => {
    // Perspective follows the pointer only where there is a real (fine) pointer.
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const move = (e: PointerEvent) => {
      if (story.p > 0.2) return;
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
      invalidate();
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [invalidate, story]);

  useEffect(() => {
    invalidate();
  }, [tall, rtl, invalidate]);

  useFrame(({ camera, size }, delta) => {
    const dt = Math.min(delta, 0.05);
    const ease = 1 - Math.exp(-dt * 7);
    let moving = false;

    // The scroll timeline already smooths progress; following it exactly keeps the
    // 3D scene and the DOM overlays on one clock.
    story.p = story.target;
    story.open = Math.min(1, Math.max(0, (story.p - OPEN_START) / (OPEN_END - OPEN_START)));

    if (intro.current < 1) {
      intro.current = Math.min(1, intro.current + dt / 1.9);
      moving = true;
    }
    const settle = 1 - (1 - intro.current) ** 3;

    const pt = pointer.current;
    pt.sx += (pt.x - pt.sx) * ease;
    pt.sy += (pt.y - pt.sy) * ease;
    if (Math.abs(pt.x - pt.sx) + Math.abs(pt.y - pt.sy) > 0.002) moving = true;

    const path = tall ? TALL_TRACK : WIDE_TRACK;
    const at = (values: number[]) => spline(path.p, values, story.p);
    const aspect = size.width / size.height;
    // Distance depends on the live canvas shape, so its key values are computed per frame.
    const fit = path.keys.map((k) => Math.max(k.width / (k.fw * VIEW * aspect), k.height / (k.fh * VIEW)));
    const distance = at(fit) * (1 + 0.07 * (1 - settle));
    const parallax = 1 - smooth(Math.min(1, story.p / 0.2));
    const az = (at(path.az) - 5 * (1 - settle) + pt.sx * 2.6 * parallax) * DEG;
    const el = (at(path.el) - pt.sy * 1.6 * parallax) * DEG;
    const fx = at(path.fx);
    const fy = at(path.fy);

    focus.set(at(path.focus[0]), at(path.focus[1]), at(path.focus[2]));
    camera.position.set(focus.x + distance * Math.sin(az) * Math.cos(el), focus.y + distance * Math.sin(el), focus.z + distance * Math.cos(az) * Math.cos(el));
    camera.lookAt(focus);
    camera.updateMatrix();
    // Slide the camera sideways (no re-aim) so the subject lands at its screen position.
    const { right, up } = scratch.current;
    right.setFromMatrixColumn(camera.matrix, 0);
    up.setFromMatrixColumn(camera.matrix, 1);
    camera.position.addScaledVector(right, (rtl ? 1 : -1) * fx * distance * VIEW * aspect);
    camera.position.addScaledVector(up, -fy * distance * VIEW);

    // Whichever object has left the frame is not drawn at all.
    if (shelfRef.current) shelfRef.current.visible = story.p < 0.36;
    if (quranRef.current) quranRef.current.visible = story.p > 0.05;

    if (moving) invalidate();
  });

  return null;
}

export const CAMERA_FOV = FOV;
