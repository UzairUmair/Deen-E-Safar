import * as THREE from "three";

// Every surface is painted procedurally: no downloaded assets, and no lettering
// other than plain Latin book titles. The Quran model never carries text.

export const GOLD = "#CBAA69";
// Same drawing is replayed into a roughness(G)/metalness(B) map so gilding reads as metal.
const METAL_INK = "rgb(0,100,255)";
const MATTE_FILL = "rgb(0,190,0)";

type Painter = (c: CanvasRenderingContext2D, w: number, h: number, ink: string) => void;

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

function toTexture(canvas: HTMLCanvasElement, srgb: boolean) {
  const texture = new THREE.CanvasTexture(canvas);
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// Seeded so renders (and the pre-rendered fallback stills) are repeatable.
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function grain(c: CanvasRenderingContext2D, w: number, h: number, amount: number, seed = 7) {
  const rnd = seeded(seed);
  const count = Math.floor((w * h) / 70);
  for (let i = 0; i < count; i++) {
    const a = amount * rnd();
    c.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
    c.fillRect(rnd() * w, rnd() * h, 1.6, 1.6);
  }
}

function frame(c: CanvasRenderingContext2D, w: number, h: number, margin: number, lineWidth: number, ink: string) {
  c.strokeStyle = ink;
  c.lineWidth = lineWidth;
  c.strokeRect(margin, margin, w - margin * 2, h - margin * 2);
}

function star8(c: CanvasRenderingContext2D, x: number, y: number, r: number, lineWidth: number, ink: string) {
  c.strokeStyle = ink;
  c.lineWidth = lineWidth;
  const side = r * Math.SQRT2;
  for (const rotation of [0, Math.PI / 4]) {
    c.save();
    c.translate(x, y);
    c.rotate(rotation);
    c.strokeRect(-side / 2, -side / 2, side, side);
    c.restore();
  }
}

function rosette(c: CanvasRenderingContext2D, x: number, y: number, r: number, petals: number, lineWidth: number, ink: string) {
  c.strokeStyle = ink;
  c.lineWidth = lineWidth;
  for (let i = 0; i < petals; i++) {
    const a = (i * Math.PI * 2) / petals;
    c.beginPath();
    c.ellipse(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.5, r * 0.19, a, 0, Math.PI * 2);
    c.stroke();
  }
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.stroke();
}

function diamondBand(c: CanvasRenderingContext2D, w: number, h: number, margin: number, step: number, size: number, ink: string) {
  c.fillStyle = ink;
  const dot = (x: number, y: number) => {
    c.save();
    c.translate(x, y);
    c.rotate(Math.PI / 4);
    c.fillRect(-size / 2, -size / 2, size, size);
    c.restore();
  };
  const nx = Math.max(2, Math.round((w - margin * 2) / step));
  const ny = Math.max(2, Math.round((h - margin * 2) / step));
  for (let i = 0; i <= nx; i++) {
    const x = margin + ((w - margin * 2) * i) / nx;
    dot(x, margin);
    dot(x, h - margin);
  }
  for (let i = 1; i < ny; i++) {
    const y = margin + ((h - margin * 2) * i) / ny;
    dot(margin, y);
    dot(w - margin, y);
  }
}

function gilded(w: number, h: number, base: string, paint: Painter, seed: number) {
  const colour = makeCanvas(w, h);
  const cc = colour.getContext("2d")!;
  cc.fillStyle = base;
  cc.fillRect(0, 0, w, h);
  grain(cc, w, h, 0.07, seed);
  paint(cc, w, h, GOLD);
  const surface = makeCanvas(w, h);
  const sc = surface.getContext("2d")!;
  sc.fillStyle = MATTE_FILL;
  sc.fillRect(0, 0, w, h);
  paint(sc, w, h, METAL_INK);
  return { map: toTexture(colour, true), orm: toTexture(surface, false) };
}

export type Gilded = ReturnType<typeof gilded>;

export function disposeGilded(g: Gilded) {
  g.map.dispose();
  g.orm.dispose();
}

/** Front board of a shelf book: geometric frame with a plain Latin title. */
export function bookCoverTexture(base: string, title: string, seed: number) {
  return gilded(
    512,
    720,
    base,
    (c, w, h, ink) => {
      frame(c, w, h, 26, 7, ink);
      frame(c, w, h, 44, 2, ink);
      diamondBand(c, w, h, 62, 30, 7, ink);
      frame(c, w, h, 80, 3, ink);
      const cx = w / 2;
      star8(c, cx, 190, 62, 3, ink);
      rosette(c, cx, 190, 34, 8, 2, ink);
      star8(c, cx, h - 190, 62, 3, ink);
      rosette(c, cx, h - 190, 34, 8, 2, ink);
      for (const [x, y] of [[112, 112], [w - 112, 112], [112, h - 112], [w - 112, h - 112]]) star8(c, x, y, 17, 2, ink);
      c.fillStyle = ink;
      c.textAlign = "center";
      c.textBaseline = "middle";
      const lines = title.split(" ");
      c.font = `600 ${lines.length > 1 ? 58 : 66}px Georgia, "Times New Roman", serif`;
      lines.forEach((line, i) => c.fillText(line, cx, h / 2 + (i - (lines.length - 1) / 2) * 68));
      c.fillRect(cx - 90, h / 2 - (lines.length * 68) / 2 - 16, 180, 2.5);
      c.fillRect(cx - 90, h / 2 + (lines.length * 68) / 2 + 12, 180, 2.5);
    },
    seed,
  );
}

export function bookSpineTexture(base: string, title: string, seed: number) {
  return gilded(
    128,
    720,
    base,
    (c, w, h, ink) => {
      c.fillStyle = ink;
      for (const y of [44, 58, 150, h - 150, h - 58, h - 44]) c.fillRect(10, y, w - 20, y === 58 || y === h - 58 ? 6 : 2.5);
      star8(c, w / 2, 104, 22, 2.5, ink);
      star8(c, w / 2, h - 104, 22, 2.5, ink);
      c.save();
      c.translate(w / 2, h / 2);
      c.rotate(Math.PI / 2);
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.font = '600 44px Georgia, "Times New Roman", serif';
      c.fillText(title, 0, 2);
      c.restore();
    },
    seed,
  );
}

/** Quran cover: ornament only. Deliberately no calligraphy or lettering of any kind. */
export function quranCoverTexture(seed = 3) {
  return gilded(
    720,
    1024,
    "#173F33",
    (c, w, h, ink) => {
      frame(c, w, h, 30, 9, ink);
      frame(c, w, h, 54, 2.5, ink);
      diamondBand(c, w, h, 78, 34, 9, ink);
      frame(c, w, h, 102, 4, ink);
      frame(c, w, h, 118, 1.5, ink);
      const cx = w / 2;
      const cy = h / 2;
      c.strokeStyle = ink;
      c.lineWidth = 4;
      c.beginPath();
      c.ellipse(cx, cy, 190, 285, 0, 0, Math.PI * 2);
      c.stroke();
      c.lineWidth = 1.5;
      c.beginPath();
      c.ellipse(cx, cy, 176, 270, 0, 0, Math.PI * 2);
      c.stroke();
      star8(c, cx, cy, 128, 4, ink);
      rosette(c, cx, cy, 96, 12, 2.5, ink);
      rosette(c, cx, cy, 44, 8, 2, ink);
      for (const y of [cy - 345, cy + 345]) {
        star8(c, cx, y, 40, 3, ink);
        rosette(c, cx, y, 22, 8, 1.5, ink);
      }
      for (const [x, y] of [[158, 158], [w - 158, 158], [158, h - 158], [w - 158, h - 158]]) {
        star8(c, x, y, 36, 3, ink);
        rosette(c, x, y, 20, 8, 1.5, ink);
      }
    },
    seed,
  );
}

export function quranSpineTexture(seed = 5) {
  return gilded(
    160,
    1024,
    "#173F33",
    (c, w, h, ink) => {
      c.fillStyle = ink;
      for (const y of [70, 88, 300, 318, h - 318, h - 300, h - 88, h - 70]) c.fillRect(0, y, w, 5);
      star8(c, w / 2, h / 2, 40, 3, ink);
      star8(c, w / 2, 194, 30, 2.5, ink);
      star8(c, w / 2, h - 194, 30, 2.5, ink);
    },
    seed,
  );
}

/** A clean leaf: paper tone and a ruled border only, so no sacred text is ever imitated. */
export function pageTexture() {
  const canvas = makeCanvas(512, 720);
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#F7F0DE";
  c.fillRect(0, 0, 512, 720);
  grain(c, 512, 720, 0.03, 11);
  const shade = c.createLinearGradient(0, 0, 512, 0);
  shade.addColorStop(0, "rgba(120,96,60,0.30)");
  shade.addColorStop(0.16, "rgba(120,96,60,0.05)");
  shade.addColorStop(1, "rgba(120,96,60,0)");
  c.fillStyle = shade;
  c.fillRect(0, 0, 512, 720);
  frame(c, 512, 720, 46, 4, "#B08D4C");
  frame(c, 512, 720, 58, 1, "#B99A5E");
  return toTexture(canvas, true);
}

/** Fore-edge and head/tail of a page block: fine lines that follow the leaves. */
export function pageEdgeTexture() {
  const canvas = makeCanvas(64, 256);
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#F4ECD8";
  c.fillRect(0, 0, 64, 256);
  const rnd = seeded(23);
  for (let y = 0; y < 256; y += 3) {
    c.fillStyle = `rgba(140,116,78,${0.06 + rnd() * 0.14})`;
    c.fillRect(0, y, 64, 1);
  }
  const texture = toTexture(canvas, true);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function woodTexture() {
  const canvas = makeCanvas(512, 512);
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#4E2A17";
  c.fillRect(0, 0, 512, 512);
  const rnd = seeded(41);
  for (let i = 0; i < 150; i++) {
    const y = rnd() * 512;
    c.strokeStyle = rnd() > 0.5 ? `rgba(40,20,10,${0.08 + rnd() * 0.2})` : `rgba(180,120,80,${0.05 + rnd() * 0.12})`;
    c.lineWidth = 0.6 + rnd() * 2.4;
    c.beginPath();
    c.moveTo(0, y);
    const drift = (rnd() - 0.5) * 26;
    c.bezierCurveTo(170, y + drift, 340, y - drift, 512, y + (rnd() - 0.5) * 10);
    c.stroke();
  }
  // Shallow carved star-and-rosette band, as on a traditional rehal.
  for (let x = 64; x < 512; x += 128) {
    for (const [ink, offset] of [["rgba(20,9,4,0.55)", 0], ["rgba(214,160,110,0.28)", 1.5]] as const) {
      star8(c, x + offset, 256 + offset, 44, 2.5, ink);
      rosette(c, x + offset, 256 + offset, 24, 8, 1.6, ink);
    }
  }
  for (const y of [176, 336]) {
    c.fillStyle = "rgba(20,9,4,0.5)";
    c.fillRect(0, y, 512, 2.5);
    c.fillStyle = "rgba(214,160,110,0.22)";
    c.fillRect(0, y + 2.5, 512, 1.2);
  }
  const texture = toTexture(canvas, true);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** Soft contact shadow used instead of real-time shadow maps under each object. */
export function blobShadowTexture() {
  const canvas = makeCanvas(256, 256);
  const c = canvas.getContext("2d")!;
  const g = c.createRadialGradient(128, 128, 8, 128, 128, 128);
  g.addColorStop(0, "rgba(20,16,12,0.55)");
  g.addColorStop(0.55, "rgba(20,16,12,0.16)");
  g.addColorStop(1, "rgba(20,16,12,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, 256, 256);
  return toTexture(canvas, true);
}
