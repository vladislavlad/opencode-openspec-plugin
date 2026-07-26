declare const __PLUGIN_VERSION__: string

// `build.ts` defines the constant on every build, so anything opencode loads carries a real version
// — a dev checkout included. The fallback is only reached when this module is imported unbuilt, i.e.
// from the tests; don't read it as "this is how a dev checkout behaves".
export const VERSION = typeof __PLUGIN_VERSION__ !== "undefined" ? __PLUGIN_VERSION__ : "dev"
