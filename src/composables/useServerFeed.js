import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

export function useServerFeed({ fetchPage, searchFn, filterRef, batchSize = 6 }) {
  const items = ref([])
  const loading = ref(true)
  const loadingMore = ref(false)
  const hasMore = ref(false)
  const cursorKey = ref(null)
  const keyword = ref('')
  const sentinelRef = ref(null)

  let observer = null
  let debounceTimer = null
  let activeReqId = 0

  async function loadFirstPage() {
    const reqId = ++activeReqId
    loading.value = true
    cursorKey.value = null
    try {
      const res = await fetchPage({
        batchSize,
        cursorKey: null,
        filter: filterRef ? filterRef.value : 'all'
      })
      if (reqId !== activeReqId) return
      items.value = res.items
      hasMore.value = res.hasMore
      cursorKey.value = res.nextCursor
    } finally {
      if (reqId === activeReqId) loading.value = false
    }
  }

  async function loadNextPage() {
    if (loading.value || loadingMore.value || !hasMore.value || !cursorKey.value) return
    if (keyword.value.trim()) return

    const reqId = activeReqId
    loadingMore.value = true
    try {
      const res = await fetchPage({
        batchSize,
        cursorKey: cursorKey.value,
        filter: filterRef ? filterRef.value : 'all'
      })
      if (reqId !== activeReqId) return
      const existingIds = new Set(items.value.map((x) => x.id))
      const fresh = res.items.filter((x) => !existingIds.has(x.id))
      items.value = [...items.value, ...fresh]
      hasMore.value = res.hasMore
      cursorKey.value = res.nextCursor
    } finally {
      if (reqId === activeReqId) loadingMore.value = false
    }
  }

  async function runSearch() {
    if (typeof searchFn !== 'function') {
      await loadFirstPage()
      return
    }
    const q = keyword.value.trim()
    if (!q) {
      await loadFirstPage()
      return
    }
    const reqId = ++activeReqId
    loading.value = true
    hasMore.value = false
    cursorKey.value = null
    try {
      const found = await searchFn(q, filterRef ? filterRef.value : 'all')
      if (reqId !== activeReqId) return
      items.value = found
    } finally {
      if (reqId === activeReqId) loading.value = false
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
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      runSearch()
    }, 280)
  })

  if (filterRef) {
    watch(filterRef, () => {
      if (debounceTimer) clearTimeout(debounceTimer)
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
      { rootMargin: '280px 0px' }
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
    hasMore,
    keyword,
    sentinelRef,
    loadNextPage,
    triggerSearchNow,
    reload
  }
}
