export function getFrontendReleaseInfo() {
  return {
    env: import.meta.env.VITE_APP_ENV || import.meta.env.MODE || "dev",
    version: import.meta.env.VITE_APP_VERSION || "0.0.0",
    buildTime: import.meta.env.VITE_BUILD_TIME || null,
    releaseSha: import.meta.env.VITE_RELEASE_SHA || null,
  };
}
