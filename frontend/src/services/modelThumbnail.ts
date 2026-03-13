import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

function getModelExt(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : "";
}

function supportsThumbnailCapture(fileName: string): boolean {
  const ext = getModelExt(fileName);
  return ext === "glb" || ext === "gltf";
}

export async function captureModelThumbnail(file: File): Promise<Blob | null> {
  if (!supportsThumbnailCapture(file.name)) {
    return null;
  }

  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(size, size, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#dbe6f2");

  const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 1000);

  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.25);
  keyLight.position.set(3, 4, 6);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.55);
  fillLight.position.set(-4, 2, -3);
  scene.add(fillLight);

  const objectUrl = URL.createObjectURL(file);
  try {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(objectUrl);
    const model = gltf.scene;
    scene.add(model);

    const box = new THREE.Box3().setFromObject(model);
    if (!box.isEmpty()) {
      const center = new THREE.Vector3();
      const modelSize = new THREE.Vector3();
      box.getCenter(center);
      box.getSize(modelSize);

      model.position.sub(center);

      const radius = Math.max(modelSize.length() * 0.5, 0.5);
      const fov = THREE.MathUtils.degToRad(camera.fov);
      const distance = radius / Math.sin(fov / 2);

      camera.position.set(distance * 0.75, distance * 0.55, distance * 0.95);
      camera.lookAt(0, 0, 0);
    } else {
      camera.position.set(2.5, 1.8, 2.8);
      camera.lookAt(0, 0, 0);
    }

    renderer.render(scene, camera);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((nextBlob) => resolve(nextBlob), "image/webp", 0.92);
    });
    return blob;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
    renderer.dispose();
  }
}
