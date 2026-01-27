import { useEffect, useMemo, useRef, useState } from "react";
import MapView from "@/components/map/MapView";
import { EditorToolbar } from "@/components/toolbar/EditorToolbar";
import type { ThemeMode, TransformMode } from "@/types/common";
import type { MapViewHandle } from "@/components/map/MapView";

function App() {
  const [mode, setMode] = useState<TransformMode>("translate");
  const [showTiles, setShowTiles] = useState<boolean>(false);
  const [hasSelection, setHasSelection] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [selectionElevation, setSelectionElevation] = useState<number | null>(null);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "light";
    }
    const stored = window.localStorage.getItem("scene-editor-theme");
    return stored === "dark" ? "dark" : "light";
  });
  const mapHandleRef = useRef<MapViewHandle>(null);
  const mapCenter = useMemo(() => [106.6297, 10.8231] as [number, number], []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-light", "theme-dark");
    root.classList.add(theme === "dark" ? "theme-dark" : "theme-light");
    window.localStorage.setItem("scene-editor-theme", theme);
  }, [theme]);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <MapView
        center={mapCenter}
        zoom={16}
        ref={mapHandleRef}
        showTileBoundaries={showTiles}
        onSelectionChange={(selected) => {
          setHasSelection(selected);
          if (!selected) {
            setHasChanges(false);
            setSelectionElevation(null);
          }
        }}
        onSelectionElevationChange={setSelectionElevation}
        onTransformDirtyChange={setHasChanges}
      />
      <EditorToolbar
        mode={mode}
        onChange={(nextMode) => {
          if (nextMode === "reset") {
            mapHandleRef.current?.setTransformMode(nextMode);
            setMode("translate");
            return;
          }
          setMode(nextMode);
          mapHandleRef.current?.setTransformMode(nextMode);
        }}
        showTiles={showTiles}
        onToggleTiles={() => {
          setShowTiles((current) => {
            const next = !current;
            mapHandleRef.current?.setShowTileBoundaries(next);
            return next;
          });
        }}
        showReset={hasSelection && hasChanges}
        showSnapToGround={hasSelection && Math.abs(selectionElevation ?? 0) > 1e-4}
        onSnapToGround={() => {
          mapHandleRef.current?.snapObjectSelectedToGround();
        }}
        enableClippingPlane={(enable) => {
          mapHandleRef.current?.enableClippingPlanesObjectSelected(enable);
        }}
        enableFootPrintWhenEdit={(enable) => {
          mapHandleRef.current?.enableFootPrintWhenEdit(enable);
        }}
        onAddLayer={() => {
          mapHandleRef.current?.addEditLayer();
        }}
        theme={theme}
        onToggleTheme={() => {
          setTheme((current) => (current === "dark" ? "light" : "dark"));
        }}
      />
    </div>
  );
}

export default App;
