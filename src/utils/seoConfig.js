/**
 * Shared isomorphic SEO & Site Settings configuration and builders.
 * Used by BOTH the Vue 3 SPA client AND Cloudflare Worker edge HTML/crawl handler.
 * Must stay pure JS (no browser DOM / Firebase SDK dependencies).
 */

export const SEO_ROUTE_KEYS = ['home', 'shops', 'alerts', 'report']

export const SEO_ROUTE_META = {
  home: {
    key: 'home',
    path: '/',
    label: 'Trang chủ (Tra cứu)',
    defaultChangefreq: 'daily',
    defaultPriority: '1.0'
  },
  shops: {
    key: 'shops',
    path: '/shops',
    label: 'Shop uy tín',
    defaultChangefreq: 'daily',
    defaultPriority: '0.9'
  },
  alerts: {
    key: 'alerts',
    path: '/alerts',
    label: 'Danh sách lừa đảo',
    defaultChangefreq: 'daily',
    defaultPriority: '0.9'
  },
  report: {
    key: 'report',
    path: '/report',
    label: 'Gửi tố cáo',
    defaultChangefreq: 'monthly',
    defaultPriority: '0.7'
  }
}

export const DEFAULT_SEO_SETTINGS = {
  // 1. Brand & SERP Identity (also synced to Header / Footer / Verification contact)
  siteName: 'CHECK LỪA ĐẢO',
  alternateNames: ['Check Lừa Đảo', 'CheckScam Philippines', 'checkluadao.online'],
  canonicalBase: 'https://checkluadao.online',
  locale: 'vi_VN',
  language: 'vi',
  themeColor: '#f7f9fa',
  logoUrl: '/logo.jpg',
  faviconUrl: '/favicon-192.png',
  ogImageUrl: '/logo.jpg',
  twitterCard: 'summary_large_image',
  twitterHandle: '',

  // Synced contact & footer branding
  contactTelegramHandle: 'dakv88',
  contactTelegramUrl: 'https://t.me/dakv88',
  footerTagline:
    'Cổng tra cứu thông tin Shop Việt uy tín tại Philippines, hỗ trợ đối chiếu số tài khoản ngân hàng, ví GCash, liên kết mạng xã hội và danh sách lừa đảo phục vụ cộng đồng người Việt tại Philippines.',

  // 2. Per-route SEO metadata
  routes: {
    home: {
      title: 'CHECK LỪA ĐẢO: Tra cứu Shop Việt tại Philippines',
      description:
        'Tra cứu STK ngân hàng, ví GCash, Telegram, Zalo, Facebook. Đối chiếu danh bạ Shop Việt uy tín và danh sách cảnh báo lừa đảo tại Philippines.',
      ogTitle: '',
      ogDescription: '',
      ogImage: '',
      keywords:
        'check lừa đảo, tra cứu shop việt philippines, check scam philippines, đổi peso vnd uy tín, tra cứu stk lừa đảo, gcash lừa đảo',
      robots: 'index, follow'
    },
    shops: {
      title: 'Shop uy tín tại Philippines — CHECK LỪA ĐẢO',
      description:
        'Danh bạ Shop Việt tại Philippines đã xác minh STK ngân hàng, ví GCash và kênh liên hệ chính chủ: đổi Peso-VND, đồ ăn Việt, đặt vé, thuê condo.',
      ogTitle: '',
      ogDescription: '',
      ogImage: '',
      keywords: 'shop việt tại philippines, shop uy tín philippines, đổi tiền peso vnd uy tín',
      robots: 'index, follow'
    },
    alerts: {
      title: 'Danh sách lừa đảo tại Philippines — CHECK LỪA ĐẢO',
      description:
        'Tổng hợp hồ sơ cảnh báo lừa đảo cộng đồng người Việt tại Philippines đã kiểm duyệt: STK ngân hàng, GCash, Telegram, Zalo, Facebook kèm bằng chứng.',
      ogTitle: '',
      ogDescription: '',
      ogImage: '',
      keywords: 'danh sách lừa đảo philippines, cảnh báo scam, check stk lừa đảo',
      robots: 'index, follow'
    },
    report: {
      title: 'Gửi tố cáo lừa đảo — CHECK LỪA ĐẢO',
      description:
        'Gửi báo cáo đối tượng lừa đảo kèm STK ngân hàng, GCash, tài khoản MXH và ảnh bằng chứng để cảnh báo cộng đồng người Việt tại Philippines.',
      ogTitle: '',
      ogDescription: '',
      ogImage: '',
      keywords: 'gửi tố cáo lừa đảo, báo cáo scam philippines',
      robots: 'index, follow'
    }
  },

  // Dynamic detail SEO templates (/shops/:id & /alerts/:id)
  dynamicTemplates: {
    enabled: true,
    useRecordImageForOg: true,
    shopTitleTemplate: '{name} — Shop uy tín | {siteName}',
    shopDescriptionTemplate:
      'Thông tin xác minh {name} ({category}). Đối chiếu STK ngân hàng chính chủ, ví GCash và kênh liên hệ trên {siteName}.',
    alertTitleTemplate: 'Cảnh báo lừa đảo: {name} — {siteName}',
    alertDescriptionTemplate:
      'Hồ sơ cảnh báo {name} ({scamType}). Kiểm tra STK nhận tiền, tài khoản MXH và bằng chứng đã kiểm duyệt trên {siteName}.'
  },

  // 3. Structured Data (JSON-LD)
  schema: {
    enableWebsiteSchema: true,
    enableSearchAction: true,
    enableOrganizationSchema: true,
    organizationName: 'CHECK LỪA ĐẢO',
    organizationDescription:
      'Cổng tra cứu thông tin Shop Việt uy tín và danh sách cảnh báo lừa đảo phục vụ cộng đồng người Việt tại Philippines.',
    sameAs: ['https://t.me/dakv88']
  },

  // 4. Verification, Analytics & Crawlers
  verification: {
    google: '',
    bing: '',
    facebook: ''
  },
  analytics: {
    enabled: true,
    ga4Id: 'G-GFSB2HMFT2',
    gtmId: 'GTM-T32FSTC5'
  },
  customHeadHtml: '',

  robots: {
    useCustom: false,
    content: ''
  },
  sitemap: {
    enabled: true,
    includeDynamicShops: true,
    includeDynamicAlerts: true,
    routes: {
      home: { include: true, changefreq: 'daily', priority: '1.0' },
      shops: { include: true, changefreq: 'daily', priority: '0.9' },
      alerts: { include: true, changefreq: 'daily', priority: '0.9' },
      report: { include: true, changefreq: 'monthly', priority: '0.7' }
    }
  },
  llms: {
    useCustom: false,
    content: ''
  },

  updatedAt: 0
}

export function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function escapeAttr(value = '') {
  return escapeHtml(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export function escapeXml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function serializeJsonForScript(data) {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

export function normalizeCanonicalBase(raw = '') {
  let clean = String(raw || '').trim()
  if (!clean) return DEFAULT_SEO_SETTINGS.canonicalBase
  if (!/^https?:\/\//i.test(clean)) {
    clean = `https://${clean}`
  }
  try {
    const u = new URL(clean)
    return `${u.protocol}//${u.host}`
  } catch {
    return DEFAULT_SEO_SETTINGS.canonicalBase
  }
}

export function resolveAbsoluteUrl(rawUrl = '', canonicalBase = DEFAULT_SEO_SETTINGS.canonicalBase) {
  const base = normalizeCanonicalBase(canonicalBase)
  const clean = String(rawUrl || '').trim()
  if (!clean) return `${base}/logo.jpg`
  if (/^https?:\/\//i.test(clean)) return clean
  if (clean.startsWith('//')) return `https:${clean}`
  if (clean.startsWith('/')) return `${base}${clean}`
  return `${base}/${clean}`
}

export function extractMetaVerificationCode(raw = '') {
  const clean = String(raw || '').trim()
  if (!clean) return ''
  // If admin pastes a full <meta name="..." content="XYZ" />, extract XYZ cleanly
  const contentMatch = clean.match(/content\s*=\s*["']([^"']+)["']/i)
  if (contentMatch && contentMatch[1]) {
    return contentMatch[1].trim()
  }
  return clean.replace(/["'<>]/g, '').trim()
}

export function sanitizeAnalyticsId(raw = '', prefix = '') {
  const clean = String(raw || '').trim().toUpperCase()
  if (!clean) return ''
  if (prefix === 'G-') {
    return /^G-[A-Z0-9]{4,20}$/.test(clean) ? clean : ''
  }
  if (prefix === 'GTM-') {
    return /^GTM-[A-Z0-9]{4,20}$/.test(clean) ? clean : ''
  }
  return ''
}

export function normalizeTelegramContact(handleInput = '', urlInput = '') {
  const rawHandle = String(handleInput || '').trim()
  const rawUrl = String(urlInput || '').trim()

  let handle = rawHandle
    .replace(/^https?:\/\/(t\.me|telegram\.me)\//i, '')
    .replace(/^@+/, '')
    .split(/[/?#]/)[0]
    .trim()

  if (!handle && rawUrl) {
    const m = rawUrl.match(/(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]+)/i)
    if (m && m[1]) handle = m[1]
  }
  if (!handle) handle = DEFAULT_SEO_SETTINGS.contactTelegramHandle

  let url = rawUrl
  if (!url) {
    url = `https://t.me/${handle}`
  } else if (!/^https?:\/\//i.test(url)) {
    url = `https://${url.replace(/^\/+/, '')}`
  }

  const shortUrl = url.replace(/^https?:\/\//i, '').replace(/\/+$/, '')
  return {
    handle,
    displayHandle: `@${handle}`,
    url,
    shortUrl
  }
}

function normalizeStringList(list, fallback = []) {
  const rawArr = Array.isArray(list)
    ? list
    : typeof list === 'string'
      ? list.split(/[\n,]+/)
      : fallback

  const seen = new Set()
  const out = []
  for (const item of rawArr) {
    const clean = String(item || '').trim()
    if (!clean) continue
    const key = clean.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(clean)
  }
  return out
}

const VALID_CHANGEFREQ = new Set(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'])

function normalizePriority(val, fallback = '0.8') {
  const num = Number(val)
  if (Number.isNaN(num) || num < 0 || num > 1) return fallback
  return num.toFixed(1)
}

export function normalizeSeoSettings(raw = null) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const d = DEFAULT_SEO_SETTINGS
  const isPersisted = Number(src.updatedAt || 0) > 0

  const canonicalBase = normalizeCanonicalBase(src.canonicalBase || d.canonicalBase)
  const siteName = String(src.siteName || '').trim() || d.siteName
  const alternateNames =
    src.alternateNames !== undefined
      ? normalizeStringList(src.alternateNames, [])
      : isPersisted
        ? []
        : [...d.alternateNames]

  const telegram = normalizeTelegramContact(
    src.contactTelegramHandle ?? d.contactTelegramHandle,
    src.contactTelegramUrl ?? ''
  )

  const themeColorRaw = String(src.themeColor || '').trim()
  const themeColor = /^#[0-9a-fA-F]{3,8}$/.test(themeColorRaw) ? themeColorRaw : d.themeColor

  const twitterCard =
    src.twitterCard === 'summary' || src.twitterCard === 'summary_large_image'
      ? src.twitterCard
      : d.twitterCard

  const routes = {}
  for (const key of SEO_ROUTE_KEYS) {
    const defRoute = d.routes[key]
    const rawRoute = src.routes && typeof src.routes[key] === 'object' ? src.routes[key] : {}
    routes[key] = {
      title: String(rawRoute.title ?? defRoute.title).trim() || defRoute.title,
      description: String(rawRoute.description ?? defRoute.description).trim(),
      ogTitle: String(rawRoute.ogTitle ?? '').trim(),
      ogDescription: String(rawRoute.ogDescription ?? '').trim(),
      ogImage: String(rawRoute.ogImage ?? '').trim(),
      keywords: String(rawRoute.keywords ?? defRoute.keywords).trim(),
      robots: String(rawRoute.robots ?? defRoute.robots).trim() || 'index, follow'
    }
  }

  const rawDyn = src.dynamicTemplates && typeof src.dynamicTemplates === 'object' ? src.dynamicTemplates : {}
  const dynamicTemplates = {
    enabled: rawDyn.enabled !== false,
    useRecordImageForOg: rawDyn.useRecordImageForOg !== false,
    shopTitleTemplate:
      String(rawDyn.shopTitleTemplate ?? d.dynamicTemplates.shopTitleTemplate).trim() ||
      d.dynamicTemplates.shopTitleTemplate,
    shopDescriptionTemplate:
      String(rawDyn.shopDescriptionTemplate ?? d.dynamicTemplates.shopDescriptionTemplate).trim() ||
      d.dynamicTemplates.shopDescriptionTemplate,
    alertTitleTemplate:
      String(rawDyn.alertTitleTemplate ?? d.dynamicTemplates.alertTitleTemplate).trim() ||
      d.dynamicTemplates.alertTitleTemplate,
    alertDescriptionTemplate:
      String(rawDyn.alertDescriptionTemplate ?? d.dynamicTemplates.alertDescriptionTemplate).trim() ||
      d.dynamicTemplates.alertDescriptionTemplate
  }

  const rawSchema = src.schema && typeof src.schema === 'object' ? src.schema : {}
  const schema = {
    enableWebsiteSchema: rawSchema.enableWebsiteSchema !== false,
    enableSearchAction: rawSchema.enableSearchAction !== false,
    enableOrganizationSchema: rawSchema.enableOrganizationSchema !== false,
    organizationName: String(rawSchema.organizationName ?? '').trim() || siteName,
    organizationDescription:
      String(rawSchema.organizationDescription ?? d.schema.organizationDescription).trim() ||
      d.schema.organizationDescription,
    sameAs:
      rawSchema.sameAs !== undefined
        ? normalizeStringList(rawSchema.sameAs, []).filter((u) => /^https?:\/\//i.test(u))
        : isPersisted
          ? []
          : [...d.schema.sameAs]
  }

  const rawVer = src.verification && typeof src.verification === 'object' ? src.verification : {}
  const verification = {
    google: extractMetaVerificationCode(rawVer.google || ''),
    bing: extractMetaVerificationCode(rawVer.bing || ''),
    facebook: extractMetaVerificationCode(rawVer.facebook || '')
  }

  const rawAna = src.analytics && typeof src.analytics === 'object' ? src.analytics : {}
  const analytics = {
    enabled: rawAna.enabled !== false,
    ga4Id:
      rawAna.ga4Id !== undefined
        ? sanitizeAnalyticsId(rawAna.ga4Id, 'G-')
        : d.analytics.ga4Id,
    gtmId:
      rawAna.gtmId !== undefined
        ? sanitizeAnalyticsId(rawAna.gtmId, 'GTM-')
        : d.analytics.gtmId
  }

  const rawRobots = src.robots && typeof src.robots === 'object' ? src.robots : {}
  const robots = {
    useCustom: Boolean(rawRobots.useCustom),
    content: String(rawRobots.content || '').trim()
  }

  const rawSitemap = src.sitemap && typeof src.sitemap === 'object' ? src.sitemap : {}
  const sitemapRoutes = {}
  for (const key of SEO_ROUTE_KEYS) {
    const defSm = d.sitemap.routes[key]
    const curSm =
      rawSitemap.routes && typeof rawSitemap.routes[key] === 'object' ? rawSitemap.routes[key] : {}
    const cf = String(curSm.changefreq || defSm.changefreq).trim().toLowerCase()
    sitemapRoutes[key] = {
      include: curSm.include !== false,
      changefreq: VALID_CHANGEFREQ.has(cf) ? cf : defSm.changefreq,
      priority: normalizePriority(curSm.priority ?? defSm.priority, defSm.priority)
    }
  }
  const sitemap = {
    enabled: rawSitemap.enabled !== false,
    includeDynamicShops: rawSitemap.includeDynamicShops !== false,
    includeDynamicAlerts: rawSitemap.includeDynamicAlerts !== false,
    routes: sitemapRoutes
  }

  const rawLlms = src.llms && typeof src.llms === 'object' ? src.llms : {}
  const llms = {
    useCustom: Boolean(rawLlms.useCustom),
    content: String(rawLlms.content || '').trim()
  }

  return {
    siteName,
    alternateNames,
    canonicalBase,
    locale: String(src.locale || d.locale).trim() || d.locale,
    language: String(src.language || d.language).trim() || d.language,
    themeColor,
    logoUrl: String(src.logoUrl || '').trim() || d.logoUrl,
    faviconUrl: String(src.faviconUrl || '').trim() || d.faviconUrl,
    ogImageUrl: String(src.ogImageUrl || '').trim() || d.ogImageUrl,
    twitterCard,
    twitterHandle: String(src.twitterHandle || '').trim(),
    contactTelegramHandle: telegram.handle,
    contactTelegramUrl: telegram.url,
    footerTagline: String(src.footerTagline ?? d.footerTagline).trim() || d.footerTagline,
    routes,
    dynamicTemplates,
    schema,
    verification,
    analytics,
    customHeadHtml: String(src.customHeadHtml || '').trim(),
    robots,
    sitemap,
    llms,
    updatedAt: Number(src.updatedAt || 0)
  }
}

/**
 * Strip existing Cloudinary transformation segment (if present) and inject a clean transform.
 */
function transformCloudinaryImage(rawUrl = '', transform = '') {
  const clean = String(rawUrl || '').trim()
  if (!clean || !clean.includes('res.cloudinary.com') || !clean.includes('/image/upload/')) {
    return clean
  }
  const marker = '/image/upload/'
  const idx = clean.indexOf(marker)
  if (idx === -1) return clean
  const prefix = clean.slice(0, idx + marker.length)
  let rest = clean.slice(idx + marker.length)
  // Remove existing transform segment before version (v123456/...) or public_id
  const segments = rest.split('/')
  if (segments.length > 1 && !/^v\d+$/.test(segments[0]) && segments[0].includes('_')) {
    segments.shift()
    rest = segments.join('/')
  }
  return `${prefix}${transform}/${rest}`
}

export function buildFaviconVariantUrl(rawUrl, size = 48, canonicalBase = DEFAULT_SEO_SETTINGS.canonicalBase) {
  const clean = String(rawUrl || '').trim()
  const base = normalizeCanonicalBase(canonicalBase)

  // Default static local icon -> use pre-generated Google-compliant PNG sizes
  if (!clean || clean === '/logo.jpg' || clean === '/favicon-192.png' || clean === '/favicon.svg') {
    if (size === 48) return `${base}/favicon-48.png`
    if (size === 96) return `${base}/favicon-96.png`
    if (size === 180) return `${base}/apple-touch-icon.png`
    return `${base}/favicon-192.png`
  }

  if (clean.includes('res.cloudinary.com') && clean.includes('/image/upload/')) {
    return transformCloudinaryImage(clean, `f_png,q_auto:best,w_${size},h_${size},c_fill,g_center`)
  }

  return resolveAbsoluteUrl(clean, base)
}

export function buildOgImageUrl(rawUrl, canonicalBase = DEFAULT_SEO_SETTINGS.canonicalBase) {
  const clean = String(rawUrl || '').trim()
  const base = normalizeCanonicalBase(canonicalBase)
  if (!clean) return `${base}/logo.jpg`

  if (clean.includes('res.cloudinary.com') && clean.includes('/image/upload/')) {
    return transformCloudinaryImage(clean, 'f_jpg,q_auto:good,w_1200,h_630,c_limit')
  }

  return resolveAbsoluteUrl(clean, base)
}

export function formatAmountCompactVi(amount) {
  const num = Number(String(amount || '').replace(/[^\d]/g, ''))
  if (!num || Number.isNaN(num)) return ''
  return `${new Intl.NumberFormat('vi-VN').format(num)} ₫`
}

export function interpolateSeoTemplate(template = '', vars = {}) {
  let out = String(template || '')
  for (const [key, value] of Object.entries(vars)) {
    const replacement = String(value ?? '').trim()
    out = out.replace(new RegExp(`\\{${key}\\}`, 'g'), replacement)
  }
  // Clean up empty parentheses, dangling separators, and extra whitespace when optional vars are blank
  return out
    .replace(/\(\s*\)/g, '')
    .replace(/\[\s*\]/g, '')
    .replace(/\s*·\s*(?=[.,]|$)/g, '')
    .replace(/\s+([.,;:])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function truncateSeoText(text = '', maxLen = 160) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  if (clean.length <= maxLen) return clean
  return `${clean.slice(0, maxLen - 1).trimEnd()}…`
}

export function matchPathnameToRouteKey(pathname = '/') {
  const clean = String(pathname || '/').replace(/\/+$/, '') || '/'
  if (clean === '/') return { routeKey: 'home', dynamicType: null, dynamicId: '' }
  if (clean === '/shops') return { routeKey: 'shops', dynamicType: null, dynamicId: '' }
  if (clean.startsWith('/shops/')) {
    const rawId = clean.slice('/shops/'.length).split('/')[0]
    let id = rawId
    try {
      id = decodeURIComponent(rawId)
    } catch {
      id = rawId
    }
    return { routeKey: 'shops', dynamicType: 'shop', dynamicId: id }
  }
  if (clean === '/alerts') return { routeKey: 'alerts', dynamicType: null, dynamicId: '' }
  if (clean.startsWith('/alerts/')) {
    const rawId = clean.slice('/alerts/'.length).split('/')[0]
    let id = rawId
    try {
      id = decodeURIComponent(rawId)
    } catch {
      id = rawId
    }
    return { routeKey: 'alerts', dynamicType: 'alert', dynamicId: id }
  }
  if (clean === '/report') return { routeKey: 'report', dynamicType: null, dynamicId: '' }
  if (clean === '/admin' || clean.startsWith('/admin/')) {
    return { routeKey: 'admin', dynamicType: null, dynamicId: '' }
  }
  return { routeKey: 'home', dynamicType: null, dynamicId: '' }
}

/**
 * Resolve final SEO metadata for a route (static route or dynamic /shops/:id, /alerts/:id, or /admin).
 */
export function resolveRouteSeo(
  rawSettings,
  { routeName = 'home', path = '/', dynamicType = null, dynamicItem = null } = {}
) {
  const settings = normalizeSeoSettings(rawSettings)
  const base = settings.canonicalBase
  const cleanPath = String(path || '/').split('?')[0].split('#')[0] || '/'
  const normalizedPath = cleanPath === '/' ? '/' : cleanPath.replace(/\/+$/, '')

  if (routeName === 'admin' || normalizedPath === '/admin' || normalizedPath.startsWith('/admin/')) {
    return {
      routeKey: 'admin',
      siteName: settings.siteName,
      title: `Quản trị hệ thống — ${settings.siteName}`,
      description: `Bảng điều khiển quản trị hệ thống ${settings.siteName}.`,
      ogTitle: `Quản trị hệ thống — ${settings.siteName}`,
      ogDescription: `Bảng điều khiển quản trị hệ thống ${settings.siteName}.`,
      ogImage: buildOgImageUrl(settings.ogImageUrl, base),
      ogType: 'website',
      keywords: '',
      robots: 'noindex, nofollow',
      canonical: `${base}/admin`,
      isAdmin: true
    }
  }

  const key = SEO_ROUTE_KEYS.includes(routeName) ? routeName : 'home'
  const routeCfg = settings.routes[key] || settings.routes.home

  let title = routeCfg.title
  let description = routeCfg.description
  let ogTitle = routeCfg.ogTitle || routeCfg.title
  let ogDescription = routeCfg.ogDescription || routeCfg.description
  let ogImageRaw = routeCfg.ogImage || settings.ogImageUrl
  let ogType = 'website'
  let canonical = normalizedPath === '/' ? `${base}/` : `${base}${normalizedPath}`

  // Apply dynamic detail page templates when record is loaded
  if (settings.dynamicTemplates.enabled && dynamicItem && typeof dynamicItem === 'object') {
    if (dynamicType === 'shop' && dynamicItem.shopName) {
      const vars = {
        name: dynamicItem.shopName,
        siteName: settings.siteName,
        category: dynamicItem.category || '',
        owner: dynamicItem.ownerName || '',
        address: dynamicItem.address || '',
        description: truncateSeoText(dynamicItem.description || '', 120)
      }
      title = interpolateSeoTemplate(settings.dynamicTemplates.shopTitleTemplate, vars) || title
      description =
        truncateSeoText(
          interpolateSeoTemplate(settings.dynamicTemplates.shopDescriptionTemplate, vars),
          160
        ) || description
      ogTitle = title
      ogDescription = description
      ogType = 'profile'
      if (settings.dynamicTemplates.useRecordImageForOg) {
        const candidateImg = dynamicItem.coverImage || dynamicItem.avatar || ''
        if (candidateImg) ogImageRaw = candidateImg
      }
    } else if (dynamicType === 'alert' && dynamicItem.subjectName) {
      const vars = {
        name: dynamicItem.subjectName,
        siteName: settings.siteName,
        scamType: dynamicItem.scamType || '',
        amount: formatAmountCompactVi(dynamicItem.scamAmount),
        description: truncateSeoText(dynamicItem.description || '', 120)
      }
      title = interpolateSeoTemplate(settings.dynamicTemplates.alertTitleTemplate, vars) || title
      description =
        truncateSeoText(
          interpolateSeoTemplate(settings.dynamicTemplates.alertDescriptionTemplate, vars),
          160
        ) || description
      ogTitle = title
      ogDescription = description
      ogType = 'article'
      if (settings.dynamicTemplates.useRecordImageForOg) {
        const firstEvidence =
          Array.isArray(dynamicItem.evidenceImages) && dynamicItem.evidenceImages[0]
            ? dynamicItem.evidenceImages[0]
            : ''
        if (firstEvidence) ogImageRaw = firstEvidence
      }
    }
  }

  return {
    routeKey: key,
    siteName: settings.siteName,
    title,
    description,
    ogTitle,
    ogDescription,
    ogImage: buildOgImageUrl(ogImageRaw, base),
    ogType,
    keywords: routeCfg.keywords || '',
    robots: routeCfg.robots || 'index, follow',
    canonical,
    isAdmin: false
  }
}

export function buildJsonLdGraph(rawSettings) {
  const settings = normalizeSeoSettings(rawSettings)
  const base = settings.canonicalBase
  const graph = []

  if (settings.schema.enableWebsiteSchema) {
    const websiteNode = {
      '@type': 'WebSite',
      '@id': `${base}/#website`,
      url: `${base}/`,
      name: settings.siteName,
      inLanguage: settings.language || 'vi'
    }
    if (settings.alternateNames.length) {
      websiteNode.alternateName =
        settings.alternateNames.length === 1 ? settings.alternateNames[0] : settings.alternateNames
    }
    if (settings.routes.home?.description) {
      websiteNode.description = settings.routes.home.description
    }
    if (settings.schema.enableSearchAction) {
      websiteNode.potentialAction = {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${base}/?q={search_term_string}`
        },
        'query-input': 'required name=search_term_string'
      }
    }
    graph.push(websiteNode)
  }

  if (settings.schema.enableOrganizationSchema) {
    const orgNode = {
      '@type': 'Organization',
      '@id': `${base}/#organization`,
      name: settings.schema.organizationName || settings.siteName,
      url: `${base}/`,
      logo: {
        '@type': 'ImageObject',
        url: buildFaviconVariantUrl(settings.logoUrl || settings.faviconUrl, 192, base)
      }
    }
    if (settings.schema.organizationDescription) {
      orgNode.description = settings.schema.organizationDescription
    }
    if (settings.schema.sameAs.length) {
      orgNode.sameAs = settings.schema.sameAs
    }
    graph.push(orgNode)
  }

  if (!graph.length) return null
  return {
    '@context': 'https://schema.org',
    '@graph': graph
  }
}

export function buildRobotsTxt(rawSettings) {
  const settings = normalizeSeoSettings(rawSettings)
  if (settings.robots.useCustom && settings.robots.content) {
    return `${settings.robots.content.trim()}\n`
  }
  const base = settings.canonicalBase
  const lines = ['User-agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /api/']
  if (settings.sitemap.enabled) {
    lines.push('', `Sitemap: ${base}/sitemap.xml`)
  }
  return `${lines.join('\n')}\n`
}

export function buildLlmsTxt(rawSettings) {
  const settings = normalizeSeoSettings(rawSettings)
  if (settings.llms.useCustom && settings.llms.content) {
    return `${settings.llms.content.trim()}\n`
  }
  const base = settings.canonicalBase
  const r = settings.routes
  const lines = [
    `# ${settings.siteName}`,
    '',
    `> ${r.home.description || settings.footerTagline}`,
    '',
    '## Trang chính',
    '',
    `- [${r.home.title}](${base}/): ${r.home.description}`,
    `- [${r.shops.title}](${base}/shops): ${r.shops.description}`,
    `- [${r.alerts.title}](${base}/alerts): ${r.alerts.description}`,
    `- [${r.report.title}](${base}/report): ${r.report.description}`
  ]
  if (settings.contactTelegramUrl) {
    lines.push('', '## Liên hệ xác minh', '', `- Telegram: ${settings.contactTelegramUrl}`)
  }
  return `${lines.join('\n')}\n`
}

function toIsoDate(timestamp) {
  const num = Number(timestamp || 0)
  if (!num || Number.isNaN(num)) return ''
  try {
    const d = new Date(num)
    if (Number.isNaN(d.getTime())) return ''
    return d.toISOString().slice(0, 10)
  } catch {
    return ''
  }
}

export function buildSitemapXml(rawSettings, entries = {}) {
  const settings = normalizeSeoSettings(rawSettings)
  const base = settings.canonicalBase
  const urls = []
  const today = new Date().toISOString().slice(0, 10)
  const seoLastMod = toIsoDate(settings.updatedAt) || today

  for (const key of SEO_ROUTE_KEYS) {
    const smRoute = settings.sitemap.routes[key]
    if (!smRoute?.include) continue
    const meta = SEO_ROUTE_META[key]
    const loc = meta.path === '/' ? `${base}/` : `${base}${meta.path}`
    urls.push({
      loc,
      lastmod: seoLastMod,
      changefreq: smRoute.changefreq,
      priority: smRoute.priority
    })
  }

  if (settings.sitemap.includeDynamicShops && entries?.shops && typeof entries.shops === 'object') {
    const shopEntries = Object.entries(entries.shops)
      .filter(([id]) => Boolean(id))
      .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
    for (const [id, ts] of shopEntries) {
      urls.push({
        loc: `${base}/shops/${encodeURIComponent(id)}`,
        lastmod: toIsoDate(ts) || today,
        changefreq: 'weekly',
        priority: '0.8'
      })
    }
  }

  if (settings.sitemap.includeDynamicAlerts && entries?.reports && typeof entries.reports === 'object') {
    const reportEntries = Object.entries(entries.reports)
      .filter(([id]) => Boolean(id))
      .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
    for (const [id, ts] of reportEntries) {
      urls.push({
        loc: `${base}/alerts/${encodeURIComponent(id)}`,
        lastmod: toIsoDate(ts) || today,
        changefreq: 'weekly',
        priority: '0.7'
      })
    }
  }

  const body = urls
    .map((u) => {
      const parts = [
        '  <url>',
        `    <loc>${escapeXml(u.loc)}</loc>`,
        u.lastmod ? `    <lastmod>${escapeXml(u.lastmod)}</lastmod>` : '',
        u.changefreq ? `    <changefreq>${escapeXml(u.changefreq)}</changefreq>` : '',
        u.priority ? `    <priority>${escapeXml(u.priority)}</priority>` : '',
        '  </url>'
      ].filter(Boolean)
      return parts.join('\n')
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
}

/**
 * Render complete managed <head> SEO & Analytics block for Cloudflare Worker edge HTML injection.
 */
export function renderSeoHeadHtml(rawSettings, resolvedSeo) {
  const settings = normalizeSeoSettings(rawSettings)
  const base = settings.canonicalBase
  const lines = []

  // Analytics (GA4 + GTM) — skip on /admin so admin traffic doesn't pollute analytics
  if (settings.analytics.enabled && !resolvedSeo.isAdmin) {
    const ga4 = settings.analytics.ga4Id
    const gtm = settings.analytics.gtmId
    if (ga4 || gtm) {
      const initParts = ['window.dataLayer = window.dataLayer || [];']
      if (ga4) {
        initParts.push('function gtag(){dataLayer.push(arguments);}')
        initParts.push("gtag('js', new Date());")
        initParts.push(`gtag('config', '${ga4}');`)
      }
      if (gtm) {
        initParts.push("dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});")
      }
      lines.push(`<script>${initParts.join('')}</script>`)
      if (ga4) {
        lines.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=${ga4}"></script>`)
      }
      if (gtm) {
        lines.push(`<script async src="https://www.googletagmanager.com/gtm.js?id=${gtm}"></script>`)
      }
    }
  }

  // Theme & Identity
  lines.push(`<meta name="theme-color" content="${escapeAttr(settings.themeColor)}" />`)
  lines.push(`<meta name="application-name" content="${escapeAttr(settings.siteName)}" />`)
  lines.push(`<title>${escapeHtml(resolvedSeo.title)}</title>`)
  if (resolvedSeo.description) {
    lines.push(`<meta name="description" content="${escapeAttr(resolvedSeo.description)}" />`)
  }
  if (resolvedSeo.keywords) {
    lines.push(`<meta name="keywords" content="${escapeAttr(resolvedSeo.keywords)}" />`)
  }
  lines.push(`<meta name="robots" content="${escapeAttr(resolvedSeo.robots || 'index, follow')}" />`)
  lines.push(`<link rel="canonical" href="${escapeAttr(resolvedSeo.canonical)}" />`)

  // Verification tags
  if (settings.verification.google) {
    lines.push(
      `<meta name="google-site-verification" content="${escapeAttr(settings.verification.google)}" />`
    )
  }
  if (settings.verification.bing) {
    lines.push(`<meta name="msvalidate.01" content="${escapeAttr(settings.verification.bing)}" />`)
  }
  if (settings.verification.facebook) {
    lines.push(
      `<meta name="facebook-domain-verification" content="${escapeAttr(settings.verification.facebook)}" />`
    )
  }

  // Open Graph
  lines.push(`<meta property="og:site_name" content="${escapeAttr(settings.siteName)}" />`)
  lines.push(`<meta property="og:locale" content="${escapeAttr(settings.locale || 'vi_VN')}" />`)
  lines.push(`<meta property="og:type" content="${escapeAttr(resolvedSeo.ogType || 'website')}" />`)
  lines.push(`<meta property="og:url" content="${escapeAttr(resolvedSeo.canonical)}" />`)
  lines.push(`<meta property="og:title" content="${escapeAttr(resolvedSeo.ogTitle || resolvedSeo.title)}" />`)
  if (resolvedSeo.ogDescription || resolvedSeo.description) {
    lines.push(
      `<meta property="og:description" content="${escapeAttr(resolvedSeo.ogDescription || resolvedSeo.description)}" />`
    )
  }
  if (resolvedSeo.ogImage) {
    lines.push(`<meta property="og:image" content="${escapeAttr(resolvedSeo.ogImage)}" />`)
    lines.push(`<meta property="og:image:alt" content="${escapeAttr(resolvedSeo.ogTitle || resolvedSeo.title)}" />`)
  }

  // Twitter / X Card
  lines.push(`<meta name="twitter:card" content="${escapeAttr(settings.twitterCard || 'summary_large_image')}" />`)
  if (settings.twitterHandle) {
    const handle = settings.twitterHandle.startsWith('@')
      ? settings.twitterHandle
      : `@${settings.twitterHandle}`
    lines.push(`<meta name="twitter:site" content="${escapeAttr(handle)}" />`)
  }
  lines.push(`<meta name="twitter:title" content="${escapeAttr(resolvedSeo.ogTitle || resolvedSeo.title)}" />`)
  if (resolvedSeo.ogDescription || resolvedSeo.description) {
    lines.push(
      `<meta name="twitter:description" content="${escapeAttr(resolvedSeo.ogDescription || resolvedSeo.description)}" />`
    )
  }
  if (resolvedSeo.ogImage) {
    lines.push(`<meta name="twitter:image" content="${escapeAttr(resolvedSeo.ogImage)}" />`)
  }

  // Google-compliant Favicons (48 / 96 / 192 PNG + /favicon.ico + 180 apple-touch-icon)
  const favVersion = settings.updatedAt ? `?v=${settings.updatedAt}` : ''
  const fav48 = buildFaviconVariantUrl(settings.faviconUrl, 48, base)
  const fav96 = buildFaviconVariantUrl(settings.faviconUrl, 96, base)
  const fav192 = buildFaviconVariantUrl(settings.faviconUrl, 192, base)
  const fav180 = buildFaviconVariantUrl(settings.faviconUrl, 180, base)

  lines.push(`<link rel="icon" href="${escapeAttr(`${base}/favicon.ico${favVersion}`)}" sizes="48x48" />`)
  lines.push(`<link rel="icon" type="image/png" sizes="48x48" href="${escapeAttr(fav48)}" />`)
  lines.push(`<link rel="icon" type="image/png" sizes="96x96" href="${escapeAttr(fav96)}" />`)
  lines.push(`<link rel="icon" type="image/png" sizes="192x192" href="${escapeAttr(fav192)}" />`)
  lines.push(`<link rel="apple-touch-icon" sizes="180x180" href="${escapeAttr(fav180)}" />`)

  // JSON-LD Structured Data (WebSite + Organization)
  if (!resolvedSeo.isAdmin) {
    const jsonLd = buildJsonLdGraph(settings)
    if (jsonLd) {
      lines.push(
        `<script type="application/ld+json" data-seo-ld="true">${serializeJsonForScript(jsonLd)}</script>`
      )
    }
  }

  // Hydrate initial SEO settings synchronously on client (eliminates Header/Footer/title flash)
  const hydratePayload = {
    siteName: settings.siteName,
    alternateNames: settings.alternateNames,
    canonicalBase: settings.canonicalBase,
    locale: settings.locale,
    language: settings.language,
    themeColor: settings.themeColor,
    logoUrl: settings.logoUrl,
    faviconUrl: settings.faviconUrl,
    ogImageUrl: settings.ogImageUrl,
    twitterCard: settings.twitterCard,
    twitterHandle: settings.twitterHandle,
    contactTelegramHandle: settings.contactTelegramHandle,
    contactTelegramUrl: settings.contactTelegramUrl,
    footerTagline: settings.footerTagline,
    routes: settings.routes,
    dynamicTemplates: settings.dynamicTemplates,
    schema: settings.schema,
    updatedAt: settings.updatedAt
  }
  lines.push(
    `<script id="__SITE_SEO__" type="application/json">${serializeJsonForScript(hydratePayload)}</script>`
  )

  // Optional admin custom head HTML
  if (settings.customHeadHtml && !resolvedSeo.isAdmin) {
    lines.push(settings.customHeadHtml)
  }

  return lines.join('\n    ')
}

export function renderGtmNoscriptHtml(rawSettings, isAdmin = false) {
  const settings = normalizeSeoSettings(rawSettings)
  if (!settings.analytics.enabled || isAdmin || !settings.analytics.gtmId) return ''
  const gtm = settings.analytics.gtmId
  return `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtm}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`
}
