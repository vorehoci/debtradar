import type { NextConfig } from "next";

const EMPTY = "./app/_landing/empty.ts";

const nextConfig: NextConfig = {
  turbopack: {
    // See app/_landing/empty.ts — these are runtime CDN fetches that the
    // bundler nonetheless tries to resolve, and cannot.
    resolveAlias: {
      "../libs/draco/draco_decoder.js": EMPTY,
      "../libs/draco/draco_decoder.wasm": EMPTY,
      "../libs/draco/draco_wasm_wrapper.js": EMPTY,
      "../libs/draco/gltf/draco_decoder.wasm": EMPTY,
      "../libs/draco/gltf/draco_wasm_wrapper.js": EMPTY,
      "boolean_wasm_bg.wasm": EMPTY,
    },
  },
};

export default nextConfig;
