import { VectorTile } from "@mapbox/vector-tile";
import Protobuf from "pbf";

export function parseVectorTile(buffer: ArrayBuffer): VectorTile {
  const pbf = new Protobuf(buffer);
  return new VectorTile(pbf);
}
