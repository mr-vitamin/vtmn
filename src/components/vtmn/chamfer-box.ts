import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three";

/** Six flats, twelve small edge facets and eight corner facets: 44 shared
 * triangles, not a dense rounded-box tessellation for every instance. */
export function chamferBox(width: number, height: number, depth: number) {
  const half = [width / 2, height / 2, depth / 2];
  const bevel = Math.min(width, height, depth) * 0.022;
  const positions: number[] = [],
    normals: number[] = [],
    uvs: number[] = [];
  const cross = new Vector3(),
    edge = new Vector3();
  function polygon(points: Vector3[], outward: Vector3) {
    outward.normalize();
    cross.subVectors(points[1]!, points[0]!);
    edge.subVectors(points[2]!, points[0]!);
    if (cross.cross(edge).dot(outward) < 0) points.reverse();
    // Project UVs onto the dominant flat. Ties favor Z for the white finale's
    // front/rear edge facets, while the original seam/shell shader stays usable.
    let axis = 0;
    for (let k = 1; k < 3; k++)
      if (Math.abs(outward.getComponent(k)) >= Math.abs(outward.getComponent(axis))) axis = k;
    const u = (axis + 1) % 3,
      v = (axis + 2) % 3;
    for (let i = 1; i < points.length - 1; i++) {
      for (const p of [points[0]!, points[i]!, points[i + 1]!]) {
        positions.push(p.x, p.y, p.z);
        normals.push(outward.x, outward.y, outward.z);
        uvs.push(
          p.getComponent(u) / (2 * half[u]!) + 0.5,
          p.getComponent(v) / (2 * half[v]!) + 0.5,
        );
      }
    }
  }
  for (let axis = 0; axis < 3; axis++) {
    const u = (axis + 1) % 3,
      v = (axis + 2) % 3;
    for (const sign of [-1, 1]) {
      const points = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ].map(([su, sv]) => {
        const p = new Vector3();
        p.setComponent(axis, sign * half[axis]!);
        p.setComponent(u, su! * (half[u]! - bevel));
        p.setComponent(v, sv! * (half[v]! - bevel));
        return p;
      });
      polygon(points, new Vector3().setComponent(axis, sign));
    }
    for (const su of [-1, 1])
      for (const sv of [-1, 1]) {
        const points = [
          [-1, 0],
          [1, 0],
          [1, 1],
          [-1, 1],
        ].map(([end, side]) => {
          const p = new Vector3();
          p.setComponent(axis, end! * (half[axis]! - bevel));
          p.setComponent(u, su * (half[u]! - (side ? bevel : 0)));
          p.setComponent(v, sv * (half[v]! - (side ? 0 : bevel)));
          return p;
        });
        polygon(points, new Vector3().setComponent(u, su).setComponent(v, sv));
      }
  }
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      for (const sz of [-1, 1]) {
        polygon(
          [
            new Vector3(sx * half[0]!, sy * (half[1]! - bevel), sz * (half[2]! - bevel)),
            new Vector3(sx * (half[0]! - bevel), sy * half[1]!, sz * (half[2]! - bevel)),
            new Vector3(sx * (half[0]! - bevel), sy * (half[1]! - bevel), sz * half[2]!),
          ],
          new Vector3(sx, sy, sz),
        );
      }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
