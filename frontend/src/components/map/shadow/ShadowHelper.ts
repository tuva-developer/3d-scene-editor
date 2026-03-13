import * as THREE from "three";
// @ts-ignore
import * as SunCalc from "suncalc";

export function createSunLightArrow(dir: THREE.Vector3, scaleUnit: number): THREE.ArrowHelper {
  const length = 3000;
  const arrow = new THREE.ArrowHelper(
    new THREE.Vector3(dir.x, dir.y, 0).normalize(),
    new THREE.Vector3(4096, 4096, 0),
    length,
    0xff0000,
    400,
    400
  );
  arrow.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (child.material) {
        child.material.depthTest = false;
        child.material.depthWrite = false;
      }
    }
  });
  arrow.position.z = 50;
  arrow.scale.set(1, -1, 1 / scaleUnit);
  return arrow;
}

export function calculateSunDirectionMaplibre(
  altitude: number,
  azimuth: number,
  out?: THREE.Vector3,
): THREE.Vector3 {
  const dir = out ?? new THREE.Vector3(0, -1, 0);
  dir.x = -Math.sin(azimuth) * Math.cos(altitude);
  dir.y = Math.cos(azimuth) * Math.cos(altitude);
  dir.z = Math.sin(altitude);
  return dir.normalize();
}

export function getSunPosition(lat: number, lon: number) {
  return getSunPositionAt(lat, lon, new Date());
}

export function getSunPositionAt(lat: number, lon: number, date: Date) {
  const sunPos = SunCalc.getPosition(date, lat, lon);
  return {
    altitude: sunPos.altitude * (180 / Math.PI),
    azimuth: sunPos.azimuth * (180 / Math.PI) + 180,
    altitudeRad: sunPos.altitude,
    azimuthRad: sunPos.azimuth,
  };
}

export interface TimeOfDayColors {
  lightColor: THREE.Color;
  skyColor: THREE.Color;
  groundColor: THREE.Color;
  shadowColor: THREE.Color;
  ambient: number;
  diffuseIntensity: number;
}

function lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return new THREE.Color().lerpColors(a, b, t);
}

export function getTimeOfDayColors(altitudeDeg: number, source: "sun" | "moon" = "sun"): TimeOfDayColors {
  if (source === "moon") {
    return {
      lightColor: new THREE.Color(0.4, 0.45, 0.6),
      skyColor: new THREE.Color(0.15, 0.15, 0.25),
      groundColor: new THREE.Color(0.08, 0.08, 0.12),
      shadowColor: new THREE.Color(0.1, 0.1, 0.15),
      ambient: 0.3,
      diffuseIntensity: 0.2,
    };
  }

  const night = {
    light: new THREE.Color(0.3, 0.3, 0.45),
    sky: new THREE.Color(0.15, 0.15, 0.25),
    ground: new THREE.Color(0.08, 0.08, 0.12),
    shadow: new THREE.Color(0.1, 0.1, 0.15),
    ambient: 0.3,
    diffuse: 0.15,
  };
  const dawn = {
    light: new THREE.Color(1.0, 0.6, 0.3),
    sky: new THREE.Color(0.9, 0.55, 0.35),
    ground: new THREE.Color(0.5, 0.35, 0.25),
    shadow: new THREE.Color(0.4, 0.3, 0.35),
    ambient: 0.55,
    diffuse: 0.6,
  };
  const morning = {
    light: new THREE.Color(1.0, 0.85, 0.65),
    sky: new THREE.Color(0.75, 0.8, 0.9),
    ground: new THREE.Color(0.55, 0.5, 0.45),
    shadow: new THREE.Color(0.45, 0.42, 0.48),
    ambient: 0.7,
    diffuse: 0.85,
  };
  const midday = {
    light: new THREE.Color(1.0, 0.96, 0.88),
    sky: new THREE.Color(0.85, 0.85, 0.87),
    ground: new THREE.Color(0.6, 0.58, 0.56),
    shadow: new THREE.Color(0.5, 0.5, 0.52),
    ambient: 0.8,
    diffuse: 1,
  };

  let a = night;
  let b = night;
  let t = 0;

  if (altitudeDeg > 0 && altitudeDeg <= 6) {
    b = dawn;
    t = altitudeDeg / 6;
  } else if (altitudeDeg <= 20) {
    a = dawn;
    b = morning;
    t = Math.max(0, altitudeDeg - 6) / 14;
  } else if (altitudeDeg <= 40) {
    a = morning;
    b = midday;
    t = (altitudeDeg - 20) / 20;
  } else if (altitudeDeg > 40) {
    a = midday;
    b = midday;
  }

  return {
    lightColor: lerpColor(a.light, b.light, t),
    skyColor: lerpColor(a.sky, b.sky, t),
    groundColor: lerpColor(a.ground, b.ground, t),
    shadowColor: lerpColor(a.shadow, b.shadow, t),
    ambient: a.ambient + (b.ambient - a.ambient) * t,
    diffuseIntensity: a.diffuse + (b.diffuse - a.diffuse) * t,
  };
}

export function buildShadowMatrix(sunDir: THREE.Vector3, planeZ: number, out: THREE.Matrix4) {
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -planeZ);
  const lightDir = sunDir.clone().normalize();
  const lightPos4D = new THREE.Vector4(-lightDir.x, -lightDir.y, -lightDir.z, 0);
  const dot =
    plane.normal.dot(new THREE.Vector3(lightPos4D.x, lightPos4D.y, lightPos4D.z)) - plane.constant * lightPos4D.w;
  const m = out.elements;

  m[0] = dot - lightPos4D.x * plane.normal.x;
  m[4] = -lightPos4D.x * plane.normal.y;
  m[8] = -lightPos4D.x * plane.normal.z;
  m[12] = -lightPos4D.x * -plane.constant;

  m[1] = -lightPos4D.y * plane.normal.x;
  m[5] = dot - lightPos4D.y * plane.normal.y;
  m[9] = -lightPos4D.y * plane.normal.z;
  m[13] = -lightPos4D.y * -plane.constant;

  m[2] = -lightPos4D.z * plane.normal.x;
  m[6] = -lightPos4D.z * plane.normal.y;
  m[10] = dot - lightPos4D.z * plane.normal.z;
  m[14] = -lightPos4D.z * -plane.constant;

  m[3] = -lightPos4D.w * plane.normal.x;
  m[7] = -lightPos4D.w * plane.normal.y;
  m[11] = -lightPos4D.w * plane.normal.z;
  m[15] = dot - lightPos4D.w * -plane.constant;
}
