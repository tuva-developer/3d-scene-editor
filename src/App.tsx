import { useMemo, useRef, useState } from "react";
import MapView from "./components/map/MapView";
import { TransformToolbar } from "./components/toolbar/TransformToolbar";
import type { TransformMode } from "./components/toolbar/TransformToolbar";
import type { MapViewHandle } from "./components/map/MapView";

function App() {
  const [mode, setMode] = useState<TransformMode>("translate");
  const [showTiles, setShowTiles] = useState<boolean>(false);
  const [hasSelection, setHasSelection] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const mapHandleRef = useRef<MapViewHandle>(null);
  const mapCenter = useMemo(() => [106.6297, 10.8231] as [number, number], []);

  return (
    <div className="App">
      <MapView
        center={mapCenter}
        zoom={16}
        ref={mapHandleRef}
        showTileBoundaries={showTiles}
        onSelectionChange={(selected) => {
          setHasSelection(selected);
          if (!selected) {
            setHasChanges(false);
          }
        }}
        onTransformDirtyChange={setHasChanges}
      />
      <TransformToolbar
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
      />
    </div>
  );
}

export default App;
