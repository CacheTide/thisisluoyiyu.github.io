export interface FoodFrontMatter {
  show?: boolean | 'true' | 'false'
  spotId?: string
  name?: string
  city?: string
  address?: string
  lng?: number | string
  lat?: number | string
  category?: string
  price?: number | string
  visited?: boolean | 'true' | 'false'
  showTimeline?: boolean | 'true' | 'false'
  visitedAt?: string
  people?: FoodVisitPerson[] | string[] | string
  rating?: number | string
  recommend?: string[] | string
  note?: string
  visit?: FoodVisitFrontMatter
  visits?: FoodVisitFrontMatter[]
  amapUrl?: string
  showAmapLink?: boolean | 'true' | 'false'
  amap?: string | {
    url?: string
    show?: boolean | 'true' | 'false'
  }
}

export interface FoodVisitPerson {
  name: string
  url?: string
}

export interface FoodVisitFrontMatter {
  visitedAt?: string
  date?: string
  title?: string
  articleUrl?: string
  people?: FoodVisitPerson[] | string[] | string
  rating?: number | string
  price?: number | string
  recommend?: string[] | string
  note?: string
}

export interface FoodVisit {
  id: string
  title: string
  visitedAt: string
  articlePath: string
  people: FoodVisitPerson[]
  rating?: number
  price?: number
  recommend: string[]
  note: string
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
  visits: FoodVisit[]
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
