import type { NextConfig } from "next";

/**
 * Nothing to configure.
 *
 * This file used to alias six Draco and WASM paths to an empty module: the
 * Spline runtime named them, the bundler tried to resolve them, and they were
 * only ever fetched from a CDN at runtime. The hero no longer uses Spline — the
 * field is a fragment shader written against raw WebGL — so the runtime, its
 * unresolvable references, and the stub they pointed at are all gone.
 */
const nextConfig: NextConfig = {};

export default nextConfig;
