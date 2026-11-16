export function installClientGuards() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  // 1. Block F12 and Inspect/Console/Source shortcuts (allow PC browser zoom shortcuts)
  window.addEventListener(
    'keydown',
    (e) => {
      const key = String(e.key || '').toLowerCase()
      const code = e.keyCode || e.which
      const mod = e.ctrlKey || e.metaKey

      // F12
      if (e.key === 'F12' || code === 123) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }

      // DevTools & View Source shortcuts:
      // Ctrl/Cmd + Shift + I / J / C / K (or Cmd + Alt + I / J / C / U on macOS)
      if (
        (mod && e.shiftKey && ['i', 'j', 'c', 'k'].includes(key)) ||
        (e.metaKey && e.altKey && ['i', 'j', 'c', 'u'].includes(key)) ||
        (mod && !e.shiftKey && ['u', 's'].includes(key))
      ) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
    },
    { capture: true }
  )

  // 2. Block right-click context menu (prevents Right-click -> Inspect)
  document.addEventListener(
    'contextmenu',
    (e) => {
      e.preventDefault()
    },
    { capture: true }
  )

  // 3. Keep pinch-to-zoom blocked on mobile/touch devices, while allowing zoom on PC
  const isTouchMobile = () =>
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(hover: none) and (pointer: coarse)').matches

  const blockGesture = (e) => {
    if (isTouchMobile()) {
      e.preventDefault()
    }
  }
  document.addEventListener('gesturestart', blockGesture, { passive: false })
  document.addEventListener('gesturechange', blockGesture, { passive: false })
  document.addEventListener('gestureend', blockGesture, { passive: false })

  document.addEventListener(
    'touchmove',
    (e) => {
      if (isTouchMobile() && e.touches && e.touches.length > 1) {
        e.preventDefault()
      }
    },
    { passive: false }
  )
}
