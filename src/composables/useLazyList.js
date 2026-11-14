import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

export function useLazyList(sourceRef, batchSize = 6) {
  const visibleCount = ref(batchSize)
  const sentinelRef = ref(null)
  let observer = null

  const visibleItems = computed(() => {
    const list = Array.isArray(sourceRef.value) ? sourceRef.value : []
    return list.slice(0, visibleCount.value)
  })

  const hasMore = computed(() => {
    const list = Array.isArray(sourceRef.value) ? sourceRef.value : []
    return visibleCount.value < list.length
  })

  const remainingCount = computed(() => {
    const list = Array.isArray(sourceRef.value) ? sourceRef.value : []
    return Math.max(0, list.length - visibleCount.value)
  })

  function loadMore() {
    const total = Array.isArray(sourceRef.value) ? sourceRef.value.length : 0
    if (visibleCount.value < total) {
      visibleCount.value = Math.min(total, visibleCount.value + batchSize)
    }
  }

  function reset() {
    visibleCount.value = batchSize
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
          loadMore()
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
    if (sentinelRef.value) connectObserver(sentinelRef.value)
  })

  onBeforeUnmount(() => {
    if (observer) observer.disconnect()
  })

  return {
    visibleItems,
    hasMore,
    remainingCount,
    sentinelRef,
    loadMore,
    reset
  }
}
