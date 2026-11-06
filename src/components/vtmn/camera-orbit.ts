import * as THREE from "three";
import { sampleCameraInto, type CameraRig, type CameraSample } from "@/lib/vtmn/timeline";

export function cameraOrbitScratch() {
  return {
    sample: { pos: [0, 0, 0], look: [0, 0, 0], fov: 36, roll: 0 } as CameraSample,
    world: new THREE.Vector3(),
    local: new THREE.Vector3(),
    target: new THREE.Vector3(),
  };
}
/** Place the camera in world space. Never mutate the subject or its parent scene. */
export function applyCameraOrbit(
  camera: THREE.PerspectiveCamera,
  rig: CameraRig,
  t: number,
  scratch: ReturnType<typeof cameraOrbitScratch>,
  fovPaddingDegrees = 0,
) {
  sampleCameraInto(rig, t, scratch.sample);
  scratch.world.fromArray(scratch.sample.pos);
  scratch.target.fromArray(scratch.sample.look);
  if (camera.parent) {
    camera.parent.updateWorldMatrix(true, false);
    scratch.local.copy(scratch.world);
    camera.parent.worldToLocal(scratch.local);
    camera.position.copy(scratch.local);
  } else camera.position.copy(scratch.world);
  camera.up.set(0, 1, 0);
  camera.lookAt(scratch.target);
  camera.rotateZ(scratch.sample.roll);
  const fov = scratch.sample.fov + fovPaddingDegrees;
  if (camera.fov !== fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  camera.updateWorldMatrix(true, false);
}
