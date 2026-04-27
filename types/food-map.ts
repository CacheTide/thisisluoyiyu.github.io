export interface FoodFrontMatter {
  show?: boolean | 'true' | 'false'
  name?: string
  city?: string
  address?: string
  lng?: number | string
  lat?: number | string
  category?: string
  price?: number | string
  visited?: boolean | 'true' | 'false'
  rating?: number | string
  recommend?: string[] | string
  amapUrl?: string
  showAmapLink?: boolean | 'true' | 'false'
  amap?: string | {
    url?: string
    show?: boolean | 'true' | 'false'
  }
}

export interface FoodSpot {
  id: string
  name: string
  city: string
  address: string
  lng: number
  lat: number
  category: string
  price?: number
  visited: boolean
  rating?: number
  recommend: string[]
  articlePath: string
  amapUrl?: string
  showAmapLink: boolean
}

declare global {
  interface Window {
    AMap?: unknown
    __foodMapAmapLoaded?: () => void
    _AMapSecurityConfig?: {
      securityJsCode: string
    }
  }

  interface ImportMetaEnv {
    readonly VITE_AMAP_KEY?: string
    readonly VITE_AMAP_SECURITY_JS_CODE?: string
  }
}
