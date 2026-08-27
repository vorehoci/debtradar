/**
 * A stand-in for assets the Spline runtime names but never bundles.
 *
 * Its runtime references the Draco decoder and a wasm binary by relative path,
 * which the bundler tries to resolve at build time even though they are fetched
 * from a CDN when a scene needs them. Aliasing them here silences the
 * resolution without changing what loads at runtime.
 */
export default {}
