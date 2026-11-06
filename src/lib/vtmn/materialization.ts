import { clamp, smoothstep, type CubeTiming } from "./timeline";

export interface MaterializationPlan {
  ignite: number;
  shell: number;
  solid: number;
  launch: number;
  arrive: number;
  variation: number;
}
export interface MaterializationState {
  present: boolean;
  growth: number;
  matter: number;
  travel: number;
  ignition: number;
}
export function materializationPlan(
  cell: { h: number; layer: number },
  ch: CubeTiming,
): MaterializationPlan {
  const ignite = ch.tActivate + cell.layer * 0.018;
  const shell = ignite + 0.055;
  const solid = shell + 0.15 + cell.h * 0.09 + cell.layer * 0.012;
  return { ignite, shell, solid, launch: solid - 0.018, arrive: ch.tArrive, variation: cell.h };
}
export function materializationAt(
  plan: MaterializationPlan,
  t: number,
  out: MaterializationState = { present: false, growth: 0, matter: 0, travel: 0, ignition: 0 },
): MaterializationState {
  out.present = t >= plan.ignite;
  out.growth = smoothstep(plan.shell, plan.solid, t);
  out.matter = smoothstep(plan.shell + 0.065, plan.solid, t);
  out.travel = clamp((t - plan.launch) / (plan.arrive - plan.launch));
  const age = t - plan.ignite;
  out.ignition = out.present
    ? Math.exp(-Math.pow((age - 0.035) / 0.065, 2)) +
      0.3 * (1 - out.matter) * (1 - smoothstep(0.1, 0.4, age))
    : 0;
  return out;
}
