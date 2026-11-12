// Pure cross-section kinematics for the Quran model. Everything is solved in the
// book's XY plane (Z is the spine axis) so covers, page stacks and loose leaves
// stay mutually consistent at every opening angle.

export const BOOK = {
  pageWidth: 1.42,
  pageHeight: 2.0,
  thickness: 0.32, // closed page block
  board: 0.035, // cover board thickness
  overhang: 0.045,
  alpha: (27 * Math.PI) / 180, // slope of each rehal wing
};

const { thickness: T, alpha: ALPHA } = BOOK;
const SPINE_CLOSED = ALPHA + Math.PI / 2;
const SPINE_OPEN = Math.PI;
const COVER_CLOSED = ALPHA;
const COVER_OPEN = Math.PI - ALPHA;

export type Vec2 = [number, number];
/** A leaf leaves the spine at rootAngle and relaxes towards tipAngle over ~lambda. */
export type Curve = { rootAngle: number; tipAngle: number; lambda: number };
export type RigState = {
  spine: number;
  cover: number;
  hingeBack: Vec2;
  hingeFront: Vec2;
  root: Vec2;
  right: Curve;
  left: Curve;
  leaves: Curve[];
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

// Sine integral: the sideways drift of an exponentially relaxing leaf is lambda * Si(delta),
// which lets a leaf be solved to land exactly on top of its page stack.
function si(x: number) {
  let term = x;
  let sum = x;
  for (let k = 1; k < 9; k++) {
    term *= (-x * x) / (2 * k * (2 * k + 1));
    sum += term / (2 * k + 1);
  }
  return sum;
}

function siInverse(y: number) {
  let x = y;
  for (let i = 0; i < 7; i++) x -= (si(x) - y) / (x > 1e-6 ? Math.sin(x) / x : 1);
  return x;
}

const LAMBDA_REST = ((T / 2) * (1 - Math.sin(ALPHA))) / si(Math.PI / 2 - ALPHA);

function landing(height: number) {
  const lambda = Math.max(LAMBDA_REST, height / 1.3);
  return { lambda, delta: height < 1e-6 ? 0 : siInverse(height / lambda) };
}

/** openness: 0 = closed on the right wing of the rehal, 1 = resting open on both wings. */
export function computeRig(openness: number, leafCount: number): RigState {
  const o = clamp01(openness);
  // The spine stays square to the back board until the cover is well clear, then lays flat.
  const spine = mix(SPINE_CLOSED, SPINE_OPEN, smooth(clamp01((o - 0.3) / 0.7)));
  const cover = mix(COVER_CLOSED, COVER_OPEN, smoother(o));
  const hingeBack: Vec2 = [T / 2, 0];
  const ux = Math.cos(spine);
  const uy = Math.sin(spine);
  const hingeFront: Vec2 = [hingeBack[0] + T * ux, T * uy];
  const root: Vec2 = [hingeBack[0] + (T / 2) * ux, (T / 2) * uy];

  const r = landing((T / 2) * (1 - Math.cos(spine - SPINE_CLOSED)));
  const right: Curve = { rootAngle: ALPHA + r.delta, tipAngle: ALPHA, lambda: r.lambda };

  const leftHeight = (T / 2) * (1 + Math.sin(cover - spine));
  const l = landing(leftHeight);
  let leftRoot = cover - l.delta;
  let leftLambda = l.lambda;
  if (leftRoot < right.rootAngle) {
    // Never let the left stack start below the right one at the gutter.
    leftRoot = right.rootAngle;
    const delta = cover - leftRoot;
    leftLambda = delta > 1e-3 ? Math.max(leftHeight / si(delta), 0.02) : LAMBDA_REST;
  }
  const left: Curve = { rootAngle: leftRoot, tipAngle: cover, lambda: leftLambda };

  // Loose leaves: weight 0 lies on the right stack, 1 on the left stack.
  const leaves: Curve[] = [];
  const staying = Math.floor(leafCount / 2);
  let previous = 0;
  for (let i = 0; i < leafCount; i++) {
    let w: number;
    if (i < staying) {
      const rest = 0.022 * (i + 1);
      const flutter = Math.sin(Math.PI * clamp01((o - 0.2) / 0.8)) ** 2;
      w = rest * smooth(o) + 0.07 * ((i + 1) / staying) * flutter;
    } else {
      const fromCover = leafCount - 1 - i;
      const rest = 1 - 0.022 * (fromCover + 1);
      const start = 0.06 + 0.13 * fromCover;
      const end = Math.min(1, 0.78 + 0.11 * fromCover);
      w = rest * smoother(clamp01((o - start) / (end - start)));
    }
    w = Math.max(w, previous + 0.012 * Math.min(1, o * 4));
    previous = w;
    leaves.push({
      rootAngle: mix(right.rootAngle, left.rootAngle, w),
      tipAngle: mix(ALPHA, cover, w),
      // Leaves in mid-turn are slack, so they arc more softly than resting ones.
      lambda: mix(right.lambda, left.lambda, w) + 0.2 * Math.sin(Math.PI * clamp01(w)),
    });
  }
  return { spine, cover, hingeBack, hingeFront, root, right, left, leaves };
}

/** Integrates a leaf profile; samples are denser near the gutter where it bends most. */
export function sampleCurve(root: Vec2, curve: Curve, length: number, segments: number, out: Float32Array, arc: Float32Array) {
  let x = root[0];
  let y = root[1];
  let s = 0;
  out[0] = x;
  out[1] = y;
  arc[0] = 0;
  for (let k = 1; k <= segments; k++) {
    const next = length * (k / segments) ** 2;
    const angle = curve.tipAngle + (curve.rootAngle - curve.tipAngle) * Math.exp(-((s + next) / 2) / curve.lambda);
    x += (next - s) * Math.cos(angle);
    y += (next - s) * Math.sin(angle);
    s = next;
    out[k * 2] = x;
    out[k * 2 + 1] = y;
    arc[k] = next / length;
  }
}
