/**
 * Cloudflare Worker entrypoint:
 * 1. Handles /api/notify-report (forwards new pending scam reports to Telegram using Secret env vars)
 * 2. Handles /api/seo-cache-purge (admin-authenticated Edge cache invalidation when SEO settings update)
 * 3. Serves dynamic /robots.txt, /sitemap.xml, /llms.txt, and /favicon.ico powered by site_meta/seo in Firebase RTDB
 * 4. Injects route-aware & dynamic detail (/shops/:id, /alerts/:id) SEO tags, JSON-LD, favicon, and analytics into HTML
 * 5. Serves static Vite build assets cleanly
 */

import {
  DEFAULT_SEO_SETTINGS,
  normalizeSeoSettings,
  matchPathnameToRouteKey,
  resolveRouteSeo,
  buildFaviconVariantUrl,
  buildRobotsTxt,
  buildLlmsTxt,
  buildSitemapXml,
  renderSeoHeadHtml,
  renderGtmNoscriptHtml,
  escapeHtml,
  escapeAttr
} from './src/utils/seoConfig.js'

const DEFAULT_FIREBASE_DB_URL =
  'https://checkscam-24adf-default-rtdb.asia-southeast1.firebasedatabase.app'
const DEFAULT_FIREBASE_API_KEY = 'AIzaSyAERIfCQX_WeHxozRV_uQHS_FcCHhAMafg'
const DEFAULT_ADMIN_EMAIL = 'quangdang080420022@gmail.com'

const SEO_CACHE_TTL_MS = 60_000
const SITEMAP_CACHE_TTL_MS = 120_000
const RECORD_CACHE_TTL_MS = 90_000

const memoryCache = {
  seo: { data: null, expiresAt: 0 },
  sitemap: { data: null, expiresAt: 0 },
  faviconIco: { bytes: null, sourceUrl: '', expiresAt: 0 },
  records: new Map(),
  searchRateByIp: new Map(),
  searchDedupe: new Map()
}

function getFirebaseDbUrl(env) {
  return String(env?.FIREBASE_DATABASE_URL || env?.VITE_FIREBASE_DATABASE_URL || DEFAULT_FIREBASE_DB_URL)
    .trim()
    .replace(/\/+$/, '')
}

function getFirebaseApiKey(env) {
  return String(env?.FIREBASE_API_KEY || env?.VITE_FIREBASE_API_KEY || DEFAULT_FIREBASE_API_KEY).trim()
}

function getAdminEmail(env) {
  return String(env?.ADMIN_EMAIL || env?.VITE_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL)
    .trim()
    .toLowerCase()
}

async function fetchJsonWithTimeout(targetUrl, timeoutMs = 2500) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function getCachedSeoSettings(env, forceRefresh = false) {
  const now = Date.now()
  if (!forceRefresh && memoryCache.seo.data && memoryCache.seo.expiresAt > now) {
    return memoryCache.seo.data
  }

  const dbUrl = getFirebaseDbUrl(env)
  const raw = await fetchJsonWithTimeout(`${dbUrl}/site_meta/seo.json`, 2500)
  const normalized = normalizeSeoSettings(raw || DEFAULT_SEO_SETTINGS)

  memoryCache.seo = {
    data: normalized,
    expiresAt: now + (raw ? SEO_CACHE_TTL_MS : 15_000)
  }
  return normalized
}

async function getCachedRecord(env, collection, id) {
  const cleanId = String(id || '').trim()
  if (!cleanId) return null

  const cacheKey = `${collection}/${cleanId}`
  const now = Date.now()
  const hit = memoryCache.records.get(cacheKey)
  if (hit && hit.expiresAt > now) {
    return hit.data
  }

  const dbUrl = getFirebaseDbUrl(env)
  const data = await fetchJsonWithTimeout(
    `${dbUrl}/${collection}/${encodeURIComponent(cleanId)}.json`,
    2000
  )

  if (memoryCache.records.size > 150) {
    memoryCache.records.clear()
  }
  memoryCache.records.set(cacheKey, {
    data: data && typeof data === 'object' ? { id: cleanId, ...data } : null,
    expiresAt: now + RECORD_CACHE_TTL_MS
  })

  return data && typeof data === 'object' ? { id: cleanId, ...data } : null
}

async function getCachedSitemapEntries(env) {
  const now = Date.now()
  if (memoryCache.sitemap.data && memoryCache.sitemap.expiresAt > now) {
    return memoryCache.sitemap.data
  }

  const dbUrl = getFirebaseDbUrl(env)
  const rawEntries = await fetchJsonWithTimeout(`${dbUrl}/site_meta/sitemapEntries.json`, 2500)

  let shops =
    rawEntries && rawEntries.shops && typeof rawEntries.shops === 'object' ? rawEntries.shops : null
  let reports =
    rawEntries && rawEntries.reports && typeof rawEntries.reports === 'object'
      ? rawEntries.reports
      : null

  // Graceful fallback to recent public pages (within anti-scraping Firebase Rules limits) if not yet synced
  if (!shops) {
    const recentShops = await fetchJsonWithTimeout(
      `${dbUrl}/trusted_shops.json?orderBy=%22$key%22&limitToLast=20`,
      2500
    )
    shops = {}
    if (recentShops && typeof recentShops === 'object') {
      for (const [id, item] of Object.entries(recentShops)) {
        if (item && typeof item === 'object') {
          shops[id] = Number(item.updatedAt || item.createdAt || Date.now())
        }
      }
    }
  }

  if (!reports) {
    const recentReports = await fetchJsonWithTimeout(
      `${dbUrl}/scam_reports.json?orderBy=%22$key%22&limitToLast=12`,
      2500
    )
    reports = {}
    if (recentReports && typeof recentReports === 'object') {
      for (const [id, item] of Object.entries(recentReports)) {
        if (item && typeof item === 'object') {
          reports[id] = Number(item.updatedAt || item.createdAt || Date.now())
        }
      }
    }
  }

  const result = { shops, reports }
  memoryCache.sitemap = {
    data: result,
    expiresAt: now + SITEMAP_CACHE_TTL_MS
  }
  return result
}

function wrapPngAsIco(pngBytes, size = 48) {
  const pngLen = pngBytes.byteLength
  const out = new Uint8Array(22 + pngLen)
  const view = new DataView(out.buffer)

  // ICONDIR (6 bytes)
  view.setUint16(0, 0, true) // reserved
  view.setUint16(2, 1, true) // type = ICO
  view.setUint16(4, 1, true) // image count = 1

  // ICONDIRENTRY (16 bytes)
  out[6] = size >= 256 ? 0 : size
  out[7] = size >= 256 ? 0 : size
  out[8] = 0 // palette count
  out[9] = 0 // reserved
  view.setUint16(10, 1, true) // color planes
  view.setUint16(12, 32, true) // bits per pixel
  view.setUint32(14, pngLen, true) // payload byte length
  view.setUint32(18, 22, true) // offset from beginning of file

  out.set(pngBytes, 22)
  return out
}

async function handleDynamicFaviconIco(request, env, url) {
  const seo = await getCachedSeoSettings(env)
  const rawFav = String(seo.faviconUrl || '').trim()

  // Use pre-generated multi-size static /favicon.ico when default local asset is configured
  if (!rawFav || rawFav === '/logo.jpg' || rawFav === '/favicon-192.png' || rawFav === '/favicon.svg') {
    if (env?.ASSETS) {
      const staticRes = await env.ASSETS.fetch(new URL('/favicon.ico', url.origin))
      if (staticRes.ok) {
        const headers = new Headers(staticRes.headers)
        headers.set('Content-Type', 'image/x-icon')
        headers.set('Cache-Control', 'public, max-age=3600')
        return new Response(request.method === 'HEAD' ? null : staticRes.body, {
          status: 200,
          headers
        })
      }
    }
  }

  const fav48Url = buildFaviconVariantUrl(rawFav, 48, seo.canonicalBase)
  const now = Date.now()
  if (
    memoryCache.faviconIco.bytes &&
    memoryCache.faviconIco.sourceUrl === fav48Url &&
    memoryCache.faviconIco.expiresAt > now
  ) {
    return new Response(request.method === 'HEAD' ? null : memoryCache.faviconIco.bytes, {
      status: 200,
      headers: {
        'Content-Type': 'image/x-icon',
        'Cache-Control': 'public, max-age=3600'
      }
    })
  }

  try {
    const imgRes = await fetch(fav48Url)
    if (imgRes.ok) {
      const contentType = (imgRes.headers.get('content-type') || '').toLowerCase()
      const buf = new Uint8Array(await imgRes.arrayBuffer())
      if (contentType.includes('image/x-icon') || contentType.includes('image/vnd.microsoft.icon')) {
        memoryCache.faviconIco = { bytes: buf, sourceUrl: fav48Url, expiresAt: now + 300_000 }
        return new Response(request.method === 'HEAD' ? null : buf, {
          status: 200,
          headers: {
            'Content-Type': 'image/x-icon',
            'Cache-Control': 'public, max-age=3600'
          }
        })
      }
      if (contentType.includes('image/png')) {
        const icoBytes = wrapPngAsIco(buf, 48)
        memoryCache.faviconIco = { bytes: icoBytes, sourceUrl: fav48Url, expiresAt: now + 300_000 }
        return new Response(request.method === 'HEAD' ? null : icoBytes, {
          status: 200,
          headers: {
            'Content-Type': 'image/x-icon',
            'Cache-Control': 'public, max-age=3600'
          }
        })
      }
      // Fallback for non-PNG external URLs (JPEG/WebP/SVG)
      return new Response(request.method === 'HEAD' ? null : buf, {
        status: 200,
        headers: {
          'Content-Type': contentType || 'image/png',
          'Cache-Control': 'public, max-age=3600'
        }
      })
    }
  } catch {
    // Fall through to static favicon
  }

  if (env?.ASSETS) {
    const fallback = await env.ASSETS.fetch(new URL('/favicon.ico', url.origin))
    if (fallback.ok) return fallback
  }
  return new Response('Not Found', { status: 404 })
}

async function verifyAdminIdToken(request, env) {
  const authHeader = String(request.headers.get('Authorization') || '').trim()
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!match || !match[1]) return false

  const idToken = match[1].trim()
  const apiKey = getFirebaseApiKey(env)
  const expectedAdmin = getAdminEmail(env)
  if (!apiKey || !expectedAdmin) return false

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      }
    )
    if (!res.ok) return false
    const json = await res.json().catch(() => null)
    const user = Array.isArray(json?.users) ? json.users[0] : null
    if (!user) return false
    return (
      Boolean(user.emailVerified) &&
      String(user.email || '').trim().toLowerCase() === expectedAdmin
    )
  } catch {
    return false
  }
}

function purgeWorkerMemoryCache() {
  memoryCache.seo = { data: null, expiresAt: 0 }
  memoryCache.sitemap = { data: null, expiresAt: 0 }
  memoryCache.faviconIco = { bytes: null, sourceUrl: '', expiresAt: 0 }
  memoryCache.records.clear()
}

async function handleSeoCachePurge(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method Not Allowed' }, 405, { Allow: 'POST' })
  }

  const authorized = await verifyAdminIdToken(request, env)
  if (!authorized) {
    return jsonResponse({ ok: false, error: 'Unauthorized' }, 401)
  }

  purgeWorkerMemoryCache()
  // Warm fresh SEO config right away
  const fresh = await getCachedSeoSettings(env, true)
  return jsonResponse({ ok: true, updatedAt: fresh.updatedAt || Date.now() })
}

function injectSeoIntoHtml(html, seoSettings, resolvedSeo) {
  let output = html

  // Update <html lang="...">
  const lang = escapeAttr(seoSettings.language || 'vi')
  output = output.replace(/<html\s+lang="[^"]*"/i, `<html lang="${lang}"`)

  const headBlock = `<!-- SEO_HEAD_START -->\n    ${renderSeoHeadHtml(seoSettings, resolvedSeo)}\n    <!-- SEO_HEAD_END -->`
  if (/<!--\s*SEO_HEAD_START\s*-->[\s\S]*?<!--\s*SEO_HEAD_END\s*-->/.test(output)) {
    output = output.replace(
      /<!--\s*SEO_HEAD_START\s*-->[\s\S]*?<!--\s*SEO_HEAD_END\s*-->/,
      () => headBlock
    )
  } else {
    output = output.replace(/<\/head>/i, () => `    ${headBlock}\n  </head>`)
  }

  const gtmBody = renderGtmNoscriptHtml(seoSettings, resolvedSeo.isAdmin)
  const gtmBlock = gtmBody
    ? `<!-- GTM_BODY_START -->\n    ${gtmBody}\n    <!-- GTM_BODY_END -->`
    : '<!-- GTM_BODY_START --><!-- GTM_BODY_END -->'
  if (/<!--\s*GTM_BODY_START\s*-->[\s\S]*?<!--\s*GTM_BODY_END\s*-->/.test(output)) {
    output = output.replace(
      /<!--\s*GTM_BODY_START\s*-->[\s\S]*?<!--\s*GTM_BODY_END\s*-->/,
      () => gtmBlock
    )
  }

  return output
}

async function handleHtmlPage(request, env, url) {
  if (!env?.ASSETS) {
    return new Response('Not Found', { status: 404 })
  }

  const indexRes = await env.ASSETS.fetch(new URL('/index.html', url.origin))
  if (!indexRes.ok) {
    return indexRes
  }

  const rawHtml = await indexRes.text()
  const seoSettings = await getCachedSeoSettings(env)
  const matched = matchPathnameToRouteKey(url.pathname)

  let dynamicItem = null
  if (seoSettings.dynamicTemplates.enabled && matched.dynamicType && matched.dynamicId) {
    const collection = matched.dynamicType === 'shop' ? 'trusted_shops' : 'scam_reports'
    dynamicItem = await getCachedRecord(env, collection, matched.dynamicId)
  }

  const resolvedSeo = resolveRouteSeo(seoSettings, {
    routeName: matched.routeKey,
    path: url.pathname,
    dynamicType: matched.dynamicType,
    dynamicItem
  })

  const injectedHtml = injectSeoIntoHtml(rawHtml, seoSettings, resolvedSeo)
  const headers = new Headers(indexRes.headers)
  headers.set('Content-Type', 'text/html; charset=utf-8')
  headers.delete('Content-Length')
  headers.delete('ETag')
  headers.set(
    'Cache-Control',
    resolvedSeo.isAdmin ? 'private, no-store' : 'public, max-age=0, must-revalidate'
  )

  return new Response(request.method === 'HEAD' ? null : injectedHtml, {
    status: 200,
    headers
  })
}

function formatAmountVi(amount) {
  const num = Number(String(amount || '').replace(/[^\d]/g, ''))
  if (!num || Number.isNaN(num)) return ''
  return `${new Intl.NumberFormat('vi-VN').format(num)} ₫`
}

function truncateText(text = '', maxLen = 600) {
  const clean = String(text || '').trim()
  if (clean.length <= maxLen) return clean
  return `${clean.slice(0, maxLen - 1)}…`
}

function formatTelegramMessage({ reportId, report, adminUrl, clientMeta }) {
  const lines = ['🚨 <b>ĐƠN TỐ CÁO MỚI CHỜ DUYỆT</b>']

  const incidents =
    Array.isArray(report.incidents) && report.incidents.length > 0 ? report.incidents : null

  if (reportId) {
    lines.push(`🆔 <b>Mã đơn:</b> <code>${escapeHtml(reportId)}</code>`)
  }
  if (report.subjectName) {
    lines.push(`👤 <b>Đối tượng:</b> ${escapeHtml(report.subjectName)}`)
  }
  if (incidents && incidents.length > 1) {
    lines.push(`📚 <b>Số vụ việc:</b> ${incidents.length} cụm vụ việc`)
    const totalAmountText = formatAmountVi(report.scamAmount)
    if (totalAmountText) {
      lines.push(`💸 <b>Tổng thiệt hại:</b> ${escapeHtml(totalAmountText)}`)
    }
  } else {
    if (report.scamType) {
      lines.push(`⚠️ <b>Hình thức:</b> ${escapeHtml(report.scamType)}`)
    }

    const amountText = formatAmountVi(report.scamAmount)
    if (amountText) {
      lines.push(`💸 <b>Số tiền:</b> ${escapeHtml(amountText)}`)
    }
  }

  const banks = Array.isArray(report.bankAccounts) ? report.bankAccounts : []
  if (banks.length > 0) {
    lines.push('')
    lines.push('🏦 <b>Tài khoản nhận tiền:</b>')
    for (const b of banks.slice(0, 6)) {
      const bankLabel = b.bankName || b.bankCode || 'Ngân hàng'
      const acc = b.accountNumber || '—'
      const holder = b.accountHolder ? ` (${b.accountHolder})` : ''
      lines.push(`• ${escapeHtml(bankLabel)}: <code>${escapeHtml(acc)}</code>${escapeHtml(holder)}`)
    }
  }

  const socials = Array.isArray(report.socials) ? report.socials : []
  if (socials.length > 0) {
    lines.push('')
    lines.push('📱 <b>Tài khoản MXH:</b>')
    for (const s of socials.slice(0, 6)) {
      const parts = [s.accountName, s.usernameOrPhone, s.url].filter(Boolean)
      if (parts.length > 0) {
        lines.push(`• <b>${escapeHtml(s.platform || 'MXH')}:</b> ${escapeHtml(parts.join(' · '))}`)
      }
    }
  }

  if (incidents && incidents.length > 1) {
    lines.push('')
    lines.push('📌 <b>Chi tiết các vụ việc:</b>')
    incidents.slice(0, 5).forEach((inc, idx) => {
      const amt = formatAmountVi(inc.scamAmount)
      const head = [inc.scamType, amt].filter(Boolean).join(' · ')
      lines.push(`• <b>Vụ #${idx + 1}:</b> ${escapeHtml(head || 'Chưa rõ hình thức')}`)
      if (inc.description) {
        lines.push(`  <i>${escapeHtml(truncateText(inc.description, 220))}</i>`)
      }
    })
  } else if (report.description) {
    lines.push('')
    lines.push(`📝 <b>Nội dung:</b> ${escapeHtml(truncateText(report.description, 600))}`)
  }

  if (report.reporterName || report.reporterContact) {
    const reporterParts = [report.reporterName, report.reporterContact].filter(Boolean)
    lines.push('')
    lines.push(`🙋 <b>Người gửi:</b> ${escapeHtml(reporterParts.join(' · '))}`)
  }

  const reporterIp = String(clientMeta?.ip || report.reporterIp || '').trim()
  const reporterLocation = String(clientMeta?.location || report.reporterLocation || '').trim()
  const reporterDevice = String(clientMeta?.device || report.reporterDevice || '').trim()
  if (reporterIp || reporterLocation || reporterDevice) {
    if (!report.reporterName && !report.reporterContact) lines.push('')
    if (reporterIp) lines.push(`🌐 <b>IP người tố cáo:</b> <code>${escapeHtml(reporterIp)}</code>`)
    if (reporterLocation) lines.push(`🌍 <b>Vị trí:</b> ${escapeHtml(reporterLocation)}`)
    if (reporterDevice) lines.push(`📱 <b>Thiết bị:</b> ${escapeHtml(reporterDevice)}`)
  }

  const images = Array.isArray(report.evidenceImages) ? report.evidenceImages.filter(Boolean) : []
  if (images.length > 0) {
    const links = images
      .slice(0, 8)
      .filter((url) => /^https?:\/\//i.test(url))
      .map((url, idx) => `<a href="${escapeAttr(url)}">Ảnh ${idx + 1}</a>`)
    lines.push('')
    lines.push(
      links.length > 0
        ? `🖼 <b>Bằng chứng (${images.length}):</b> ${links.join(' | ')}`
        : `🖼 <b>Bằng chứng:</b> ${images.length} ảnh`
    )
  }

  const exposeLinks = Array.isArray(report.exposeLinks) ? report.exposeLinks.filter(Boolean) : []
  if (exposeLinks.length > 0) {
    const formattedExpose = exposeLinks
      .slice(0, 8)
      .map((url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`))
      .map((url, idx) => `<a href="${escapeAttr(url)}">Link ${idx + 1}</a>`)
    lines.push('')
    lines.push(`🔗 <b>Link đối chứng (${exposeLinks.length}):</b> ${formattedExpose.join(' | ')}`)
  }

  if (adminUrl) {
    lines.push('')
    lines.push(`🔗 <a href="${escapeAttr(adminUrl)}">Mở trang Admin duyệt đơn</a>`)
  }

  const fullText = lines.join('\n')
  return fullText.length > 4000 ? `${fullText.slice(0, 3990)}…` : fullText
}

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders
    }
  })
}

async function handleNotifyReport(request, env, url) {
  const botToken = String(env?.TELEGRAM_BOT_TOKEN || '').trim()
  const chatId = String(env?.TELEGRAM_CHAT_ID || '').trim()

  if (request.method === 'GET') {
    return jsonResponse({
      ok: true,
      endpoint: 'notify-report',
      runtime: 'cloudflare-workers',
      hasBotToken: Boolean(botToken),
      hasChatId: Boolean(chatId)
    })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method Not Allowed' }, 405, {
      Allow: 'GET, POST'
    })
  }

  if (!botToken || !chatId) {
    return jsonResponse(
      {
        ok: false,
        error: 'Server missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID'
      },
      500
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON body' }, 400)
  }

  const reportId = String(body?.reportId || '').trim()
  const report = body?.report
  if (!report || typeof report !== 'object') {
    return jsonResponse({ ok: false, error: 'Missing report payload' }, 400)
  }

  const hasContent =
    Boolean(report.subjectName) ||
    Boolean(report.scamType) ||
    (Array.isArray(report.bankAccounts) && report.bankAccounts.length > 0) ||
    (Array.isArray(report.socials) && report.socials.length > 0)

  if (!hasContent) {
    return jsonResponse({ ok: false, error: 'Empty report payload' }, 400)
  }

  const clientMeta = {
    ip: extractClientIp(request),
    location: formatLocationFromCf(request.cf),
    device: parseDeviceSummary(request.headers.get('User-Agent') || '')
  }

  const text = formatTelegramMessage({
    reportId,
    report,
    adminUrl: `${url.origin}/admin`,
    clientMeta
  })

  const reportThreadId = parseTelegramThreadId(env?.TELEGRAM_REPORT_THREAD_ID)

  try {
    const tgPayload = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    }
    if (reportThreadId) {
      tgPayload.message_thread_id = reportThreadId
    }

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tgPayload)
    })

    const tgJson = await tgRes.json().catch(() => ({}))
    if (!tgRes.ok || !tgJson?.ok) {
      return jsonResponse(
        {
          ok: false,
          error: tgJson?.description || `Telegram API returned ${tgRes.status}`
        },
        502
      )
    }

    return jsonResponse({
      ok: true,
      messageId: tgJson.result?.message_id || null
    })
  } catch (err) {
    return jsonResponse(
      {
        ok: false,
        error: err?.message || 'Failed to reach Telegram API'
      },
      502
    )
  }
}

function parseTelegramThreadId(raw) {
  const num = Number(String(raw ?? '').trim())
  if (!Number.isInteger(num) || num <= 0) return null
  return num
}

function isCrawlerUserAgent(ua = '') {
  const s = String(ua || '').toLowerCase()
  if (!s) return false
  return /(googlebot|bingbot|yandex|baiduspider|duckduckbot|facebookexternalhit|telegrambot|twitterbot|ahrefsbot|semrushbot|mj12bot|petalbot|bytespider|headlesschrome|lighthouse|uptime)/i.test(
    s
  )
}

function countryCodeToFlag(code = '') {
  const cc = String(code || '').trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(cc)) return ''
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}

function parseDeviceSummary(ua = '') {
  const s = String(ua || '')
  if (!s) return 'Không rõ'

  let os = 'Desktop'
  if (/iPhone/i.test(s)) os = 'iPhone'
  else if (/iPad/i.test(s)) os = 'iPad'
  else if (/Android/i.test(s)) os = 'Android'
  else if (/Windows/i.test(s)) os = 'Windows'
  else if (/Macintosh|Mac OS X/i.test(s)) os = 'macOS'
  else if (/Linux/i.test(s)) os = 'Linux'

  let app = ''
  if (/Zalo/i.test(s)) app = 'Zalo'
  else if (/FBAN|FBAV|FB_IAB/i.test(s)) app = 'Facebook App'
  else if (/Messenger/i.test(s)) app = 'Messenger'
  else if (/Telegram/i.test(s)) app = 'Telegram'
  else if (/Edg\//i.test(s)) app = 'Edge'
  else if (/OPR\/|Opera/i.test(s)) app = 'Opera'
  else if (/CriOS|Chrome\//i.test(s)) app = 'Chrome'
  else if (/FxiOS|Firefox\//i.test(s)) app = 'Firefox'
  else if (/Safari\//i.test(s)) app = 'Safari'

  return app ? `${os} · ${app}` : os
}

function formatTimeVi(date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour12: false
    }).formatToParts(date)
    const get = (type) => parts.find((p) => p.type === type)?.value || ''
    return `${get('hour')}:${get('minute')} · ${get('day')}/${get('month')}/${get('year')}`
  } catch {
    return date.toISOString()
  }
}

function extractClientIp(request) {
  const cfIp = String(request.headers.get('CF-Connecting-IP') || '').trim()
  if (cfIp) return cfIp
  const xff = String(request.headers.get('X-Forwarded-For') || '')
    .split(',')[0]
    .trim()
  return xff || 'Không rõ'
}

function formatLocationFromCf(cf) {
  if (!cf || typeof cf !== 'object') return ''
  const country = String(cf.country || '').trim().toUpperCase()
  const city = String(cf.city || '').trim()
  const region = String(cf.region || '').trim()
  const flag = countryCodeToFlag(country)
  const placeParts = [city, region && region !== city ? region : '', country].filter(Boolean)
  if (!placeParts.length) return ''
  return flag ? `${flag} ${placeParts.join(', ')}` : placeParts.join(', ')
}

function checkSearchRateLimitAndDedupe(ip, queryText) {
  const now = Date.now()
  const normalizedQ = String(queryText || '').trim().toLowerCase()
  const dedupeKey = `${ip}|${normalizedQ}`

  if (memoryCache.searchDedupe.size > 500) {
    for (const [k, exp] of memoryCache.searchDedupe.entries()) {
      if (exp <= now) memoryCache.searchDedupe.delete(k)
    }
  }

  const dedupeExp = memoryCache.searchDedupe.get(dedupeKey)
  if (dedupeExp && dedupeExp > now) {
    return { allowed: false, reason: 'deduped' }
  }

  if (memoryCache.searchRateByIp.size > 500) {
    for (const [k, entry] of memoryCache.searchRateByIp.entries()) {
      if (entry.resetAt <= now) memoryCache.searchRateByIp.delete(k)
    }
  }

  const windowMs = 60_000
  const maxPerMinute = 10
  const cur = memoryCache.searchRateByIp.get(ip)
  if (!cur || cur.resetAt <= now) {
    memoryCache.searchRateByIp.set(ip, { count: 1, resetAt: now + windowMs })
  } else {
    if (cur.count >= maxPerMinute) {
      return { allowed: false, reason: 'rate_limited' }
    }
    cur.count += 1
  }

  memoryCache.searchDedupe.set(dedupeKey, now + 60_000)
  return { allowed: true }
}

function formatSearchTelegramMessage({
  query,
  reportsCount,
  shopsCount,
  matchedReportNames,
  matchedShopNames,
  ip,
  location,
  device,
  searchUrl
}) {
  const lines = ['🔎 <b>LƯỢT TRA CỨU MỚI</b>']
  lines.push(`🔑 <b>Từ khóa:</b> <code>${escapeHtml(truncateText(query, 240))}</code>`)

  if (reportsCount === 0 && shopsCount === 0) {
    lines.push('📊 <b>Kết quả:</b> ⚪ Chưa có dữ liệu trên hệ thống')
  } else {
    const statusParts = []
    if (reportsCount > 0) statusParts.push(`🚨 <b>${reportsCount} cảnh báo lừa đảo</b>`)
    if (shopsCount > 0) statusParts.push(`✅ <b>${shopsCount} shop uy tín</b>`)
    lines.push(`📊 <b>Kết quả:</b> ${statusParts.join(' · ')}`)

    if (matchedReportNames.length) {
      lines.push(
        `   ↳ <b>Cảnh báo:</b> ${escapeHtml(truncateText(matchedReportNames.join(', '), 200))}`
      )
    }
    if (matchedShopNames.length) {
      lines.push(
        `   ↳ <b>Shop:</b> ${escapeHtml(truncateText(matchedShopNames.join(', '), 200))}`
      )
    }
  }

  lines.push(`🌐 <b>IP:</b> <code>${escapeHtml(ip)}</code>`)
  if (location) {
    lines.push(`🌍 <b>Vị trí:</b> ${escapeHtml(location)}`)
  }
  lines.push(`📱 <b>Thiết bị:</b> ${escapeHtml(device)}`)
  lines.push(`🕒 <b>Thời gian:</b> ${escapeHtml(formatTimeVi())}`)

  if (searchUrl) {
    lines.push(`🔗 <a href="${escapeAttr(searchUrl)}">Mở lại kết quả tra cứu</a>`)
  }

  return lines.join('\n')
}

async function handleNotifySearch(request, env, url) {
  const dedicatedBotToken = String(env?.TELEGRAM_SEARCH_BOT_TOKEN || '').trim()
  const botToken = dedicatedBotToken || String(env?.TELEGRAM_BOT_TOKEN || '').trim()
  const chatId = String(env?.TELEGRAM_SEARCH_CHAT_ID || env?.TELEGRAM_CHAT_ID || '').trim()
  const threadId = parseTelegramThreadId(env?.TELEGRAM_SEARCH_THREAD_ID)

  if (request.method === 'GET') {
    return jsonResponse({
      ok: true,
      endpoint: 'notify-search',
      runtime: 'cloudflare-workers',
      hasBotToken: Boolean(botToken),
      hasDedicatedBotToken: Boolean(dedicatedBotToken),
      hasChatId: Boolean(chatId),
      hasThreadId: Boolean(threadId)
    })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method Not Allowed' }, 405, {
      Allow: 'GET, POST'
    })
  }

  const ua = request.headers.get('User-Agent') || ''
  if (isCrawlerUserAgent(ua)) {
    return jsonResponse({ ok: true, skipped: 'crawler' })
  }

  if (!botToken || !chatId) {
    return jsonResponse(
      {
        ok: false,
        error: 'Server missing TELEGRAM_BOT_TOKEN or TELEGRAM_SEARCH_CHAT_ID / TELEGRAM_CHAT_ID'
      },
      500
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON body' }, 400)
  }

  const queryText = String(body?.query || '').trim()
  if (queryText.length < 2) {
    return jsonResponse({ ok: true, skipped: 'too_short' })
  }

  const ip = extractClientIp(request)
  const guard = checkSearchRateLimitAndDedupe(ip, queryText)
  if (!guard.allowed) {
    return jsonResponse(
      { ok: guard.reason === 'deduped', skipped: guard.reason },
      guard.reason === 'rate_limited' ? 429 : 200
    )
  }

  const reportsCount = Math.max(0, Number(body?.reportsCount || 0) || 0)
  const shopsCount = Math.max(0, Number(body?.shopsCount || 0) || 0)
  const matchedReportNames = Array.isArray(body?.matchedReportNames)
    ? body.matchedReportNames.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 3)
    : []
  const matchedShopNames = Array.isArray(body?.matchedShopNames)
    ? body.matchedShopNames.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 3)
    : []

  const text = formatSearchTelegramMessage({
    query: queryText,
    reportsCount,
    shopsCount,
    matchedReportNames,
    matchedShopNames,
    ip,
    location: formatLocationFromCf(request.cf),
    device: parseDeviceSummary(ua),
    searchUrl: `${url.origin}/?q=${encodeURIComponent(queryText)}`
  })

  try {
    const tgPayload = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    }
    if (threadId) {
      tgPayload.message_thread_id = threadId
    }

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tgPayload)
    })

    const tgJson = await tgRes.json().catch(() => ({}))
    if (!tgRes.ok || !tgJson?.ok) {
      return jsonResponse(
        {
          ok: false,
          error: tgJson?.description || `Telegram API returned ${tgRes.status}`
        },
        502
      )
    }

    return jsonResponse({
      ok: true,
      messageId: tgJson.result?.message_id || null
    })
  } catch (err) {
    return jsonResponse(
      {
        ok: false,
        error: err?.message || 'Failed to reach Telegram API'
      },
      502
    )
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const pathname = url.pathname

    if (pathname === '/api/notify-report' || pathname === '/api/notify-report/') {
      return handleNotifyReport(request, env, url)
    }

    if (pathname === '/api/notify-search' || pathname === '/api/notify-search/') {
      return handleNotifySearch(request, env, url)
    }

    if (pathname === '/api/client-meta' || pathname === '/api/client-meta/') {
      return jsonResponse(
        {
          ok: true,
          ip: extractClientIp(request),
          location: formatLocationFromCf(request.cf),
          device: parseDeviceSummary(request.headers.get('User-Agent') || '')
        },
        200,
        { 'Cache-Control': 'no-store' }
      )
    }

    if (pathname === '/api/seo-cache-purge' || pathname === '/api/seo-cache-purge/') {
      return handleSeoCachePurge(request, env)
    }

    if (request.method === 'GET' || request.method === 'HEAD') {
      if (pathname === '/robots.txt') {
        const seo = await getCachedSeoSettings(env)
        const body = buildRobotsTxt(seo)
        return new Response(request.method === 'HEAD' ? null : body, {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=300'
          }
        })
      }

      if (pathname === '/llms.txt') {
        const seo = await getCachedSeoSettings(env)
        const body = buildLlmsTxt(seo)
        return new Response(request.method === 'HEAD' ? null : body, {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=300'
          }
        })
      }

      if (pathname === '/sitemap.xml') {
        const seo = await getCachedSeoSettings(env)
        if (!seo.sitemap.enabled) {
          return new Response('Sitemap disabled', { status: 404 })
        }
        const entries =
          seo.sitemap.includeDynamicShops || seo.sitemap.includeDynamicAlerts
            ? await getCachedSitemapEntries(env)
            : {}
        const xml = buildSitemapXml(seo, entries)
        return new Response(request.method === 'HEAD' ? null : xml, {
          status: 200,
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=300'
          }
        })
      }

      if (pathname === '/favicon.ico') {
        return handleDynamicFaviconIco(request, env, url)
      }
    }

    if (env?.ASSETS) {
      const hasFileExtension = /\/[^/]+\.[a-z0-9]{1,8}$/i.test(pathname)
      const isWellKnown = pathname.startsWith('/.well-known/')
      const isHtmlNavigation =
        (request.method === 'GET' || request.method === 'HEAD') &&
        !isWellKnown &&
        (pathname === '/' || pathname === '/index.html' || !hasFileExtension)

      if (isHtmlNavigation) {
        return handleHtmlPage(request, env, url)
      }

      return env.ASSETS.fetch(request)
    }

    return new Response('Not Found', { status: 404 })
  }
}
