/**
 * PixelDashSprites — pixel art customDraw functions for the Cubeforge Sprite component.
 *
 * Every function is defined at MODULE level (never inside a React render), so the
 * ECS receives a stable function reference and doesn't re-create the component on
 * every React render tick.
 *
 * All sprites are drawn on a virtual pixel grid.  The canvas context is pre-clipped
 * to [0,0,w,h] by the renderer, so we can fill freely.
 *
 * Palette (Pixel Jungle):
 *   ground / world  : #1a3a0a (dark jungle earth)
 *   explorer outfit : #4A7C59 (jungle green)
 *   skin            : #F5C07A
 *   hat             : #7B4A1E
 *   arm / accent    : #D4855A
 *   leg             : #3D2200
 *   log             : #8B4513 / #5A2D0C
 *   boulder         : #8A7A6A / #5A4A3A / #4A6A3A (moss)
 *   coin            : #FFD700 / #B8860B
 *   gate            : #6B3A08 / #4A2200
 */

// ─── Type alias ──────────────────────────────────────────────────────────────

export type DrawFn = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Draws a single "logical pixel" block at grid position (col, row). */
function px(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  size: number,
  colSpan = 1,
  rowSpan = 1,
): void {
  ctx.fillRect(col * size, row * size, size * colSpan, size * rowSpan);
}

// ─── Explorer — normal ───────────────────────────────────────────────────────
/**
 * Top-down explorer character (28×28).
 * Logical grid: 7×7, each cell = 4×4 canvas pixels.
 *
 *   Col: 0 1 2 3 4 5 6
 * Row 0:  . H H H H . .   hat brim
 * Row 1:  . H H H H . .   hat crown
 * Row 2:  . S S S S . .   head
 * Row 3:  . S E S E S .   head + eyes
 * Row 4:  A G G G G A .   body + arms
 * Row 5:  A G G G G A .   body
 * Row 6:  . L . . L . .   legs
 *
 * H=hat  S=skin  E=eye  G=outfit  A=arm  L=leg
 */
export const drawExplorer: DrawFn = (ctx, w, _h) => {
  ctx.imageSmoothingEnabled = false;
  const p = Math.floor(w / 7);

  // Hat
  ctx.fillStyle = '#7B4A1E';
  px(ctx, 1, 0, p, 4, 2); // brim + crown

  // Head
  ctx.fillStyle = '#F5C07A';
  px(ctx, 1, 2, p, 4, 2);

  // Eyes
  ctx.fillStyle = '#2A1500';
  px(ctx, 2, 3, p);
  px(ctx, 4, 3, p);

  // Arms
  ctx.fillStyle = '#D4855A';
  px(ctx, 0, 4, p, 1, 2); // left
  px(ctx, 5, 4, p, 1, 2); // right

  // Body
  ctx.fillStyle = '#4A7C59';
  px(ctx, 1, 4, p, 4, 2);

  // Belt line
  ctx.fillStyle = '#2A4A32';
  px(ctx, 1, 5, p, 4, 1);

  // Legs
  ctx.fillStyle = '#3D2200';
  px(ctx, 1, 6, p);
  px(ctx, 3, 6, p);
};

// ─── Explorer — streak (fire mode) ───────────────────────────────────────────
/**
 * Same as drawExplorer but the outfit glows amber/orange to show the streak fire.
 */
export const drawExplorerStreak: DrawFn = (ctx, w, _h) => {
  ctx.imageSmoothingEnabled = false;
  const p = Math.floor(w / 7);

  // Glow aura behind the character
  ctx.fillStyle = 'rgba(255, 140, 0, 0.25)';
  ctx.fillRect(0, 0, w, w);

  // Hat
  ctx.fillStyle = '#7B4A1E';
  px(ctx, 1, 0, p, 4, 2);

  // Head
  ctx.fillStyle = '#F5C07A';
  px(ctx, 1, 2, p, 4, 2);

  // Eyes (glowing amber in streak)
  ctx.fillStyle = '#FF8C00';
  px(ctx, 2, 3, p);
  px(ctx, 4, 3, p);

  // Arms (flame orange)
  ctx.fillStyle = '#FF6A00';
  px(ctx, 0, 4, p, 1, 2);
  px(ctx, 5, 4, p, 1, 2);

  // Body (fire amber instead of green)
  ctx.fillStyle = '#FF8C00';
  px(ctx, 1, 4, p, 4, 2);

  // Belt
  ctx.fillStyle = '#CC5500';
  px(ctx, 1, 5, p, 4, 1);

  // Legs
  ctx.fillStyle = '#3D2200';
  px(ctx, 1, 6, p);
  px(ctx, 3, 6, p);
};

// ─── Fallen log ──────────────────────────────────────────────────────────────
/**
 * A fallen log seen from above (26×26).
 * Shows the cylindrical shape with end-grain circles at each end and bark lines.
 */
export const drawLog: DrawFn = (ctx, w, h) => {
  ctx.imageSmoothingEnabled = false;

  const bodyTop = Math.floor(h * 0.2);
  const bodyH = Math.floor(h * 0.6);

  // Log body
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(0, bodyTop, w, bodyH);

  // Dark bark shadow strip (bottom half of body)
  ctx.fillStyle = '#5A2D0C';
  ctx.fillRect(0, bodyTop + Math.floor(bodyH * 0.55), w, Math.floor(bodyH * 0.45));

  // Bark highlight strip (top)
  ctx.fillStyle = '#A05720';
  ctx.fillRect(0, bodyTop, w, Math.floor(bodyH * 0.18));

  // Vertical bark grain lines
  ctx.fillStyle = '#6B3510';
  for (let x = Math.floor(w * 0.25); x < w; x += Math.floor(w * 0.22)) {
    ctx.fillRect(x, bodyTop, 2, bodyH);
  }

  // Left end-grain (circular rings)
  const lx = Math.floor(w * 0.12);
  const cy = Math.floor(h / 2);
  const r1 = Math.floor(w * 0.11);
  const r2 = Math.floor(w * 0.06);
  ctx.strokeStyle = '#4A1E00';
  ctx.lineWidth = 1.5;
  for (const r of [r1, r2]) {
    ctx.beginPath();
    ctx.arc(lx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Fill center dot
  ctx.fillStyle = '#3A1500';
  ctx.beginPath();
  ctx.arc(lx, cy, 2, 0, Math.PI * 2);
  ctx.fill();

  // Right end-grain
  const rx = Math.floor(w * 0.88);
  ctx.strokeStyle = '#4A1E00';
  ctx.lineWidth = 1.5;
  for (const r of [r1, r2]) {
    ctx.beginPath();
    ctx.arc(rx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#3A1500';
  ctx.beginPath();
  ctx.arc(rx, cy, 2, 0, Math.PI * 2);
  ctx.fill();
};

// ─── Mossy boulder ───────────────────────────────────────────────────────────
/**
 * A mossy boulder seen from above (26×26).
 * Round gray rock with cracks and green moss patches.
 */
export const drawBoulder: DrawFn = (ctx, w, h) => {
  ctx.imageSmoothingEnabled = false;

  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2 - 2;
  const ry = h / 2 - 2;

  // Main rock body (gray)
  ctx.fillStyle = '#8A7A6A';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // Shadow side (darker, offset)
  ctx.fillStyle = '#5A4A3A';
  ctx.beginPath();
  ctx.ellipse(cx + rx * 0.2, cy + ry * 0.3, rx * 0.55, ry * 0.35, Math.PI / 5, 0, Math.PI * 2);
  ctx.fill();

  // Highlight (lighter top-left)
  ctx.fillStyle = '#AA9A8A';
  ctx.beginPath();
  ctx.ellipse(cx - rx * 0.25, cy - ry * 0.25, rx * 0.35, ry * 0.3, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  // Moss patches
  ctx.fillStyle = '#4A6A3A';
  ctx.beginPath();
  ctx.ellipse(cx - rx * 0.3, cy + ry * 0.1, rx * 0.22, ry * 0.16, Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + rx * 0.15, cy - ry * 0.35, rx * 0.16, ry * 0.12, -Math.PI / 5, 0, Math.PI * 2);
  ctx.fill();

  // Crack lines
  ctx.strokeStyle = '#3A2A1A';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - rx * 0.1, cy - ry * 0.4);
  ctx.lineTo(cx + rx * 0.05, cy);
  ctx.lineTo(cx - rx * 0.05, cy + ry * 0.35);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + rx * 0.3, cy - ry * 0.2);
  ctx.lineTo(cx + rx * 0.25, cy + ry * 0.2);
  ctx.stroke();
};

// ─── Jungle floor background tile ────────────────────────────────────────────
/**
 * Scrolling jungle floor texture (full canvas w × h).
 * Two copies of this tile (A and B) scroll downward via the same stripeScript
 * used by the lane dividers — giving the sense of running forward.
 *
 * The texture draws:
 *   - Dark earth base (#1a3a0a) — same as World background so no seam
 *   - Lighter-green "path" strips in each of the three lane positions
 *   - Scattered grass tufts and leaf-shadow blobs for visual interest
 *   - Small pebble dots for ground texture
 *
 * Lane positions are estimated at 12.5 %, 37.5 %, 62.5 %, 87.5 % of w
 * (four equal quarters, paths sit in the middle of each quarter).
 */
export const drawJungleFloor: DrawFn = (ctx, w, h) => {
  ctx.imageSmoothingEnabled = false;

  // ── Base earth ──────────────────────────────────────────────────────────────
  ctx.fillStyle = '#1a3a0a';
  ctx.fillRect(0, 0, w, h);

  // ── Subtle lane paths (slightly lighter green) ──────────────────────────────
  const quarter = w / 4;
  ctx.fillStyle = '#224510';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(Math.floor(i * quarter + quarter * 0.15), 0, Math.floor(quarter * 0.7), h);
  }

  // ── Grass tufts — deterministic positions based on row bands ───────────────
  // We tile this texture every 120px vertically, so repeating the same pattern
  // is fine — it looks like a scrolling jungle floor.
  const tufts = [
    { x: 0.05, y: 0.07 }, { x: 0.08, y: 0.28 }, { x: 0.03, y: 0.55 }, { x: 0.07, y: 0.82 },
    { x: 0.93, y: 0.12 }, { x: 0.96, y: 0.4 },  { x: 0.92, y: 0.67 }, { x: 0.97, y: 0.9 },
    { x: 0.24, y: 0.18 }, { x: 0.26, y: 0.52 }, { x: 0.23, y: 0.78 },
    { x: 0.50, y: 0.09 }, { x: 0.51, y: 0.44 }, { x: 0.49, y: 0.71 },
    { x: 0.75, y: 0.22 }, { x: 0.74, y: 0.58 }, { x: 0.76, y: 0.86 },
  ];
  ctx.fillStyle = '#2d6015';
  for (const t of tufts) {
    const tx = t.x * w;
    const ty = t.y * h;
    ctx.fillRect(tx - 4, ty, 8, 3);   // blade base
    ctx.fillRect(tx - 2, ty - 3, 5, 3); // blade mid
    ctx.fillRect(tx, ty - 6, 2, 3);   // blade tip
  }

  // ── Leaf shadow blobs (slightly darker, irregular ellipses) ─────────────────
  const shadows = [
    { x: 0.05, y: 0.18, rx: 9, ry: 5 }, { x: 0.94, y: 0.35, rx: 11, ry: 6 },
    { x: 0.06, y: 0.65, rx: 8,  ry: 5 }, { x: 0.93, y: 0.78, rx: 10, ry: 5 },
    { x: 0.25, y: 0.42, rx: 7,  ry: 4 }, { x: 0.75, y: 0.7,  rx: 8,  ry: 4 },
  ];
  ctx.fillStyle = '#112608';
  for (const s of shadows) {
    ctx.beginPath();
    ctx.ellipse(s.x * w, s.y * h, s.rx, s.ry, Math.PI / 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Pebble dots for ground texture ──────────────────────────────────────────
  const pebbles = [
    { x: 0.11, y: 0.33 }, { x: 0.13, y: 0.7 }, { x: 0.87, y: 0.18 },
    { x: 0.89, y: 0.6 },  { x: 0.36, y: 0.25 }, { x: 0.62, y: 0.8 },
  ];
  ctx.fillStyle = '#162e08';
  for (const p of pebbles) {
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
};

// ─── Gold jungle coin ────────────────────────────────────────────────────────
/**
 * Gold artifact coin (14×14).
 * Glowing gold disc with a star emblem and specular highlight.
 */
export const drawCoin: DrawFn = (ctx, w, h) => {
  ctx.imageSmoothingEnabled = false;

  const cx = w / 2;
  const cy = h / 2;
  const r = w / 2 - 1;

  // Outer ring (darker gold)
  ctx.fillStyle = '#B8860B';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Inner disc (bright gold)
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
  ctx.fill();

  // Star emblem in centre
  ctx.fillStyle = '#CC9900';
  const starR = r * 0.38;
  const points = 5;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const dist = i % 2 === 0 ? starR : starR * 0.45;
    const sx = cx + Math.cos(angle) * dist;
    const sy = cy + Math.sin(angle) * dist;
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.closePath();
  ctx.fill();

  // Specular highlight (top-left shine)
  ctx.fillStyle = 'rgba(255, 255, 180, 0.75)';
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.3, cy - r * 0.3, r * 0.22, r * 0.16, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();
};

// ─── Bamboo gate bar ─────────────────────────────────────────────────────────
/**
 * Full-width bamboo gate bar (w × 10).
 * Tiled bamboo segments with node knuckles and a vine strand.
 */
export const drawGateBar: DrawFn = (ctx, w, h) => {
  ctx.imageSmoothingEnabled = false;

  // Base wood colour
  ctx.fillStyle = '#6B3A08';
  ctx.fillRect(0, 0, w, h);

  // Highlight along top edge
  ctx.fillStyle = '#9B5A18';
  ctx.fillRect(0, 0, w, 2);

  // Shadow along bottom edge
  ctx.fillStyle = '#3A1800';
  ctx.fillRect(0, h - 2, w, 2);

  // Bamboo segment nodes (vertical knuckles every ~32px)
  const seg = 32;
  ctx.fillStyle = '#4A2200';
  for (let x = seg; x < w; x += seg) {
    ctx.fillRect(x - 2, 0, 4, h);
    // Node highlight
    ctx.fillStyle = '#7B4A10';
    ctx.fillRect(x - 1, 1, 2, 2);
    ctx.fillStyle = '#4A2200';
  }

  // Single vine strand across the bar
  ctx.strokeStyle = '#2A5A10';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 10]);
  ctx.beginPath();
  ctx.moveTo(0, Math.floor(h * 0.65));
  ctx.lineTo(w, Math.floor(h * 0.65));
  ctx.stroke();
  ctx.setLineDash([]);
};
