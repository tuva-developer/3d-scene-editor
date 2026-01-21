import * as THREE from "three";

export function calculateSunDirectionMaplibre(altitude: number, azimuth: number): THREE.Vector3 {
  const dir = new THREE.Vector3(0, -1, 0);
  dir.x = -Math.sin(azimuth) * Math.cos(altitude);
  dir.y = Math.cos(azimuth) * Math.cos(altitude);
  dir.z = Math.sin(altitude);
  return dir.normalize();
}
