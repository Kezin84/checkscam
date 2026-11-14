export function installClientGuards() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  // 1. Block F12, Inspect/Console/Source shortcuts, and Ctrl/Cmd +/-/0 zoom
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

      // Keyboard zoom: Ctrl/Cmd + (+, =, -, _, 0)
      if (
        mod &&
        (['+', '=', '-', '_', '0'].includes(key) ||
          [187, 189, 107, 109, 48, 96].includes(code))
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

  // 3. Block Ctrl + Mouse Wheel & Trackpad pinch-to-zoom on desktop
  window.addEventListener(
    'wheel',
    (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
      }
    },
    { passive: false, capture: true }
  )

  // 4. Block pinch-to-zoom on iOS Safari & mobile browsers
  const blockGesture = (e) => {
    e.preventDefault()
  }
  document.addEventListener('gesturestart', blockGesture, { passive: false })
  document.addEventListener('gesturechange', blockGesture, { passive: false })
  document.addEventListener('gestureend', blockGesture, { passive: false })

  document.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches && e.touches.length > 1) {
        e.preventDefault()
      }
    },
    { passive: false }
  )
}
