import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { feedCacheVersion } from '@/services/repository'
import { matchRecord } from '@/utils/normalize'

const feedMemoryCache = new Map()

export function useServerFeed({ cacheKey = '', fetchPage, searchFn, filterRef, batchSize = 6 }) {
  const initialFilter = filterRef ? filterRef.value : 'all'
  const initialCacheId = cacheKey ? `${cacheKey}:${String(initialFilter || 'all')}` : ''
  const initialEntry = initialCacheId ? feedMemoryCache.get(initialCacheId) : null
  const initialCached =
    initialEntry && initialEntry.version === feedCacheVersion.value ? initialEntry : null

  const items = ref(initialCached ? initialCached.items : [])
  const unfilteredLoadedItems = ref(initialCached ? initialCached.items : [])
  const loading = ref(!initialCached)
  const loadingMore = ref(false)
  const searching = ref(false)
  const hasMore = ref(initialCached ? initialCached.hasMore : false)
  const cursorKey = ref(initialCached ? initialCached.nextCursor : null)
  const keyword = ref('')
  const sentinelRef = ref(null)

  let observer = null
  let debounceTimer = null
  let activeReqId = 0

  function currentFilter() {
    return filterRef ? filterRef.value : 'all'
  }

  function resolveCacheId(filter = currentFilter()) {
    return cacheKey ? `${cacheKey}:${String(filter || 'all')}` : ''
  }

  function readCachedFeed(filter = currentFilter()) {
    const id = resolveCacheId(filter)
    if (!id) return null
    const entry = feedMemoryCache.get(id)
    if (!entry || entry.version !== feedCacheVersion.value) return null
    return entry
  }

  function writeCachedFeed(filter = currentFilter()) {
    const id = resolveCacheId(filter)
    if (!id) return
    feedMemoryCache.set(id, {
      items: items.value,
      hasMore: hasMore.value,
      nextCursor: cursorKey.value,
      version: feedCacheVersion.value
    })
  }

  async function maybeAutoLoadIfSentinelVisible() {
    await nextTick()
    const el = sentinelRef.value
    if (!el || !hasMore.value || loadingMore.value || keyword.value.trim()) return
    const rect = el.getBoundingClientRect()
    if (rect.top <= window.innerHeight + 360) {
      loadNextPage()
    }
  }

  async function loadFirstPage({ silent = false } = {}) {
    const filter = currentFilter()
    const cached = readCachedFeed(filter)
    if (cached && !silent) {
      items.value = cached.items
      unfilteredLoadedItems.value = cached.items
      hasMore.value = cached.hasMore
      cursorKey.value = cached.nextCursor
      loading.value = false
      silentRefreshFirstPage(filter)
      return
    }

    const reqId = ++activeReqId
    if (!silent) {
      loading.value = items.value.length === 0
      cursorKey.value = null
    }
    try {
      const res = await fetchPage({
        batchSize,
        cursorKey: null,
        filter
      })
      if (reqId !== activeReqId) return
      items.value = res.items
      unfilteredLoadedItems.value = res.items
      hasMore.value = res.hasMore
      cursorKey.value = res.nextCursor
      writeCachedFeed(filter)
    } finally {
      if (reqId === activeReqId) {
        loading.value = false
        maybeAutoLoadIfSentinelVisible()
      }
    }
  }

  async function silentRefreshFirstPage(filter) {
    const reqId = ++activeReqId
    try {
      const res = await fetchPage({
        batchSize,
        cursorKey: null,
        filter
      })
      if (reqId !== activeReqId || keyword.value.trim()) return
      const existingIds = new Set(res.items.map((x) => x.id))
      const olderLoaded = items.value.filter((x) => !existingIds.has(x.id))
      items.value = [...res.items, ...olderLoaded]
      unfilteredLoadedItems.value = items.value
      if (!cursorKey.value) {
        hasMore.value = res.hasMore
        cursorKey.value = res.nextCursor
      }
      writeCachedFeed(filter)
    } catch {
      // Keep cached items silently
    }
  }

  async function loadNextPage() {
    if (loading.value || loadingMore.value || !hasMore.value || !cursorKey.value) return
    if (keyword.value.trim()) return

    const filter = currentFilter()
    const reqId = ++activeReqId
    loadingMore.value = true
    try {
      const res = await fetchPage({
        batchSize,
        cursorKey: cursorKey.value,
        filter
      })
      if (reqId !== activeReqId) return
      const existingIds = new Set(items.value.map((x) => x.id))
      const fresh = res.items.filter((x) => !existingIds.has(x.id))
      items.value = [...items.value, ...fresh]
      unfilteredLoadedItems.value = items.value
      hasMore.value = res.hasMore
      cursorKey.value = res.nextCursor
      writeCachedFeed(filter)
    } finally {
      if (reqId === activeReqId) {
        loadingMore.value = false
        maybeAutoLoadIfSentinelVisible()
      }
    }
  }

  function filterLoadedItems(q, filter) {
    const base = readCachedFeed(filter)?.items || unfilteredLoadedItems.value
    return base
      .map((item) => ({ item, match: matchRecord(item, q) }))
      .filter((entry) => entry.match.matched)
      .sort((a, b) => a.match.rank - b.match.rank || Number(b.item.createdAt || 0) - Number(a.item.createdAt || 0))
      .map((entry) => entry.item)
  }

  async function runSearch() {
    const q = keyword.value.trim()
    const filter = currentFilter()
    if (!q) {
      searching.value = false
      await loadFirstPage()
      return
    }

    // Show immediate matches from already-loaded items without blocking
    const localMatches = filterLoadedItems(q, filter)
    items.value = localMatches
    hasMore.value = false
    cursorKey.value = null
    loading.value = false

    if (typeof searchFn !== 'function') return

    const reqId = ++activeReqId
    searching.value = true
    try {
      const found = await searchFn(q, filter)
      if (reqId !== activeReqId) return
      const seen = new Set(found.map((x) => x.id))
      const merged = [...found, ...localMatches.filter((x) => !seen.has(x.id))]
      items.value = merged
    } finally {
      if (reqId === activeReqId) searching.value = false
    }
  }

  function triggerSearchNow() {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    runSearch()
  }

  function reload() {
    if (keyword.value.trim()) runSearch()
    else loadFirstPage()
  }

  watch(keyword, () => {
    const q = keyword.value.trim()
    if (!q) {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
        debounceTimer = null
      }
      loadFirstPage()
      return
    }

    // Instant client filter while debouncing server lookup
    items.value = filterLoadedItems(q, currentFilter())
    hasMore.value = false

    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      runSearch()
    }, 220)
  })

  if (filterRef) {
    watch(filterRef, () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      items.value = []
      unfilteredLoadedItems.value = []
      reload()
    })
  }

  function connectObserver(el) {
    if (observer) {
      observer.disconnect()
      observer = null
    }
    if (!el || typeof IntersectionObserver === 'undefined') return

    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadNextPage()
        }
      },
      { rootMargin: '360px 0px' }
    )
    observer.observe(el)
  }

  watch(sentinelRef, (el) => {
    connectObserver(el)
  })

  onMounted(() => {
    loadFirstPage()
    if (sentinelRef.value) connectObserver(sentinelRef.value)
  })

  onBeforeUnmount(() => {
    if (debounceTimer) clearTimeout(debounceTimer)
    if (observer) observer.disconnect()
  })

  return {
    items,
    loading,
    loadingMore,
    searching,
    hasMore,
    keyword,
    sentinelRef,
    loadNextPage,
    triggerSearchNow,
    reload
  }
}
