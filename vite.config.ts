import { defineConfig, loadEnv } from 'vite'

// import RemoteAssets from 'vite-plugin-remote-assets'

export default defineConfig(({ mode }) => {
  const viteEnv = loadEnv(mode, process.cwd(), 'VITE_')
  const amapKey = viteEnv.VITE_AMAP_KEY || process.env.VITE_AMAP_KEY || ''
  const amapSecurityJsCode = viteEnv.VITE_AMAP_SECURITY_JS_CODE || process.env.VITE_AMAP_SECURITY_JS_CODE || ''

  return {
    // todo wait upyun assets
    // plugins: [RemoteAssets()],

    define: {
      'import.meta.env.VITE_AMAP_KEY': JSON.stringify(amapKey),
      'import.meta.env.VITE_AMAP_SECURITY_JS_CODE': JSON.stringify(amapSecurityJsCode),
    },

    optimizeDeps: {
      include: ['vue-gtag-next'],
    },
  }
})
