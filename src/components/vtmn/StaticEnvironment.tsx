import { useEffect, useMemo } from "react";
import { createReflectiveFloor } from "./reflective-floor";
import { createPlasmaAtmosphere } from "./plasma-atmosphere";

/** Fixed world-space scenery; the Reflector captures in onBeforeRender after
 * the existing scene stepper has updated the camera, cubes and electrical FX. */
export function StaticEnvironment({ charge }: { charge?: { value: number } } = {}) {
  const floor = useMemo(() => createReflectiveFloor(), []);
  const sky = useMemo(() => createPlasmaAtmosphere(charge), [charge]);
  useEffect(
    () => () => {
      floor.geometry.dispose();
      floor.dispose();
    },
    [floor],
  );
  useEffect(
    () => () => {
      sky.geometry.dispose();
      sky.material.dispose();
    },
    [sky],
  );
  return (
    <>
      <primitive object={sky} />
      <primitive object={floor} />
    </>
  );
}
