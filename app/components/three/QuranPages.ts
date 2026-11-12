import * as THREE from "three";
import { BOOK, sampleCurve, type Curve, type RigState, type Vec2 } from "./quranRig";
import { pageEdgeTexture, pageTexture } from "./textures";

const { pageWidth: L, pageHeight: H, alpha: ALPHA } = BOOK;

function ribbonGeometry(segments: number) {
  const geometry = new THREE.BufferGeometry();
  const count = (segments + 1) * 2;
  const position = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
  position.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", position);
  geometry.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  const index: number[] = [];
  for (let k = 0; k < segments; k++) {
    const a = k * 2;
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  geometry.setIndex(index);
  return geometry;
}

function writeRibbon(geometry: THREE.BufferGeometry, points: Float32Array, arc: Float32Array, segments: number) {
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  const uv = geometry.getAttribute("uv") as THREE.BufferAttribute;
  for (let k = 0; k <= segments; k++) {
    position.setXYZ(k * 2, points[k * 2], points[k * 2 + 1], H / 2);
    position.setXYZ(k * 2 + 1, points[k * 2], points[k * 2 + 1], -H / 2);
    uv.setXY(k * 2, arc[k], 0);
    uv.setXY(k * 2 + 1, arc[k], 1);
  }
  position.needsUpdate = true;
  uv.needsUpdate = true;
  geometry.computeVertexNormals();
}

// Head, tail and fore-edge of a page stack, rebuilt from the same profile as its top leaf.
function sidesGeometry(segments: number) {
  const geometry = new THREE.BufferGeometry();
  const count = (segments * 2 + 1) * 6;
  for (const [name, size] of [["position", 3], ["normal", 3], ["uv", 2]] as const) {
    const attribute = new THREE.BufferAttribute(new Float32Array(count * size), size);
    attribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute(name, attribute);
  }
  return geometry;
}

function writeSides(geometry: THREE.BufferGeometry, points: Float32Array, arc: Float32Array, segments: number, hinge: Vec2, direction: number) {
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  const normal = geometry.getAttribute("normal") as THREE.BufferAttribute;
  const uv = geometry.getAttribute("uv") as THREE.BufferAttribute;
  const dx = Math.cos(direction);
  const dy = Math.sin(direction);
  let v = 0;
  const put = (x: number, y: number, z: number, nx: number, ny: number, nz: number, u: number, w: number) => {
    position.setXYZ(v, x, y, z);
    normal.setXYZ(v, nx, ny, nz);
    uv.setXY(v, u, w);
    v++;
  };
  // Leaves shear against each other as the book opens, so the bottom of the stack
  // gives back part of the length the top leaf loses climbing out of the gutter.
  const tipAlong = (points[segments * 2] - hinge[0]) * dx + (points[segments * 2 + 1] - hinge[1]) * dy;
  const base = L - 0.55 * Math.max(0, L - tipAlong);
  const baseX = (k: number) => hinge[0] + dx * arc[k] * base;
  const baseY = (k: number) => hinge[1] + dy * arc[k] * base;
  for (const z of [H / 2, -H / 2]) {
    const nz = Math.sign(z);
    for (let k = 0; k < segments; k++) {
      const ax = points[k * 2], ay = points[k * 2 + 1], bx = points[k * 2 + 2], by = points[k * 2 + 3];
      const u0 = arc[k] * 4, u1 = arc[k + 1] * 4;
      put(ax, ay, z, 0, 0, nz, u0, 1);
      put(bx, by, z, 0, 0, nz, u1, 1);
      put(baseX(k + 1), baseY(k + 1), z, 0, 0, nz, u1, 0);
      put(ax, ay, z, 0, 0, nz, u0, 1);
      put(baseX(k + 1), baseY(k + 1), z, 0, 0, nz, u1, 0);
      put(baseX(k), baseY(k), z, 0, 0, nz, u0, 0);
    }
  }
  const tx = points[segments * 2], ty = points[segments * 2 + 1];
  const ex = baseX(segments), ey = baseY(segments);
  // The fore-edge leans as the book opens, so its normal comes from the edge itself.
  let nx = ty - ey, ny = ex - tx;
  if (nx * dx + ny * dy < 0) {
    nx = -nx;
    ny = -ny;
  }
  const nl = Math.hypot(nx, ny) || 1;
  nx /= nl;
  ny /= nl;
  put(tx, ty, H / 2, nx, ny, 0, 0, 1);
  put(tx, ty, -H / 2, nx, ny, 0, 6, 1);
  put(ex, ey, -H / 2, nx, ny, 0, 6, 0);
  put(tx, ty, H / 2, nx, ny, 0, 0, 1);
  put(ex, ey, -H / 2, nx, ny, 0, 6, 0);
  put(ex, ey, H / 2, nx, ny, 0, 0, 0);
  position.needsUpdate = true;
  normal.needsUpdate = true;
  uv.needsUpdate = true;
}

/** Page stacks and loose leaves as one imperative object, driven by a RigState each frame. */
export function createQuranPages(leafCount: number, segments: number, shadows: boolean) {
  const group = new THREE.Group();
  const paperMap = pageTexture();
  const edgeMap = pageEdgeTexture();
  const paper = new THREE.MeshStandardMaterial({ map: paperMap, roughness: 0.92, side: THREE.DoubleSide });
  const edge = new THREE.MeshStandardMaterial({ map: edgeMap, roughness: 0.85, side: THREE.DoubleSide });
  const points = new Float32Array((segments + 1) * 2);
  const arc = new Float32Array(segments + 1);

  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material) => {
    const m = new THREE.Mesh(geometry, material);
    m.frustumCulled = false; // vertices move every frame; bounds are not worth recomputing
    m.castShadow = shadows;
    m.receiveShadow = shadows;
    group.add(m);
    return geometry;
  };
  const stacks = (["right", "left"] as const).map((side) => ({
    side,
    top: mesh(ribbonGeometry(segments), paper),
    sides: mesh(sidesGeometry(segments), edge),
  }));
  const leaves = Array.from({ length: leafCount }, () => mesh(ribbonGeometry(segments), paper));

  function update(rig: RigState) {
    for (const stack of stacks) {
      const right = stack.side === "right";
      const curve: Curve = right ? rig.right : rig.left;
      sampleCurve(rig.root, curve, L, segments, points, arc);
      writeRibbon(stack.top, points, arc, segments);
      writeSides(stack.sides, points, arc, segments, right ? rig.hingeBack : rig.hingeFront, right ? ALPHA : rig.cover);
    }
    leaves.forEach((geometry, i) => {
      sampleCurve(rig.root, rig.leaves[i], L, segments, points, arc);
      writeRibbon(geometry, points, arc, segments);
    });
  }

  function dispose() {
    for (const stack of stacks) {
      stack.top.dispose();
      stack.sides.dispose();
    }
    leaves.forEach((geometry) => geometry.dispose());
    paper.dispose();
    edge.dispose();
    paperMap.dispose();
    edgeMap.dispose();
  }

  return { group, update, dispose };
}
