/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_IRS_MILEAGE_RATE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
