<script setup lang="ts">
import type { Post } from 'valaxy'
import type { FoodFrontMatter, FoodSpot } from '../types/food-map'
import { usePageList } from 'valaxy'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'

interface AMapNamespace {
  Map: new (container: HTMLElement, options: Record<string, unknown>) => AMapMap
  Marker: new (options: Record<string, unknown>) => AMapMarker
  InfoWindow: new (options: Record<string, unknown>) => AMapInfoWindow
  Scale?: new () => unknown
  ToolBar?: new (options?: Record<string, unknown>) => unknown
}

interface AMapMap {
  add: (overlays: AMapMarker[] | AMapMarker) => void
  remove: (overlays: AMapMarker[] | AMapMarker) => void
  addControl: (control: unknown) => void
  setCenter: (center: [number, number]) => void
  setFitView: (
    overlays?: AMapMarker[],
    immediately?: boolean,
    avoid?: [number, number, number, number],
    maxZoom?: number,
  ) => void
  setZoomAndCenter: (zoom: number, center: [number, number]) => void
  destroy: () => void
}

interface AMapMarker {
  on: (event: 'click', handler: () => void) => void
}

interface AMapInfoWindow {
  open: (map: AMapMap, position: [number, number]) => void
  close: () => void
  setContent: (content: string | HTMLElement) => void
}

const CHINA_CENTER: [number, number] = [104.195397, 35.86166]
const AMAP_CALLBACK_NAME = '__foodMapAmapLoaded'
const AMAP_PLUGINS = ['AMap.Scale', 'AMap.ToolBar']

let amapLoadPromise: Promise<AMapNamespace> | null = null

const amapKey = getEnvString(import.meta.env.VITE_AMAP_KEY)
const amapSecurityJsCode = getEnvString(import.meta.env.VITE_AMAP_SECURITY_JS_CODE)

const pageList = usePageList()
const selectedCity = ref('')
const selectedCategory = ref('')
const loading = ref(false)
const mapReady = ref(false)
const errorMessage = ref('')
const activeSpot = ref<FoodSpot | null>(null)
const mapContainer = ref<HTMLDivElement>()
const AMapRef = shallowRef<AMapNamespace>()
const mapRef = shallowRef<AMapMap>()
const infoWindowRef = shallowRef<AMapInfoWindow>()
const markerRefs = shallowRef<AMapMarker[]>([])

const foodSpots = computed<FoodSpot[]>(() => {
  return pageList.value
    .map(post => createFoodSpot(post))
    .filter((spot): spot is FoodSpot => Boolean(spot))
    .sort((left, right) => {
      return left.city.localeCompare(right.city, 'zh-CN')
        || left.category.localeCompare(right.category, 'zh-CN')
        || left.name.localeCompare(right.name, 'zh-CN')
    })
})

const cities = computed(() => {
  return Array.from(new Set(foodSpots.value.map(spot => spot.city))).sort((left, right) => left.localeCompare(right, 'zh-CN'))
})

const categories = computed(() => {
  return Array.from(new Set(foodSpots.value.map(spot => spot.category))).sort((left, right) => left.localeCompare(right, 'zh-CN'))
})

const filteredSpots = computed(() => {
  return foodSpots.value.filter((spot) => {
    return (!selectedCity.value || spot.city === selectedCity.value)
      && (!selectedCategory.value || spot.category === selectedCategory.value)
  })
})

const currentMapHint = computed(() => {
  if (loading.value)
    return '高德地图加载中…'
  if (errorMessage.value)
    return errorMessage.value
  if (!foodSpots.value.length)
    return '还没有配置 food.show: true 且坐标有效的探店文章。'
  if (!filteredSpots.value.length)
    return '当前筛选下没有店铺，试试清除筛选。'
  return ''
})

onMounted(async () => {
  await nextTick()
  await initMap()
})

onBeforeUnmount(() => {
  infoWindowRef.value?.close()
  if (mapRef.value && markerRefs.value.length)
    mapRef.value.remove(markerRefs.value)
  markerRefs.value = []
  mapRef.value?.destroy()
})

watch(filteredSpots, () => {
  if (activeSpot.value && !filteredSpots.value.some(spot => spot.id === activeSpot.value?.id)) {
    activeSpot.value = null
    infoWindowRef.value?.close()
  }
  renderMarkers()
}, { flush: 'post' })

watch(cities, (value) => {
  if (selectedCity.value && !value.includes(selectedCity.value))
    selectedCity.value = ''
})

watch(categories, (value) => {
  if (selectedCategory.value && !value.includes(selectedCategory.value))
    selectedCategory.value = ''
})

async function initMap() {
  if (!mapContainer.value)
    return

  if (!amapKey) {
    errorMessage.value = '缺少 VITE_AMAP_KEY，请在构建环境中配置高德 Web 端 JSAPI Key。'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    if (amapSecurityJsCode) {
      window._AMapSecurityConfig = {
        securityJsCode: amapSecurityJsCode,
      }
    }

    const AMap = await loadAMapScript(amapKey)

    AMapRef.value = AMap
    mapRef.value = new AMap.Map(mapContainer.value, {
      center: getMapCenter(),
      resizeEnable: true,
      viewMode: '2D',
      zoom: filteredSpots.value.length ? 12 : 4,
    })

    if (AMap.Scale)
      mapRef.value.addControl(new AMap.Scale())
    if (AMap.ToolBar)
      mapRef.value.addControl(new AMap.ToolBar({ position: 'RB' }))

    infoWindowRef.value = new AMap.InfoWindow({
      closeWhenClickMap: true,
      isCustom: false,
    })
    mapReady.value = true
    renderMarkers()
  }
  catch (error) {
    errorMessage.value = `高德地图加载失败：${getErrorMessage(error)}`
  }
  finally {
    loading.value = false
  }
}

function renderMarkers() {
  if (!mapReady.value || !mapRef.value || !AMapRef.value)
    return

  if (markerRefs.value.length) {
    mapRef.value.remove(markerRefs.value)
    markerRefs.value = []
  }

  if (!filteredSpots.value.length)
    return

  const AMap = AMapRef.value
  const markers = filteredSpots.value.map((spot) => {
    const marker = new AMap.Marker({
      anchor: 'bottom-center',
      content: getMarkerContent(spot),
      position: [spot.lng, spot.lat],
      title: spot.name,
    })

    marker.on('click', () => focusSpot(spot, false))
    return marker
  })

  mapRef.value.add(markers)
  markerRefs.value = markers
  fitMapToMarkers()
}

function loadAMapScript(key: string) {
  const currentAMap = getWindowAMap()

  if (currentAMap)
    return Promise.resolve(currentAMap)

  if (amapLoadPromise)
    return amapLoadPromise

  amapLoadPromise = new Promise<AMapNamespace>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-food-map-amap]')

    window[AMAP_CALLBACK_NAME] = () => {
      cleanupAmapCallback()

      const loadedAMap = getWindowAMap()

      if (loadedAMap)
        resolve(loadedAMap)
      else
        reject(new Error('高德地图脚本已加载，但 window.AMap 不存在。'))
    }

    if (existingScript)
      return

    const script = document.createElement('script')
    script.dataset.foodMapAmap = 'true'
    script.async = true
    script.defer = true
    script.src = getAmapScriptUrl(key)
    script.onerror = () => {
      cleanupAmapCallback()
      script.remove()
      amapLoadPromise = null
      reject(new Error('无法加载高德地图 JSAPI 脚本，请检查网络、Key 和域名白名单。'))
    }

    document.head.appendChild(script)
  })

  return amapLoadPromise
}

function getWindowAMap() {
  return window.AMap as AMapNamespace | undefined
}

function getAmapScriptUrl(key: string) {
  const params = new URLSearchParams({
    callback: AMAP_CALLBACK_NAME,
    key,
    plugin: AMAP_PLUGINS.join(','),
    v: '2.0',
  })

  return `https://webapi.amap.com/maps?${params.toString()}`
}

function cleanupAmapCallback() {
  delete window[AMAP_CALLBACK_NAME]
}

function fitMapToMarkers() {
  if (!mapRef.value || !markerRefs.value.length)
    return

  if (filteredSpots.value.length === 1) {
    const spot = filteredSpots.value[0]
    mapRef.value.setZoomAndCenter(15, [spot.lng, spot.lat])
    return
  }

  mapRef.value.setFitView(markerRefs.value, false, [48, 48, 48, 48], 15)
}

function focusSpot(spot: FoodSpot, shouldZoom = true) {
  activeSpot.value = spot

  if (!mapRef.value || !infoWindowRef.value)
    return

  const position: [number, number] = [spot.lng, spot.lat]
  if (shouldZoom)
    mapRef.value.setZoomAndCenter(16, position)
  else
    mapRef.value.setCenter(position)

  infoWindowRef.value.setContent(getInfoWindowContent(spot))
  infoWindowRef.value.open(mapRef.value, position)
}

function resetFilters() {
  selectedCity.value = ''
  selectedCategory.value = ''
}

function createFoodSpot(post: Post): FoodSpot | null {
  const food = post.food as FoodFrontMatter | undefined

  if (!food || !isTruthy(food.show) || isFalse(food.visited))
    return null

  const lng = toFiniteNumber(food.lng)
  const lat = toFiniteNumber(food.lat)

  if (lng === null || lat === null)
    return null

  const title = frontmatterText(post.title)
  const name = normalizeText(food.name) || title || '未命名店铺'
  const city = normalizeText(food.city) || '未填写城市'
  const category = normalizeText(food.category) || '未分类'
  const articlePath = normalizeText(post.path) || normalizeText(post.url) || '#'
  const amapUrl = getAmapUrl(food)

  return {
    id: `${articlePath}-${lng}-${lat}`,
    address: normalizeText(food.address),
    amapUrl,
    articlePath,
    category,
    city,
    lat,
    lng,
    name,
    price: toOptionalNumber(food.price),
    rating: toOptionalNumber(food.rating),
    recommend: toStringArray(food.recommend),
    showAmapLink: Boolean(amapUrl) && shouldShowAmapLink(food),
    visited: true,
  }
}

function getMapCenter(): [number, number] {
  const firstSpot = filteredSpots.value[0] ?? foodSpots.value[0]

  if (!firstSpot)
    return CHINA_CENTER

  return [firstSpot.lng, firstSpot.lat]
}

function getMarkerContent(spot: FoodSpot) {
  const tone = getMarkerTone(spot)

  return [
    `<button class="food-map-marker ${tone}" type="button" aria-label="${escapeHtml(spot.name)}">`,
    '<span class="food-map-marker__emoji">🍜</span>',
    '</button>',
  ].join('')
}

function getInfoWindowContent(spot: FoodSpot) {
  const details = [
    ['城市', spot.city],
    ['地址', spot.address],
    ['分类', spot.category],
    ['人均', formatPrice(spot.price)],
    ['评分', formatRating(spot.rating)],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]))

  const recommend = spot.recommend.length
    ? `<div class="food-map-info-window__recommends">${spot.recommend.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div>`
    : ''
  const href = resolveHref(spot.articlePath)
  const externalAttrs = isExternalLink(spot.articlePath) ? ' target="_blank" rel="noopener noreferrer"' : ''

  return [
    '<article class="food-map-info-window">',
    `<h3>${escapeHtml(spot.name)}</h3>`,
    '<dl>',
    ...details.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`),
    '</dl>',
    recommend,
    `<a class="food-map-info-window__link" href="${escapeHtml(href)}"${externalAttrs}>查看探店文章</a>`,
    '</article>',
  ].join('')
}

function getMarkerTone(spot: FoodSpot) {
  if (hasNumber(spot.rating) && spot.rating >= 4.5)
    return 'is-loved'
  if (hasNumber(spot.rating) && spot.rating >= 4)
    return 'is-good'
  return ''
}

function formatPrice(price?: number) {
  return hasNumber(price) ? `¥${price}/人` : ''
}

function formatRating(rating?: number) {
  return hasNumber(rating) ? `${rating.toFixed(1)} 分` : ''
}

function formatRecommends(recommend: string[]) {
  return recommend.join('、')
}

function toFiniteNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value))
    return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim())
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function toOptionalNumber(value: unknown) {
  return toFiniteNumber(value) ?? undefined
}

function toStringArray(value: unknown) {
  if (Array.isArray(value))
    return value.map(item => normalizeText(item)).filter(Boolean)
  if (typeof value === 'string')
    return value.split(/[、,，]/).map(item => item.trim()).filter(Boolean)
  return []
}

function getAmapUrl(food: FoodFrontMatter) {
  if (typeof food.amap === 'string')
    return normalizeExternalUrl(food.amap)

  const nestedUrl = food.amap && typeof food.amap === 'object'
    ? normalizeExternalUrl(food.amap.url)
    : ''

  return normalizeExternalUrl(food.amapUrl) || nestedUrl
}

function shouldShowAmapLink(food: FoodFrontMatter) {
  if (isFalse(food.showAmapLink))
    return false

  if (food.amap && typeof food.amap === 'object' && isFalse(food.amap.show))
    return false

  return true
}

function frontmatterText(value: unknown) {
  if (typeof value === 'string')
    return value.trim()
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const preferred = record['zh-CN'] ?? record.zh ?? record.en ?? Object.values(record).find(item => typeof item === 'string')
    return normalizeText(preferred)
  }
  return ''
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function isTruthy(value: unknown) {
  return value === true || value === 'true'
}

function isFalse(value: unknown) {
  return value === false || value === 'false'
}

function hasNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function getEnvString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeExternalUrl(value: unknown) {
  const url = normalizeText(value)
  return isExternalLink(url) ? url : ''
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error)
    return error.message
  if (typeof error === 'string')
    return error
  return '未知错误'
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function isExternalLink(value: string) {
  return /^https?:\/\//i.test(value)
}

function resolveHref(value: string) {
  if (!value || value === '#')
    return '#'
  if (isExternalLink(value))
    return value

  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  const path = value.startsWith('/') ? value : `/${value}`
  return `${base}${path}` || '/'
}
</script>

<template>
  <section class="food-map" aria-label="美食地图">
    <div class="food-map__filters yun-card" aria-label="美食地图筛选">
      <label>
        <span>城市</span>
        <select v-model="selectedCity">
          <option value="">
            全部城市
          </option>
          <option v-for="city in cities" :key="city" :value="city">
            {{ city }}
          </option>
        </select>
      </label>

      <label>
        <span>分类</span>
        <select v-model="selectedCategory">
          <option value="">
            全部分类
          </option>
          <option v-for="category in categories" :key="category" :value="category">
            {{ category }}
          </option>
        </select>
      </label>

      <button
        v-if="selectedCity || selectedCategory"
        class="food-map__reset"
        type="button"
        @click="resetFilters"
      >
        清除筛选
      </button>

      <div class="food-map__stats" aria-label="店铺数量统计" aria-live="polite">
        <strong>{{ filteredSpots.length }}</strong>
        <span>/ {{ foodSpots.length }} 家店铺</span>
      </div>
    </div>

    <div class="food-map__body yun-card">
      <aside class="food-map__list" aria-label="店铺列表">
        <button
          v-for="spot in filteredSpots"
          :key="spot.id"
          class="food-map__list-item"
          :class="{ 'is-active': activeSpot?.id === spot.id }"
          type="button"
          @click="focusSpot(spot)"
        >
          <span class="food-map__list-title">{{ spot.name }}</span>
          <span class="food-map__list-meta">
            <span>{{ spot.city }}</span>
            <span>{{ spot.category }}</span>
            <span v-if="hasNumber(spot.rating)">{{ formatRating(spot.rating) }}</span>
          </span>
          <span v-if="spot.address" class="food-map__list-address">{{ spot.address }}</span>
        </button>

        <p v-if="!filteredSpots.length" class="food-map__empty">
          暂无符合条件的店铺。
        </p>
      </aside>

      <div class="food-map__map-card">
        <div ref="mapContainer" class="food-map__map" />
        <div v-if="currentMapHint" class="food-map__map-hint" role="status">
          {{ currentMapHint }}
        </div>
      </div>
    </div>

    <article v-if="activeSpot" class="food-map__active-card yun-card">
      <div>
        <p class="food-map__eyebrow">
          当前店铺
        </p>
        <h2>{{ activeSpot.name }}</h2>
      </div>

      <dl>
        <div>
          <dt>城市</dt>
          <dd>{{ activeSpot.city }}</dd>
        </div>
        <div v-if="activeSpot.address">
          <dt>地址</dt>
          <dd>{{ activeSpot.address }}</dd>
        </div>
        <div>
          <dt>分类</dt>
          <dd>{{ activeSpot.category }}</dd>
        </div>
        <div v-if="hasNumber(activeSpot.price)">
          <dt>人均</dt>
          <dd>{{ formatPrice(activeSpot.price) }}</dd>
        </div>
        <div v-if="hasNumber(activeSpot.rating)">
          <dt>评分</dt>
          <dd>{{ formatRating(activeSpot.rating) }}</dd>
        </div>
        <div v-if="activeSpot.recommend.length">
          <dt>推荐菜</dt>
          <dd>{{ formatRecommends(activeSpot.recommend) }}</dd>
        </div>
      </dl>

      <div class="food-map__actions">
        <a
          v-if="isExternalLink(activeSpot.articlePath)"
          class="food-map__action-link"
          :href="activeSpot.articlePath"
          target="_blank"
          rel="noopener noreferrer"
        >
          查看探店文章
        </a>
        <RouterLink v-else class="food-map__action-link" :to="activeSpot.articlePath">
          查看探店文章
        </RouterLink>

        <a
          v-if="activeSpot.showAmapLink && activeSpot.amapUrl"
          class="food-map__action-link food-map__amap-link"
          :href="activeSpot.amapUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          高德地图打开
        </a>
      </div>
    </article>
  </section>
</template>

<style scoped>
:global(.yun-card:has(.food-map)) {
  border-color: transparent !important;
  background: transparent !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  margin-top: 0 !important;
  transform: none !important;
}

:global(.yun-card:has(.food-map):hover) {
  box-shadow: none !important;
  transform: none !important;
}

:global(.yun-card:has(.food-map) > .mt-8) {
  display: none !important;
  margin-top: 0 !important;
}

:global(.yun-card:has(.food-map) > div:last-child) {
  padding-top: 0 !important;
  padding-inline: 0 !important;
  padding-bottom: 0 !important;
}

.food-map {
  --food-map-border: rgba(0, 0, 0, 0.03);
  --food-map-inner-radius: var(--radius-detail-inner, 16px);
  --food-map-blur: blur(16px) saturate(140%);

  display: grid;
  gap: 1.1rem;
  width: min(1120px, 100%);
  margin: 0 auto;
}

:global(html.dark) .food-map {
  --food-map-border: rgba(255, 255, 255, 0.08);
}

.food-map__filters,
.food-map__body,
.food-map__active-card {
  margin-bottom: 0 !important;
}

.food-map__eyebrow {
  margin: 0 0 0.35rem;
  color: var(--va-c-primary, #f97316);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.food-map__filters {
  display: flex;
  align-items: end;
  gap: 0.75rem;
  overflow-x: auto;
  padding: 0.9rem 1rem;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in oklab, var(--va-c-primary, #f97316) 35%, transparent) transparent;
}

.food-map__filters label {
  display: grid;
  flex: 0 0 11rem;
  gap: 0.35rem;
  color: var(--va-c-text-2, #64748b);
  font-size: 0.85rem;
}

.food-map__filters select {
  width: 100%;
  border: 1px solid var(--food-map-border);
  border-radius: 0.9rem;
  padding: 0.65rem 0.75rem;
  background: color-mix(in oklab, var(--va-c-bg, #fff) 82%, transparent);
  color: var(--va-c-text-1, #0f172a);
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.food-map__filters select:focus-visible {
  border-color: color-mix(in oklab, var(--va-c-primary, #f97316) 70%, transparent);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--va-c-primary, #f97316) 16%, transparent);
}

.food-map__stats {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: baseline;
  gap: 0.25rem;
  margin-left: auto;
  border: 1px solid color-mix(in oklab, var(--va-c-primary, #f97316) 20%, transparent);
  border-radius: 999px;
  padding: 0.55rem 0.85rem;
  background: color-mix(in oklab, var(--va-c-primary, #f97316) 10%, transparent);
  color: var(--va-c-text-2, #64748b);
  white-space: nowrap;
}

.food-map__stats strong {
  color: var(--va-c-primary, #f97316);
  font-size: 1.35rem;
  line-height: 1;
}

.food-map__stats span {
  font-size: 0.85rem;
}

.food-map__reset,
.food-map__action-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  padding: 0.65rem 1rem;
  background: var(--va-c-primary, #f97316);
  color: #fff;
  cursor: pointer;
  font-weight: 700;
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.food-map__reset:hover,
.food-map__action-link:hover {
  box-shadow: 0 10px 24px -14px var(--va-c-primary, #f97316);
  transform: translateY(-1px);
}

.food-map__body {
  display: grid;
  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
  height: clamp(540px, 68vh, 720px);
  overflow: hidden;
}

.food-map__list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  overflow: auto;
  border-right: 1px solid var(--food-map-border);
  padding: 1rem;
  background: color-mix(in oklab, var(--va-c-bg-soft, rgba(148, 163, 184, 0.12)) 28%, transparent);
  scrollbar-width: thin;
  scrollbar-color: color-mix(in oklab, var(--va-c-primary, #f97316) 35%, transparent) transparent;
}

.food-map__list-item {
  border: 1px solid color-mix(in oklab, var(--food-map-border) 72%, transparent);
  border-radius: var(--food-map-inner-radius);
  padding: 0.85rem;
  background: color-mix(in oklab, var(--va-c-bg, #fff) 64%, transparent);
  box-shadow: 0 10px 26px -22px rgba(15, 23, 42, 0.45);
  color: inherit;
  cursor: pointer;
  text-align: left;
  backdrop-filter: blur(10px) saturate(130%);
  -webkit-backdrop-filter: blur(10px) saturate(130%);
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.food-map__list-item:hover,
.food-map__list-item.is-active {
  border-color: color-mix(in oklab, var(--va-c-primary, #f97316) 60%, transparent);
  background: color-mix(in oklab, var(--va-c-primary, #f97316) 10%, transparent);
  box-shadow: 0 14px 28px -22px var(--va-c-primary, #f97316);
  transform: translateY(-1px);
}

.food-map__list-title {
  display: block;
  color: var(--va-c-text-1, #0f172a);
  font-weight: 800;
}

.food-map__list-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.45rem;
  color: var(--va-c-text-2, #64748b);
  font-size: 0.82rem;
}

.food-map__list-meta span {
  border-radius: 999px;
  padding: 0.12rem 0.5rem;
  background: color-mix(in oklab, var(--va-c-bg, #fff) 72%, transparent);
}

.food-map__list-address {
  display: block;
  margin-top: 0.55rem;
  color: var(--va-c-text-2, #64748b);
  font-size: 0.85rem;
  line-height: 1.6;
}

.food-map__empty {
  margin: auto 0;
  color: var(--va-c-text-2, #64748b);
  text-align: center;
}

.food-map__map-card {
  position: relative;
  min-width: 0;
  height: 100%;
  background: transparent;
}

.food-map__map {
  width: 100%;
  height: 100%;
}

.food-map__map-hint {
  position: absolute;
  top: 1rem;
  left: 50%;
  z-index: 2;
  max-width: min(86%, 34rem);
  border: 1px solid var(--food-map-border);
  border-radius: 999px;
  padding: 0.65rem 1rem;
  background: color-mix(in oklab, var(--va-c-bg, #fff) 82%, transparent);
  box-shadow: 0 16px 32px -24px rgba(15, 23, 42, 0.45);
  backdrop-filter: var(--food-map-blur);
  -webkit-backdrop-filter: var(--food-map-blur);
  color: var(--va-c-text-2, #64748b);
  text-align: center;
  transform: translateX(-50%);
}

.food-map__active-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 0.9rem 1rem;
  padding: 1.1rem 1.25rem;
}

.food-map__active-card h2 {
  margin: 0;
  font-size: 1.35rem;
}

.food-map__active-card dl {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem 1rem;
  margin: 0;
}

.food-map__active-card div {
  min-width: 0;
}

.food-map__active-card dt {
  color: var(--va-c-text-2, #64748b);
  font-size: 0.82rem;
}

.food-map__active-card dd {
  margin: 0.18rem 0 0;
  color: var(--va-c-text-1, #0f172a);
  font-weight: 700;
  overflow-wrap: anywhere;
}

.food-map__actions {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 0.6rem;
  align-self: start;
}

.food-map__amap-link {
  background: #10b981;
}

.food-map__amap-link:hover {
  box-shadow: 0 10px 24px -14px #10b981;
}

:global(.food-map-marker) {
  appearance: none;
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 2px solid #fff;
  border-radius: 999px 999px 999px 0;
  background: #f97316;
  box-shadow: 0 10px 18px -10px rgba(15, 23, 42, 0.65);
  color: #fff;
  cursor: pointer;
  padding: 0;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
  transform: rotate(-45deg);
}

:global(.food-map-marker:hover) {
  box-shadow: 0 14px 24px -12px rgba(15, 23, 42, 0.8);
  transform: rotate(-45deg) translateY(-2px);
}

:global(.food-map-marker.is-good) {
  background: #10b981;
}

:global(.food-map-marker.is-loved) {
  background: #ef4444;
}

:global(.food-map-marker__emoji) {
  font-size: 1.15rem;
  line-height: 1;
  transform: rotate(45deg);
}

:global(.amap-info-contentContainer .amap-info-content) {
  overflow: hidden;
  border: 1px solid color-mix(in oklab, var(--va-c-divider, #e5e7eb) 65%, transparent) !important;
  border-radius: 1.15rem !important;
  padding: 0 !important;
  background: color-mix(in oklab, var(--va-c-bg, #fff) 78%, transparent) !important;
  box-shadow: 0 20px 48px -26px rgba(15, 23, 42, 0.5) !important;
  backdrop-filter: blur(18px) saturate(145%);
  -webkit-backdrop-filter: blur(18px) saturate(145%);
}

:global(.amap-info-contentContainer .amap-info-sharp) {
  border-color: color-mix(in oklab, var(--va-c-bg, #fff) 78%, transparent) transparent transparent !important;
}

:global(.amap-info-close) {
  top: 0.8rem !important;
  right: 0.85rem !important;
  color: var(--va-c-text-2, #64748b) !important;
  font-size: 1rem !important;
}

:global(.food-map-info-window) {
  display: grid;
  gap: 0.7rem;
  width: min(78vw, 22rem);
  padding: 1rem 1.05rem 1.05rem;
  color: var(--va-c-text-1, #1f2937);
  font-size: 0.9rem;
  text-align: left;
}

:global(.food-map-info-window h3) {
  margin: 0;
  padding-right: 1.5rem;
  color: var(--va-c-text-1, #111827);
  font-size: 1.08rem;
  line-height: 1.45;
}

:global(.food-map-info-window dl) {
  display: grid;
  gap: 0.5rem;
  margin: 0;
}

:global(.food-map-info-window dl div) {
  display: grid;
  grid-template-columns: 3.25rem minmax(0, 1fr);
  align-items: baseline;
  column-gap: 0.7rem;
  min-width: 0;
}

:global(.food-map-info-window dt) {
  display: inline-flex;
  align-items: baseline;
  align-self: baseline;
  justify-content: flex-end;
  gap: 0.08rem;
  color: var(--va-c-text-2, #6b7280);
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.55;
  text-align: right;
  text-align-last: auto;
  white-space: nowrap;
}

:global(.food-map-info-window dt::after) {
  content: '：';
  position: static;
  flex: 0 0 auto;
  line-height: inherit;
  text-align-last: auto;
}

:global(.food-map-info-window dd) {
  align-self: baseline;
  margin: 0;
  padding-top: 0;
  line-height: 1.55;
  overflow-wrap: anywhere;
  text-align: left !important;
}

:global(.food-map-info-window__recommends) {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.65rem;
}

:global(.food-map-info-window__recommends span) {
  border-radius: 999px;
  padding: 0.18rem 0.5rem;
  background: color-mix(in oklab, var(--va-c-primary, #f97316) 14%, transparent);
  color: var(--va-c-primary, #c2410c);
}

:global(.food-map-info-window__link) {
  display: inline-flex;
  justify-self: start;
  margin-top: 0.1rem;
  border-radius: 999px;
  padding: 0.5rem 0.85rem;
  background: var(--va-c-primary, #f97316);
  color: #fff;
  font-weight: 700;
  text-decoration: none;
}

@media (max-width: 860px) {
  .food-map {
    gap: 0.9rem;
  }

  .food-map__body {
    display: flex;
    flex-direction: column-reverse;
    height: auto;
    min-height: auto;
  }

  .food-map__list {
    flex-direction: row;
    max-height: none;
    overflow-x: auto;
    border-top: 1px solid var(--food-map-border);
    border-right: 0;
    padding: 0.85rem;
    scroll-snap-type: x proximity;
  }

  .food-map__list-item {
    flex: 0 0 min(76vw, 18rem);
    scroll-snap-align: start;
  }

  .food-map__map-card,
  .food-map__map {
    height: min(68vh, 560px);
    min-height: 420px;
  }

  .food-map__active-card {
    grid-template-columns: 1fr;
  }

  .food-map__active-card dl {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .food-map {
    width: calc(100% + 0.5rem);
    margin-inline: -0.25rem;
    --food-map-inner-radius: 0.85rem;
  }

  .food-map__filters {
    gap: 0.6rem;
    padding: 0.8rem;
  }

  .food-map__filters label {
    flex-basis: 9.5rem;
  }

  .food-map__stats {
    margin-left: 0;
  }

  .food-map__map-card,
  .food-map__map {
    height: 60vh;
    min-height: 360px;
  }

  .food-map__map-hint {
    top: 0.75rem;
    width: calc(100% - 1.5rem);
    max-width: none;
    border-radius: 0.9rem;
    padding: 0.55rem 0.75rem;
    font-size: 0.88rem;
  }

  .food-map__active-card {
    padding: 1rem;
  }

  .food-map__active-card dl {
    grid-template-columns: 1fr;
  }

  :global(.food-map-info-window) {
    width: min(84vw, 20rem);
    padding: 0.9rem;
  }

  :global(.food-map-info-window dl div) {
    grid-template-columns: 3.1rem minmax(0, 1fr);
    column-gap: 0.6rem;
  }
}
</style>
