// Toán thuần cho quả cầu 3D ở trang chủ (không phụ thuộc React/DOM, dễ kiểm thử).
// Quy ước: đơn vị = bán kính quả cầu; x sang phải, y lên trên, z hướng về phía người xem.

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Ring {
  /** Bán kính quỹ đạo theo trục x / z (đơn vị = bán kính quả cầu). */
  rx: number;
  rz: number;
  /** Góc nghiêng quanh trục X / Z (rad). */
  tiltX: number;
  tiltZ: number;
  /** Tốc độ góc (rad/giây), dấu âm = quay ngược chiều. */
  speed: number;
  /** Pha ban đầu (rad) để các quỹ đạo không trùng nhau. */
  phase: number;
}

/** Rải n điểm gần đều lên mặt cầu đơn vị (Fibonacci sphere). */
export function fibonacciSphere(n: number): Vec3[] {
  const pts: Vec3[] = [];
  if (n <= 0) return pts;
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = n === 1 ? 0 : 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    pts.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r });
  }
  return pts;
}

export function rotateY(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
}

export function rotateX(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
}

export function rotateZ(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c, z: p.z };
}

/** Điểm trên quỹ đạo ở góc theta (đã nghiêng). */
export function ringPoint(ring: Ring, theta: number): Vec3 {
  const flat: Vec3 = {
    x: Math.cos(theta) * ring.rx,
    y: 0,
    z: Math.sin(theta) * ring.rz,
  };
  return rotateZ(rotateX(flat, ring.tiltX), ring.tiltZ);
}

/**
 * Chia n thẻ cho các quỹ đạo theo vòng tròn (thẻ i -> quỹ đạo i % số quỹ đạo),
 * trả về chỉ số quỹ đạo, thứ tự của thẻ trong quỹ đạo đó và số thẻ của quỹ đạo.
 */
export function assignToRing(
  index: number,
  total: number,
  ringCount: number,
): { ring: number; slot: number; slots: number } {
  const ring = index % ringCount;
  const slot = Math.floor(index / ringCount);
  const slots = Math.ceil((total - ring) / ringCount);
  return { ring, slot, slots: Math.max(1, slots) };
}

export interface Projected {
  x: number;
  y: number;
  /** Hệ số phóng theo phối cảnh (>1 là gần người xem). */
  scale: number;
  /** 0 (xa nhất) .. 1 (gần nhất), dùng cho độ mờ/thứ tự lớp. */
  depth: number;
}

/**
 * Chiếu phối cảnh một điểm 3D lên màn hình.
 * radiusPx: bán kính quả cầu theo pixel; extent: |z| lớn nhất có thể có (để chuẩn hoá depth).
 */
export function project(
  p: Vec3,
  cx: number,
  cy: number,
  radiusPx: number,
  extent: number,
  focal = 6,
): Projected {
  const scale = focal / (focal - p.z);
  const depth = Math.min(1, Math.max(0, (p.z + extent) / (2 * extent)));
  return {
    x: cx + p.x * radiusPx * scale,
    y: cy - p.y * radiusPx * scale,
    scale,
    depth,
  };
}
