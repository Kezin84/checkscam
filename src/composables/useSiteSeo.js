import { computed, ref } from 'vue'
import { useRepository } from '@/services/repository'
import {
  resolveRouteSeo,
  buildFaviconVariantUrl,
  buildJsonLdGraph,
  normalizeTelegramContact
} from '@/utils/seoConfig'

const lastSeoContext = ref({
  routeName: 'home',
  path: '/',
  dynamicType: null,
  dynamicItem: null
})

function upsertMetaTag(attrName, attrValue, content) {
  if (typeof document === 'undefined') return
  const selector = `meta[${attrName}="${attrValue}"]`
  let el = document.head.querySelector(selector)
  const clean = String(content || '').trim()
  if (!clean) {
    if (el) el.remove()
    return
  }
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attrName, attrValue)
    document.head.appendChild(el)
  }
  el.setAttribute('content', clean)
}

function upsertLinkTag(selector, attrs) {
  if (typeof document === 'undefined') return
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('link')
    document.head.appendChild(el)
  }
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === '') {
      el.removeAttribute(k)
    } else {
      el.setAttribute(k, String(v))
    }
  }
}

export function applyClientSeo(context = null) {
  if (context) {
    lastSeoContext.value = {
      routeName: context.routeName || 'home',
      path: context.path || '/',
      dynamicType: context.dynamicType || null,
      dynamicItem: context.dynamicItem || null
    }
  }
  if (typeof document === 'undefined') return

  const { seoSettings } = useRepository()
  const settings = seoSettings.value
  const resolved = resolveRouteSeo(settings, lastSeoContext.value)
  const base = settings.canonicalBase

  document.documentElement.lang = settings.language || 'vi'
  document.title = resolved.title

  upsertMetaTag('name', 'theme-color', settings.themeColor)
  upsertMetaTag('name', 'application-name', settings.siteName)
  upsertMetaTag('name', 'description', resolved.description)
  upsertMetaTag('name', 'keywords', resolved.keywords)
  upsertMetaTag('name', 'robots', resolved.robots)

  upsertLinkTag('link[rel="canonical"]', {
    rel: 'canonical',
    href: resolved.canonical
  })

  // Open Graph
  upsertMetaTag('property', 'og:site_name', settings.siteName)
  upsertMetaTag('property', 'og:locale', settings.locale)
  upsertMetaTag('property', 'og:type', resolved.ogType)
  upsertMetaTag('property', 'og:url', resolved.canonical)
  upsertMetaTag('property', 'og:title', resolved.ogTitle || resolved.title)
  upsertMetaTag('property', 'og:description', resolved.ogDescription || resolved.description)
  upsertMetaTag('property', 'og:image', resolved.ogImage)
  upsertMetaTag('property', 'og:image:alt', resolved.ogTitle || resolved.title)

  // Twitter
  upsertMetaTag('name', 'twitter:card', settings.twitterCard)
  if (settings.twitterHandle) {
    const handle = settings.twitterHandle.startsWith('@')
      ? settings.twitterHandle
      : `@${settings.twitterHandle}`
    upsertMetaTag('name', 'twitter:site', handle)
  } else {
    upsertMetaTag('name', 'twitter:site', '')
  }
  upsertMetaTag('name', 'twitter:title', resolved.ogTitle || resolved.title)
  upsertMetaTag('name', 'twitter:description', resolved.ogDescription || resolved.description)
  upsertMetaTag('name', 'twitter:image', resolved.ogImage)

  // Favicons (keeps browser tab icon in sync immediately after Admin edits)
  const fav48 = buildFaviconVariantUrl(settings.faviconUrl, 48, base)
  const fav96 = buildFaviconVariantUrl(settings.faviconUrl, 96, base)
  const fav192 = buildFaviconVariantUrl(settings.faviconUrl, 192, base)
  const fav180 = buildFaviconVariantUrl(settings.faviconUrl, 180, base)

  upsertLinkTag('link[rel="icon"]:not([type="image/png"])', {
    rel: 'icon',
    sizes: '48x48',
    href: fav48
  })
  upsertLinkTag('link[rel="icon"][sizes="48x48"][type="image/png"]', {
    rel: 'icon',
    type: 'image/png',
    sizes: '48x48',
    href: fav48
  })
  upsertLinkTag('link[rel="icon"][sizes="96x96"][type="image/png"]', {
    rel: 'icon',
    type: 'image/png',
    sizes: '96x96',
    href: fav96
  })
  upsertLinkTag('link[rel="icon"][sizes="192x192"][type="image/png"]', {
    rel: 'icon',
    type: 'image/png',
    sizes: '192x192',
    href: fav192
  })
  upsertLinkTag('link[rel="apple-touch-icon"]', {
    rel: 'apple-touch-icon',
    sizes: '180x180',
    href: fav180
  })

  // JSON-LD Structured Data
  const existingLd = document.head.querySelector('script[type="application/ld+json"][data-seo-ld="true"]')
  if (resolved.isAdmin) {
    if (existingLd) existingLd.remove()
  } else {
    const graph = buildJsonLdGraph(settings)
    if (graph) {
      let ldEl = existingLd
      if (!ldEl) {
        ldEl = document.createElement('script')
        ldEl.setAttribute('type', 'application/ld+json')
        ldEl.setAttribute('data-seo-ld', 'true')
        document.head.appendChild(ldEl)
      }
      ldEl.textContent = JSON.stringify(graph)
    } else if (existingLd) {
      existingLd.remove()
    }
  }
}

export function useSiteSeo() {
  const { seoSettings, seoLoaded } = useRepository()

  const siteName = computed(() => seoSettings.value.siteName || 'CHECK LỪA ĐẢO')
  const logoUrl = computed(() => seoSettings.value.logoUrl || '/logo.jpg')
  const footerTagline = computed(() => seoSettings.value.footerTagline || '')
  const contactTelegram = computed(() =>
    normalizeTelegramContact(
      seoSettings.value.contactTelegramHandle,
      seoSettings.value.contactTelegramUrl
    )
  )

  return {
    seoSettings,
    seoLoaded,
    siteName,
    logoUrl,
    footerTagline,
    contactTelegram,
    applyClientSeo
  }
}
