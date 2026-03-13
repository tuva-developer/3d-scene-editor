import { WaterLayer as CoreWaterLayer, type WaterLayerOpts } from "@/components/map/water/CoreWaterLayer";
import { normalizeWaterSettings, type WaterSettings } from "@/components/map/water/WaterMaterial";

export type SunOptions = {
  shadow: boolean;
  altitude: number;
  azimuth: number;
  lat?: number | null;
  lon?: number | null;
};

export type WaterLayerOptions = Omit<WaterLayerOpts, "normalUrl" | "sun"> & {
  normalTextureUrl?: string;
  settings?: Partial<WaterSettings>;
  sun?: SunOptions;
};

export class WaterLayer extends CoreWaterLayer {
  private currentSettings: WaterSettings;

  constructor(opts: WaterLayerOptions) {
    super({
      id: opts.id,
      applyGlobeMatrix: opts.applyGlobeMatrix,
      sourceLayer: opts.sourceLayer,
      normalUrl: opts.normalTextureUrl || "/waters/water1.jpg",
      sun: opts.sun
        ? {
            ...opts.sun,
            lat: opts.sun.lat ?? null,
            lon: opts.sun.lon ?? null,
          }
        : undefined,
      minZoom: opts.minZoom,
      maxZoom: opts.maxZoom,
    });
    this.currentSettings = normalizeWaterSettings(opts.settings);
    this.setWaterSettings(this.currentSettings);
  }

  setVisible(visible: boolean): void {
    (this as unknown as { visible: boolean }).visible = visible;
    (this as unknown as { map?: { triggerRepaint?: () => void } | null }).map?.triggerRepaint?.();
  }

  setWaterSettings(settings: Partial<WaterSettings>): void {
    this.currentSettings = normalizeWaterSettings(settings);
    const material = (this as unknown as {
      waterMaterial?: {
        setWaterColor?: (color: string | number) => void;
        setOpacity?: (opacity: number) => void;
      } | null;
    }).waterMaterial;
    material?.setWaterColor?.(this.currentSettings.waterColor);
    material?.setOpacity?.(this.currentSettings.opacity);
    (this as unknown as { map?: { triggerRepaint?: () => void } | null }).map?.triggerRepaint?.();
  }
}

export default WaterLayer;
