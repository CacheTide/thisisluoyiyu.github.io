import type { Plugin } from 'vite'
import { defineConfig, loadEnv } from 'vite'

// import RemoteAssets from 'vite-plugin-remote-assets'

// 注入字体 <link> 标签，与主 CSS 并行加载（替代 CSS @import 的串行加载）
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
          '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/lxgw-wenkai-screen-webfont/style.css">',
          '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/jetbrains-mono@5/400.css">',
          '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/jetbrains-mono@5/700.css">',
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
