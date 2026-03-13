import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { AssetDto } from "@/services/assetService";
import { apiRequest } from "@/services/apiClient";

type ModelPreviewModalProps = {
  asset: AssetDto;
  onClose: () => void;
};

export default function ModelPreviewModal({ asset, onClose }: ModelPreviewModalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let rafId = 0;
    let cancelled = false;
    let objectUrlToRevoke: string | null = null;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0f172a");

    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 2000);
    camera.position.set(2, 1.6, 2);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x334155, 1.2);
    scene.add(hemiLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(4, 6, 4);
    scene.add(dirLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;

    const resize = () => {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const clearObject = (root: THREE.Object3D) => {
      root.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) {
          return;
        }
        child.geometry.dispose();
        const material = child.material;
        if (Array.isArray(material)) {
          material.forEach((mat) => mat.dispose());
        } else {
          material.dispose();
        }
      });
    };

    let loadedRoot: THREE.Object3D | null = null;

    const resolveSourceUrl = async (): Promise<string> => {
      const toObjectUrl = (bytes: ArrayBuffer) => {
        const blob = new Blob([bytes], { type: asset.mimeType || "application/octet-stream" });
        const objectUrl = URL.createObjectURL(blob);
        objectUrlToRevoke = objectUrl;
        return objectUrl;
      };

      const tryDirectFetch = async (url: string): Promise<ArrayBuffer> => {
        const response = await fetch(url, { credentials: "include" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.arrayBuffer();
      };

      // Public assets can fail when loading directly (auth headers/CORS/path).
      // Try several strategies, then fallback to the canonical content endpoint.
      if (asset.isPublic && asset.url) {
        const directUrl = asset.url;
        const apiLikePath =
          directUrl.startsWith("/api/") ? directUrl.replace(/^\/api/, "") : null;

        const loaders: Array<() => Promise<ArrayBuffer>> = [];
        if (apiLikePath) {
          loaders.push(() => apiRequest<ArrayBuffer>(apiLikePath));
        }
        loaders.push(() => tryDirectFetch(directUrl));
        if (directUrl.startsWith("/") && !directUrl.startsWith("/api/")) {
          loaders.push(() => apiRequest<ArrayBuffer>(directUrl));
        }
        loaders.push(() => apiRequest<ArrayBuffer>(`/assets/${asset.id}/content`));

        for (const load of loaders) {
          try {
            const bytes = await load();
            return toObjectUrl(bytes);
          } catch {
            continue;
          }
        }
      }

      const bytes = await apiRequest<ArrayBuffer>(`/assets/${asset.id}/content`);
      return toObjectUrl(bytes);
    };

    const loadModel = async () => {
      try {
        const sourceUrl = await resolveSourceUrl();
        const lowerName = (asset.filename || "").toLowerCase();
        const lowerUrl = sourceUrl.toLowerCase();
        const isObj = lowerName.endsWith(".obj") || lowerUrl.endsWith(".obj") || asset.mimeType.includes("obj");

        if (isObj) {
          loadedRoot = await new OBJLoader().loadAsync(sourceUrl);
        } else {
          const gltf = await new GLTFLoader().loadAsync(sourceUrl);
          loadedRoot = gltf.scene;
        }

        if (!loadedRoot || cancelled) {
          return;
        }

        const box = new THREE.Box3().setFromObject(loadedRoot);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        loadedRoot.position.sub(center);
        scene.add(loadedRoot);

        const maxSize = Math.max(size.x, size.y, size.z, 0.5);
        const distance = maxSize * 1.8;
        camera.near = Math.max(0.01, distance / 100);
        camera.far = distance * 100;
        camera.position.set(distance, distance * 0.7, distance);
        camera.updateProjectionMatrix();
        controls.target.set(0, 0, 0);
        controls.update();

        setError(null);
      } catch {
        if (!cancelled) {
          setError("Cannot load this model for 3D preview.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    const renderLoop = () => {
      if (cancelled) {
        return;
      }
      controls.update();
      renderer.render(scene, camera);
      rafId = window.requestAnimationFrame(renderLoop);
    };

    void loadModel();
    renderLoop();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      controls.dispose();
      if (loadedRoot) {
        clearObject(loadedRoot);
        scene.remove(loadedRoot);
      }
      renderer.dispose();
      renderer.domElement.remove();
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    };
  }, [asset.id, asset.filename, asset.isPublic, asset.mimeType, asset.url]);

  const displayName = asset.name?.trim() || asset.filename;

  return (
    <div className="fixed inset-0 z-[5200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px]" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-[1] w-[min(92vw,980px)] overflow-hidden rounded-xl border border-(--panel-border) bg-(--panel-bg) text-(--text) shadow-(--panel-shadow)"
      >
        <div className="flex items-start justify-between px-4 py-3">
          <div className="min-w-0 pr-4">
            <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-(--text-muted)">3D Model Viewer</div>
            <div className="mt-0.5 truncate text-[13px] font-medium text-(--text)">{displayName}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-[12px] text-(--text) transition hover:bg-(--btn-hover)"
            aria-label="Close 3D preview"
            title="Close"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className="p-3 pt-0">
          <div className="relative h-[min(70vh,680px)] w-full overflow-hidden rounded-lg border border-(--btn-border) bg-(--panel-section-bg)">
            <div ref={containerRef} className="h-full w-full" />
            {loading ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="rounded-md border border-(--btn-border) bg-(--panel-bg)/90 px-3 py-1.5 text-[12px] text-(--text-muted)">
                  Loading 3D preview...
                </span>
              </div>
            ) : null}
            {error ? (
              <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-500">
                {error}
              </div>
            ) : null}
          </div>
          <div className="mt-2 text-[11px] text-(--text-muted)">Drag to rotate, scroll to zoom, right-click drag to pan.</div>
        </div>
      </div>
    </div>
  );
}
