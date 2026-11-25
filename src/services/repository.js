import { ref as vueRef } from 'vue'
import {
  ref as dbRef,
  onValue,
  get,
  push,
  set,
  update,
  remove,
  query,
  orderByKey,
  startAt,
  endAt,
  endBefore,
  limitToFirst,
  limitToLast,
  runTransaction
} from 'firebase/database'
import { db, auth } from './firebase'
import {
  buildSearchPayload,
  buildIndexTokens,
  extractQueryPlan,
  matchRecord,
  toSafeIndexKey,
  normalizeAccountNumber,
  normalizeAccountHolder,
  extractSocialIdentifier
} from '@/utils/normalize'
import { normalizeSeoSettings } from '@/utils/seoConfig'

function readHydratedSeoState() {
  if (typeof document === 'undefined') return normalizeSeoSettings(null)
  try {
    const el = document.getElementById('__SITE_SEO__')
    if (el && el.textContent) {
      return normalizeSeoSettings(JSON.parse(el.textContent))
    }
  } catch {
    // ignore invalid inline JSON
  }
  return normalizeSeoSettings(null)
}

// Lightweight global metadata (never downloads site_meta/sitemapEntries to normal visitors)
const siteMeta = vueRef({
  reportsCount: 0,
  shopsCount: 0,
  shopCategories: []
})
const seoSettings = vueRef(readHydratedSeoState())
const seoLoaded = vueRef(false)
const metaLoading = vueRef(true)

// Admin pending submissions queue (small unreviewed queue, admin-only)
const pendingReports = vueRef([])
const pendingLoading = vueRef(false)
export const feedCacheVersion = vueRef(0)

function bumpFeedCache() {
  feedCacheVersion.value += 1
}

let metaSubscribed = false
let pendingUnsubscribe = null

function snapshotToList(snap) {
  const val = snap.val()
  if (!val || typeof val !== 'object') return []
  return Object.entries(val)
    .map(([id, item]) => ({
      id,
      ...item
    }))
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
}

function orderedSnapToDescList(snap) {
  const asc = []
  snap.forEach((child) => {
    const val = child.val()
    if (val && typeof val === 'object') {
      asc.push({ id: child.key, ...val })
    }
  })
  return asc.reverse()
}

function parseShopCategories(catObj) {
  if (!catObj || typeof catObj !== 'object') return []
  return Object.entries(catObj)
    .map(([key, val]) => ({
      key,
      label: String(val?.label || key).trim(),
      count: Number(val?.count || 0)
    }))
    .filter((c) => c.label && c.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'vi'))
}

export function initSiteMetaListener() {
  if (metaSubscribed) return
  metaSubscribed = true

  // Subscribe only to small public child paths so site_meta/sitemapEntries is never downloaded by visitors
  onValue(
    dbRef(db, 'site_meta/reportsCount'),
    (snap) => {
      siteMeta.value = {
        ...siteMeta.value,
        reportsCount: Math.max(0, Number(snap.val() || 0))
      }
      metaLoading.value = false
    },
    () => {
      metaLoading.value = false
    }
  )

  onValue(
    dbRef(db, 'site_meta/shopsCount'),
    (snap) => {
      siteMeta.value = {
        ...siteMeta.value,
        shopsCount: Math.max(0, Number(snap.val() || 0))
      }
      metaLoading.value = false
    },
    () => {
      metaLoading.value = false
    }
  )

  onValue(
    dbRef(db, 'site_meta/shopCategories'),
    (snap) => {
      siteMeta.value = {
        ...siteMeta.value,
        shopCategories: parseShopCategories(snap.val())
      }
      metaLoading.value = false
    },
    () => {
      metaLoading.value = false
    }
  )

  onValue(
    dbRef(db, 'site_meta/seo'),
    (snap) => {
      const val = snap.val()
      seoSettings.value = normalizeSeoSettings(val)
      seoLoaded.value = true
    },
    () => {
      seoLoaded.value = true
    }
  )
}

async function fetchRecordById(collection, id) {
  try {
    const snap = await get(dbRef(db, `${collection}/${id}`))
    if (!snap.exists()) return null
    return { id: snap.key, ...snap.val() }
  } catch {
    return null
  }
}

export function fetchReportById(id) {
  const cleanId = String(id || '').trim()
  if (!cleanId) return Promise.resolve(null)
  return fetchRecordById('scam_reports', cleanId)
}

export function fetchShopById(id) {
  const cleanId = String(id || '').trim()
  if (!cleanId) return Promise.resolve(null)
  return fetchRecordById('trusted_shops', cleanId)
}

// Paginated server fetch for /alerts and Admin reports tab
export async function fetchReportsPage({
  batchSize = 6,
  cursorKey = null,
  platform = 'all',
  probeMore = true
} = {}) {
  const fetchLimit = probeMore ? batchSize + 1 : batchSize

  if (platform && platform !== 'all') {
    const platKey = toSafeIndexKey(platform)
    const constraints = [
      orderByKey(),
      ...(cursorKey ? [endBefore(cursorKey)] : []),
      limitToLast(fetchLimit)
    ]
    const idxSnap = await get(query(dbRef(db, `plat_index/${platKey}`), ...constraints))
    const ascKeys = []
    idxSnap.forEach((child) => {
      if (child.val()) ascKeys.push(child.key)
    })
    const descKeys = ascKeys.reverse()
    const hasMore = probeMore && descKeys.length > batchSize
    const pageKeys = hasMore ? descKeys.slice(0, batchSize) : descKeys
    const nextCursor = hasMore && pageKeys.length ? pageKeys[pageKeys.length - 1] : null

    const loaded = await Promise.all(pageKeys.map((id) => fetchRecordById('scam_reports', id)))
    return {
      items: loaded.filter(Boolean),
      hasMore,
      nextCursor
    }
  }

  const constraints = [
    orderByKey(),
    ...(cursorKey ? [endBefore(cursorKey)] : []),
    limitToLast(fetchLimit)
  ]
  const snap = await get(query(dbRef(db, 'scam_reports'), ...constraints))
  const desc = orderedSnapToDescList(snap)
  const hasMore = probeMore && desc.length > batchSize
  const items = hasMore ? desc.slice(0, batchSize) : desc
  const nextCursor = hasMore && items.length ? items[items.length - 1].id : null

  return { items, hasMore, nextCursor }
}

// Paginated server fetch for /shops and Admin shops tab
export async function fetchShopsPage({ batchSize = 6, cursorKey = null, category = 'all' } = {}) {
  if (category && category !== 'all') {
    const catKey = toSafeIndexKey(category)
    const constraints = [
      orderByKey(),
      ...(cursorKey ? [endBefore(cursorKey)] : []),
      limitToLast(batchSize + 1)
    ]
    const idxSnap = await get(query(dbRef(db, `cat_index/${catKey}`), ...constraints))
    const ascKeys = []
    idxSnap.forEach((child) => {
      if (child.val()) ascKeys.push(child.key)
    })
    const descKeys = ascKeys.reverse()
    const hasMore = descKeys.length > batchSize
    const pageKeys = hasMore ? descKeys.slice(0, batchSize) : descKeys
    const nextCursor = hasMore && pageKeys.length ? pageKeys[pageKeys.length - 1] : null

    const loaded = await Promise.all(pageKeys.map((id) => fetchRecordById('trusted_shops', id)))
    return {
      items: loaded.filter(Boolean),
      hasMore,
      nextCursor
    }
  }

  const constraints = [
    orderByKey(),
    ...(cursorKey ? [endBefore(cursorKey)] : []),
    limitToLast(batchSize + 1)
  ]
  const snap = await get(query(dbRef(db, 'trusted_shops'), ...constraints))
  const desc = orderedSnapToDescList(snap)
  const hasMore = desc.length > batchSize
  const items = hasMore ? desc.slice(0, batchSize) : desc
  const nextCursor = hasMore && items.length ? items[items.length - 1].id : null

  return { items, hasMore, nextCursor }
}

// On-demand server lookup via lookup_index: ONLY runs when user searches
export async function searchRecordsOnServer(
  rawQuery,
  {
    includeReports = true,
    includeShops = true,
    platform = 'all',
    category = 'all',
    maxCandidates = 24
  } = {}
) {
  const trimmed = String(rawQuery || '').trim()
  if (!trimmed) return { reports: [], shops: [] }

  // Support pasting a shared CheckScam card URL (/alerts/:id or /shops/:id) directly into search
  const sharedPathMatch = trimmed.match(/\/(alerts|shops)\/([^/?#\s]+)/i)
  if (sharedPathMatch) {
    const [, kind, rawId] = sharedPathMatch
    let decodedId = rawId
    try {
      decodedId = decodeURIComponent(rawId)
    } catch {
      decodedId = rawId
    }
    if (kind.toLowerCase() === 'alerts' && includeReports) {
      const rep = await fetchRecordById('scam_reports', decodedId)
      if (rep) {
        return {
          reports: [{ item: rep, match: { matched: true, rank: 1, matchType: null, matchedValue: decodedId } }],
          shops: []
        }
      }
    } else if (kind.toLowerCase() === 'shops' && includeShops) {
      const shop = await fetchRecordById('trusted_shops', decodedId)
      if (shop) {
        return {
          reports: [],
          shops: [{ item: shop, match: { matched: true, rank: 1, matchType: null, matchedValue: decodedId } }]
        }
      }
    }
  }

  const plan = extractQueryPlan(trimmed)
  const scoreMap = new Map() // entityKey ('report_<id>' | 'shop_<id>') -> score

  const bump = (entityKey, pts) => {
    if (!entityKey || typeof entityKey !== 'string') return
    if (entityKey.startsWith('report_') && !includeReports) return
    if (entityKey.startsWith('shop_') && !includeShops) return
    scoreMap.set(entityKey, (scoreMap.get(entityKey) || 0) + pts)
  }

  const exactLookupKeys = Array.from(new Set(plan.exactKeys))
  const wordLookupKeys = plan.wordKeys.filter((k) => !exactLookupKeys.includes(k))

  const tasks = [
    ...exactLookupKeys.map(async (k) => {
      const snap = await get(dbRef(db, `lookup_index/${k}`))
      const val = snap.val()
      if (val && typeof val === 'object') {
        for (const entityKey of Object.keys(val)) bump(entityKey, 10)
      }
    }),
    ...wordLookupKeys.map(async (k) => {
      const snap = await get(dbRef(db, `lookup_index/${k}`))
      const val = snap.val()
      if (val && typeof val === 'object') {
        for (const entityKey of Object.keys(val)) bump(entityKey, 4)
      }
    })
  ]

  if (plan.prefixKey) {
    tasks.push(
      (async () => {
        const snap = await get(
          query(
            dbRef(db, 'lookup_index'),
            orderByKey(),
            startAt(plan.prefixKey),
            endAt(plan.prefixKey + '\uf8ff'),
            limitToFirst(15)
          )
        )
        const buckets = snap.val()
        if (buckets && typeof buckets === 'object') {
          for (const bucket of Object.values(buckets)) {
            if (bucket && typeof bucket === 'object') {
              for (const entityKey of Object.keys(bucket)) bump(entityKey, 2)
            }
          }
        }
      })()
    )
  }

  await Promise.all(tasks)

  const rankedEntities = Array.from(scoreMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxCandidates)
    .map(([entityKey]) => entityKey)

  const reportIds = []
  const shopIds = []
  for (const ek of rankedEntities) {
    if (ek.startsWith('report_')) reportIds.push(ek.slice('report_'.length))
    else if (ek.startsWith('shop_')) shopIds.push(ek.slice('shop_'.length))
  }

  const [rawReports, rawShops] = await Promise.all([
    Promise.all(reportIds.map((id) => fetchRecordById('scam_reports', id))),
    Promise.all(shopIds.map((id) => fetchRecordById('trusted_shops', id)))
  ])

  const targetCat = category !== 'all' ? String(category).trim().toLowerCase() : ''

  const reports = rawReports
    .filter(Boolean)
    .filter((rep) => {
      if (platform !== 'all') {
        return (rep.socials || []).some((s) => s.platform === platform)
      }
      return true
    })
    .map((item) => ({ item, match: matchRecord(item, trimmed) }))
    .filter((entry) => entry.match.matched)
    .sort((a, b) => a.match.rank - b.match.rank || Number(b.item.createdAt || 0) - Number(a.item.createdAt || 0))

  const shops = rawShops
    .filter(Boolean)
    .filter((shop) => {
      if (targetCat) {
        return String(shop.category || '').trim().toLowerCase() === targetCat
      }
      return true
    })
    .map((item) => ({ item, match: matchRecord(item, trimmed) }))
    .filter((entry) => entry.match.matched)
    .sort((a, b) => a.match.rank - b.match.rank || Number(b.item.createdAt || 0) - Number(a.item.createdAt || 0))

  return { reports, shops }
}

export function subscribePendingReports() {
  if (pendingUnsubscribe) return
  pendingLoading.value = true
  pendingUnsubscribe = onValue(
    dbRef(db, 'pending_reports'),
    (snap) => {
      pendingReports.value = snapshotToList(snap)
      pendingLoading.value = false
    },
    () => {
      pendingLoading.value = false
    }
  )
}

export function unsubscribePendingReports() {
  if (typeof pendingUnsubscribe === 'function') {
    pendingUnsubscribe()
    pendingUnsubscribe = null
  }
}

function sanitizeBankAccounts(bankAccounts = []) {
  return (Array.isArray(bankAccounts) ? bankAccounts : [])
    .map((b) => ({
      bankCode: String(b.bankCode || '').trim(),
      bankName: String(b.bankName || '').trim(),
      bankLogo: String(b.bankLogo || '').trim(),
      accountNumber: normalizeAccountNumber(b.accountNumber || ''),
      accountHolder: normalizeAccountHolder(b.accountHolder || '')
    }))
    .filter((b) => b.accountNumber || b.accountHolder || b.bankCode)
}

function sanitizeSocials(socials = []) {
  return (Array.isArray(socials) ? socials : [])
    .map((s) => {
      const rawUrl = String(s.url || '').trim()
      const parsed = extractSocialIdentifier(rawUrl || s.usernameOrPhone || '')
      return {
        platform: String(s.platform || 'facebook').trim(),
        accountName: String(s.accountName || '').trim(),
        usernameOrPhone: String(s.usernameOrPhone || parsed.handle || '').trim(),
        url: rawUrl
      }
    })
    .filter((s) => s.usernameOrPhone || s.url || s.accountName)
}

function sanitizeLinks(links = []) {
  return (Array.isArray(links) ? links : [])
    .map((l) => {
      const clean = String(l || '').trim()
      if (!clean) return ''
      if (/^(https?:\/\/|\/|data:|blob:)/i.test(clean)) return clean
      return `https://${clean}`
    })
    .filter(Boolean)
}

function parseScamAmount(val) {
  return Number(String(val || '').replace(/[^\d]/g, '')) || 0
}

function sanitizeIncidentItem(item = {}) {
  return {
    scamType: String(item?.scamType || '').trim(),
    scamAmount: parseScamAmount(item?.scamAmount),
    description: String(item?.description || '').trim(),
    evidenceImages: sanitizeLinks(item?.evidenceImages),
    exposeLinks: sanitizeLinks(item?.exposeLinks)
  }
}

export function normalizeReportIncidents(report = {}) {
  if (Array.isArray(report?.incidents) && report.incidents.length) {
    const cleaned = report.incidents
      .map(sanitizeIncidentItem)
      .filter(
        (inc) =>
          inc.scamType ||
          inc.scamAmount > 0 ||
          inc.description ||
          inc.evidenceImages.length > 0 ||
          inc.exposeLinks.length > 0
      )
    if (cleaned.length) return cleaned
  }

  const fallback = sanitizeIncidentItem(report)
  if (
    fallback.scamType ||
    fallback.scamAmount > 0 ||
    fallback.description ||
    fallback.evidenceImages.length > 0 ||
    fallback.exposeLinks.length > 0
  ) {
    return [fallback]
  }
  return []
}

function sanitizeBadges(badges = []) {
  const seen = new Set()
  const out = []
  for (const raw of Array.isArray(badges) ? badges : []) {
    const label = String(raw || '').trim()
    if (!label) continue
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(label)
    if (out.length >= 8) break
  }
  return out
}

export function prepareScamReportPayload(raw, existingCreatedAt = null) {
  const bankAccounts = sanitizeBankAccounts(raw.bankAccounts)
  const socials = sanitizeSocials(raw.socials)
  const subjectName =
    String(raw.subjectName || '').trim() ||
    socials[0]?.accountName ||
    bankAccounts[0]?.accountHolder ||
    'Chưa rõ tên hiển thị'

  const incidents = normalizeReportIncidents(raw)
  const primaryIncident = incidents[0] || sanitizeIncidentItem(raw)
  const totalAmount = incidents.length
    ? incidents.reduce((sum, inc) => sum + (inc.scamAmount || 0), 0)
    : primaryIncident.scamAmount
  const allEvidenceImages = incidents.length
    ? incidents.flatMap((inc) => inc.evidenceImages)
    : primaryIncident.evidenceImages
  const allExposeLinks = incidents.length
    ? Array.from(new Set(incidents.flatMap((inc) => inc.exposeLinks)))
    : primaryIncident.exposeLinks

  const base = {
    subjectName,
    subjectDescription: String(raw.subjectDescription || '').trim(),
    scamType: primaryIncident.scamType,
    scamAmount: totalAmount,
    description: primaryIncident.description,
    incidents,
    bankAccounts,
    socials,
    evidenceImages: allEvidenceImages,
    exposeLinks: allExposeLinks,
    createdAt: existingCreatedAt || Date.now(),
    updatedAt: Date.now()
  }

  const searchMeta = buildSearchPayload(base)
  const indexKeys = buildIndexTokens(base)
  const platKeys = Array.from(new Set(socials.map((s) => toSafeIndexKey(s.platform)).filter(Boolean)))

  return {
    ...base,
    ...searchMeta,
    indexKeys,
    platKeys
  }
}

function sanitizePosition(pos = '') {
  const m = String(pos || '').trim().match(/^(\d{1,3})%\s+(\d{1,3})%$/)
  if (!m) return '50% 50%'
  const x = Math.min(100, Math.max(0, Number(m[1])))
  const y = Math.min(100, Math.max(0, Number(m[2])))
  return `${x}% ${y}%`
}

export function prepareTrustedShopPayload(raw, existingCreatedAt = null) {
  const bankAccounts = sanitizeBankAccounts(raw.bankAccounts)
  const socials = sanitizeSocials(raw.socials)
  const shopName = String(raw.shopName || '').trim()
  const category = String(raw.category || '').trim()

  const base = {
    shopName,
    ownerName: String(raw.ownerName || '').trim(),
    address: String(raw.address || '').trim(),
    avatar: String(raw.avatar || '').trim(),
    avatarPosition: sanitizePosition(raw.avatarPosition),
    coverImage: String(raw.coverImage || '').trim(),
    coverPosition: sanitizePosition(raw.coverPosition),
    galleryImages: sanitizeLinks(raw.galleryImages),
    category,
    categoryKey: toSafeIndexKey(category),
    description: String(raw.description || '').trim(),
    verified: raw.verified !== false,
    badges: sanitizeBadges(raw.badges),
    bankAccounts,
    socials,
    createdAt: existingCreatedAt || Date.now(),
    updatedAt: Date.now()
  }

  const searchMeta = buildSearchPayload(base)
  const indexKeys = buildIndexTokens(base)

  return {
    ...base,
    ...searchMeta,
    indexKeys
  }
}

async function notifyTelegramPendingReport(reportId, report) {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    const res = await fetch('/api/notify-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId, report }),
      signal: controller.signal
    })
    clearTimeout(timer)

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      console.warn('[Telegram Notify] /api/notify-report returned non-JSON:', res.status, contentType)
      return
    }
    const data = await res.json()
    if (!res.ok || !data?.ok) {
      console.warn('[Telegram Notify] Failed:', res.status, data?.error || data)
    }
  } catch (err) {
    console.warn('[Telegram Notify] Request error:', err?.message || err)
    // Non-blocking: report is already safely persisted in Firebase RTDB
  }
}

async function fetchClientNetworkMeta() {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2500)
    const res = await fetch('/api/client-meta', {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal
    })
    clearTimeout(timer)
    const ct = res.headers.get('content-type') || ''
    if (!res.ok || !ct.includes('application/json')) return {}
    const data = await res.json().catch(() => ({}))
    return {
      ip: String(data?.ip || '').trim(),
      location: String(data?.location || '').trim(),
      device: String(data?.device || '').trim()
    }
  } catch {
    return {}
  }
}

// Public submission -> goes into pending_reports (hidden from public listing & lookup_index until approved)
export async function submitUserPendingReport(raw) {
  const payload = prepareScamReportPayload(raw)
  const clientMeta = await fetchClientNetworkMeta()
  const pendingPayload = {
    ...payload,
    reporterName: String(raw.reporterName || '').trim(),
    reporterContact: String(raw.reporterContact || '').trim(),
    reporterIp: clientMeta.ip || '',
    reporterLocation: clientMeta.location || '',
    reporterDevice: clientMeta.device || ''
  }
  const newNode = push(dbRef(db, 'pending_reports'))
  await set(newNode, pendingPayload)
  await notifyTelegramPendingReport(newNode.key, pendingPayload)
  return newNode.key
}

async function adjustSiteMetaForReport(delta) {
  await runTransaction(dbRef(db, 'site_meta/reportsCount'), (cur) => {
    return Math.max(0, Number(cur || 0) + delta)
  })
}

async function adjustSiteMetaForShop({ countDelta = 0, oldCatKey = '', newCatKey = '', newCatLabel = '' }) {
  const tasks = []
  if (countDelta !== 0) {
    tasks.push(
      runTransaction(dbRef(db, 'site_meta/shopsCount'), (cur) => {
        return Math.max(0, Number(cur || 0) + countDelta)
      })
    )
  }
  if (oldCatKey || (newCatKey && newCatLabel)) {
    tasks.push(
      runTransaction(dbRef(db, 'site_meta/shopCategories'), (cur) => {
        const cats = cur && typeof cur === 'object' ? { ...cur } : {}

        if (oldCatKey && cats[oldCatKey]) {
          const dec = Number(cats[oldCatKey].count || 1) - 1
          if (dec <= 0) delete cats[oldCatKey]
          else cats[oldCatKey] = { ...cats[oldCatKey], count: dec }
        }

        if (newCatKey && newCatLabel) {
          const prevCount = Number(cats[newCatKey]?.count || 0)
          cats[newCatKey] = { label: newCatLabel, count: prevCount + 1 }
        }

        return cats
      })
    )
  }
  await Promise.all(tasks)
}

export async function purgeEdgeSeoCache() {
  try {
    const idToken = await auth.currentUser?.getIdToken()
    if (!idToken) return { ok: false, skipped: true }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 6000)
    const res = await fetch('/api/seo-cache-purge', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`
      },
      signal: controller.signal
    })
    clearTimeout(timer)
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return { ok: false, status: res.status }
    }
    const data = await res.json().catch(() => ({}))
    return { ok: Boolean(res.ok && data?.ok), ...data }
  } catch (err) {
    return { ok: false, error: err?.message || 'Network error' }
  }
}

export async function saveSeoSettings(rawSettings) {
  const normalized = normalizeSeoSettings({
    ...rawSettings,
    updatedAt: Date.now()
  })
  await set(dbRef(db, 'site_meta/seo'), normalized)
  seoSettings.value = normalized
  const purge = await purgeEdgeSeoCache()
  return { settings: normalized, cachePurged: Boolean(purge?.ok) }
}

export async function fetchSitemapStats() {
  try {
    const snap = await get(dbRef(db, 'site_meta/sitemapEntries'))
    const val = snap.val() || {}
    const shopsCount = val.shops && typeof val.shops === 'object' ? Object.keys(val.shops).length : 0
    const reportsCount =
      val.reports && typeof val.reports === 'object' ? Object.keys(val.reports).length : 0
    return {
      shopsCount,
      reportsCount,
      syncedAt: Number(val.syncedAt || 0)
    }
  } catch {
    return { shopsCount: 0, reportsCount: 0, syncedAt: 0 }
  }
}

export async function syncSitemapEntriesFromDatabase() {
  const [shopsSnap, reportsSnap] = await Promise.all([
    get(dbRef(db, 'trusted_shops')),
    get(dbRef(db, 'scam_reports'))
  ])

  const shops = {}
  const rawShops = shopsSnap.val()
  if (rawShops && typeof rawShops === 'object') {
    for (const [id, item] of Object.entries(rawShops)) {
      if (item && typeof item === 'object') {
        shops[id] = Number(item.updatedAt || item.createdAt || Date.now())
      }
    }
  }

  const reports = {}
  const rawReports = reportsSnap.val()
  if (rawReports && typeof rawReports === 'object') {
    for (const [id, item] of Object.entries(rawReports)) {
      if (item && typeof item === 'object') {
        reports[id] = Number(item.updatedAt || item.createdAt || Date.now())
      }
    }
  }

  const syncedAt = Date.now()
  await set(dbRef(db, 'site_meta/sitemapEntries'), {
    shops,
    reports,
    syncedAt
  })

  await purgeEdgeSeoCache()

  return {
    shopsCount: Object.keys(shops).length,
    reportsCount: Object.keys(reports).length,
    syncedAt
  }
}

// Admin: approve pending report -> write to scam_reports + lookup_index + plat_index + sitemapEntries, archive reporter, remove pending
export async function approvePendingReport(pendingId, editedData) {
  const publicPayload = prepareScamReportPayload(editedData, editedData.createdAt)
  const approvedId = push(dbRef(db, 'scam_reports')).key

  const updates = {
    [`scam_reports/${approvedId}`]: publicPayload,
    [`pending_reports/${pendingId}`]: null,
    [`site_meta/sitemapEntries/reports/${approvedId}`]: publicPayload.updatedAt
  }
  for (const k of publicPayload.indexKeys) {
    updates[`lookup_index/${k}/report_${approvedId}`] = 1
  }
  for (const p of publicPayload.platKeys) {
    updates[`plat_index/${p}/${approvedId}`] = true
  }
  if (
    editedData.reporterName ||
    editedData.reporterContact ||
    editedData.reporterIp ||
    editedData.reporterLocation ||
    editedData.reporterDevice
  ) {
    updates[`reporter_archive/${approvedId}`] = {
      reporterName: String(editedData.reporterName || '').trim(),
      reporterContact: String(editedData.reporterContact || '').trim(),
      reporterIp: String(editedData.reporterIp || '').trim(),
      reporterLocation: String(editedData.reporterLocation || '').trim(),
      reporterDevice: String(editedData.reporterDevice || '').trim(),
      approvedAt: Date.now()
    }
  }

  await update(dbRef(db), updates)
  await adjustSiteMetaForReport(1)
  bumpFeedCache()
  return approvedId
}

export async function rejectPendingReport(pendingId) {
  await remove(dbRef(db, `pending_reports/${pendingId}`))
}

// Admin CRUD for scam_reports (atomic index + sitemap sync)
export async function saveApprovedReport(raw, reportId = null) {
  const isNew = !reportId
  const targetId = reportId || push(dbRef(db, 'scam_reports')).key
  let oldData = null

  if (!isNew) {
    const oldSnap = await get(dbRef(db, `scam_reports/${targetId}`))
    oldData = oldSnap.exists() ? oldSnap.val() : null
  }

  const payload = prepareScamReportPayload(raw, oldData?.createdAt || raw.createdAt)
  const updates = {
    [`scam_reports/${targetId}`]: payload,
    [`site_meta/sitemapEntries/reports/${targetId}`]: payload.updatedAt
  }

  for (const oldKey of oldData?.indexKeys || []) {
    updates[`lookup_index/${oldKey}/report_${targetId}`] = null
  }
  for (const oldPlat of oldData?.platKeys || []) {
    updates[`plat_index/${oldPlat}/${targetId}`] = null
  }

  for (const k of payload.indexKeys) {
    updates[`lookup_index/${k}/report_${targetId}`] = 1
  }
  for (const p of payload.platKeys) {
    updates[`plat_index/${p}/${targetId}`] = true
  }

  await update(dbRef(db), updates)
  if (isNew || !oldData) {
    await adjustSiteMetaForReport(1)
  }
  bumpFeedCache()
  return targetId
}

export async function deleteApprovedReport(reportId) {
  const oldSnap = await get(dbRef(db, `scam_reports/${reportId}`))
  if (!oldSnap.exists()) return
  const oldData = oldSnap.val()

  const updates = {
    [`scam_reports/${reportId}`]: null,
    [`site_meta/sitemapEntries/reports/${reportId}`]: null
  }
  for (const oldKey of oldData?.indexKeys || []) {
    updates[`lookup_index/${oldKey}/report_${reportId}`] = null
  }
  for (const oldPlat of oldData?.platKeys || []) {
    updates[`plat_index/${oldPlat}/${reportId}`] = null
  }

  await update(dbRef(db), updates)
  await adjustSiteMetaForReport(-1)
  bumpFeedCache()
}

// Admin CRUD for trusted_shops (atomic index + category + sitemap sync)
export async function saveTrustedShop(raw, shopId = null) {
  const isNew = !shopId
  const targetId = shopId || push(dbRef(db, 'trusted_shops')).key
  let oldData = null

  if (!isNew) {
    const oldSnap = await get(dbRef(db, `trusted_shops/${targetId}`))
    oldData = oldSnap.exists() ? oldSnap.val() : null
  }

  const payload = prepareTrustedShopPayload(raw, oldData?.createdAt || raw.createdAt)
  const oldCatKey = oldData?.categoryKey || (oldData?.category ? toSafeIndexKey(oldData.category) : '')

  const updates = {
    [`trusted_shops/${targetId}`]: payload,
    [`site_meta/sitemapEntries/shops/${targetId}`]: payload.updatedAt
  }

  for (const oldKey of oldData?.indexKeys || []) {
    updates[`lookup_index/${oldKey}/shop_${targetId}`] = null
  }
  if (oldCatKey) {
    updates[`cat_index/${oldCatKey}/${targetId}`] = null
  }

  for (const k of payload.indexKeys) {
    updates[`lookup_index/${k}/shop_${targetId}`] = 1
  }
  if (payload.categoryKey) {
    updates[`cat_index/${payload.categoryKey}/${targetId}`] = true
  }

  await update(dbRef(db), updates)
  await adjustSiteMetaForShop({
    countDelta: isNew || !oldData ? 1 : 0,
    oldCatKey: oldData ? oldCatKey : '',
    newCatKey: payload.categoryKey,
    newCatLabel: payload.category
  })
  bumpFeedCache()
  return targetId
}

export async function deleteTrustedShop(shopId) {
  const oldSnap = await get(dbRef(db, `trusted_shops/${shopId}`))
  if (!oldSnap.exists()) return
  const oldData = oldSnap.val()
  const oldCatKey = oldData?.categoryKey || (oldData?.category ? toSafeIndexKey(oldData.category) : '')

  const updates = {
    [`trusted_shops/${shopId}`]: null,
    [`site_meta/sitemapEntries/shops/${shopId}`]: null
  }
  for (const oldKey of oldData?.indexKeys || []) {
    updates[`lookup_index/${oldKey}/shop_${shopId}`] = null
  }
  if (oldCatKey) {
    updates[`cat_index/${oldCatKey}/${shopId}`] = null
  }

  await update(dbRef(db), updates)
  await adjustSiteMetaForShop({
    countDelta: -1,
    oldCatKey,
    newCatKey: '',
    newCatLabel: ''
  })
  bumpFeedCache()
}

export function useRepository() {
  initSiteMetaListener()
  return {
    siteMeta,
    seoSettings,
    seoLoaded,
    metaLoading,
    pendingReports,
    pendingLoading
  }
}
