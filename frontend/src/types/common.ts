export type TransformMode = "translate" | "rotate" | "scale" | "reset";

export type ThemeMode = "light" | "dark";

export type MapStyleOption = {
  id: string;
  label: string;
  url: string;
};

export type LayerOption = {
  id: string;
  label: string;
  kind?: "base" | "edit" | "instance" | "water";
};

export type LayerModelInfo = {
  id: string;
  name: string;
  coords?: { lat: number; lng: number } | null;
};

export type TransformValues = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
};
