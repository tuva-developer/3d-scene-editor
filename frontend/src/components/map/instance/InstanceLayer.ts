import { InstanceLayer as CoreInstanceLayer, type InstanceLayerOpts } from "@/components/map/instance/CoreInstanceLayer";
import { getSharedShadowPass } from "@/components/map/shadow/ShadowMapPass";

export type SunOptions = {
  shadow: boolean;
  altitude: number;
  azimuth: number;
};

export type InstanceLayerOptions = Omit<InstanceLayerOpts, "minZoom" | "maxZoom"> & {
  minZoom?: number;
  maxZoom?: number;
  sun?: SunOptions;
};

export class InstanceLayer extends CoreInstanceLayer {
  constructor(opts: InstanceLayerOptions) {
    super({
      ...opts,
      minZoom: opts.minZoom ?? 0,
      maxZoom: opts.maxZoom ?? 19,
    });
    if (opts.sun) {
      this.setSunPos(opts.sun.altitude, opts.sun.azimuth, opts.sun.shadow);
    }
  }

  setVisible(visible: boolean): void {
    (this as unknown as { visible: boolean }).visible = visible;
    (this as unknown as { map?: { triggerRepaint?: () => void } | null }).map?.triggerRepaint?.();
  }

  setSunPos(altitude: number, azimuth: number, shadow: boolean = true): void {
    getSharedShadowPass(8192).setSunOptions({
      altitude,
      azimuth,
      shadow,
      lat: null,
      lon: null,
    });
    (this as unknown as { map?: { triggerRepaint?: () => void } | null }).map?.triggerRepaint?.();
  }
}

export default InstanceLayer;
