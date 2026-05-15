import type { Plugin } from 'vite'
import { defineConfig, loadEnv } from 'vite'

// import RemoteAssets from 'vite-plugin-remote-assets'

// 注入 CDN 预连接提示，加速 @import 字体的 DNS/TCP 握手阶段
const criticalResourceHints: Plugin = {
  name: 'critical-resource-hints',
  transformIndexHtml: {
    order: 'pre',
    handler(html) {
      return html.replace(
        '<meta charset="UTF-8">',
        [
          '<meta charset="UTF-8">',
          '<link rel="preconnect" href="https://cdn.jsdelivr.net">',
        ].join('\n  '),
      )
    },
  },
}

export default defineConfig(({ mode }) => {
  const viteEnv = loadEnv(mode, process.cwd(), 'VITE_')
  const amapKey = viteEnv.VITE_AMAP_KEY || process.env.VITE_AMAP_KEY || ''
  const amapSecurityJsCode = viteEnv.VITE_AMAP_SECURITY_JS_CODE || process.env.VITE_AMAP_SECURITY_JS_CODE || ''

  return {
    // todo wait upyun assets
    // plugins: [RemoteAssets()],

    plugins: [criticalResourceHints],

    define: {
      'import.meta.env.VITE_AMAP_KEY': JSON.stringify(amapKey),
      'import.meta.env.VITE_AMAP_SECURITY_JS_CODE': JSON.stringify(amapSecurityJsCode),
    },

    optimizeDeps: {
      include: ['vue-gtag-next'],
    },
  }
})
