/// <reference types="vite/client" />

declare interface ImportMetaEnv {
  readonly VITE_STYLE_PATH: string;
  readonly VITE_MAP4D_TILE_URL: string;
  readonly VITE_ROOT_MODEL_URL: string;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}
