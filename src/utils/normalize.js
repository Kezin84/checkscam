export const PLATFORMS = [
  { id: 'facebook', label: 'Facebook', placeholder: 'UID, username hoặc SĐT' },
  { id: 'zalo', label: 'Zalo', placeholder: 'Số điện thoại Zalo' },
  { id: 'tiktok', label: 'TikTok', placeholder: '@username TikTok' },
  { id: 'telegram', label: 'Telegram', placeholder: '@username hoặc SĐT' },
  { id: 'instagram', label: 'Instagram', placeholder: '@username Instagram' },
  { id: 'shopee', label: 'Shopee', placeholder: 'Username gian hàng Shopee' },
  { id: 'threads', label: 'Threads', placeholder: '@username Threads' },
  { id: 'website', label: 'Website', placeholder: 'Tên miền website' },
  { id: 'other', label: 'Khác', placeholder: 'Tên định danh / SĐT' }
]

export const SCAM_TYPES = [
  'Nhận tiền rồi chặn liên lạc, không giao hàng',
  'Giả mạo shop uy tín hoặc giả mạo trung gian',
  'Chỉnh sửa ảnh biên lai chuyển khoản giả (fake bill)',
  'Bán tài khoản game / dịch vụ số rồi thu hồi lại',
  'Lừa tiền đặt cọc đơn hàng hoặc phòng nghỉ',
  'Tuyển cộng tác viên làm nhiệm vụ chuyển khoản',
  'Cho vay tiền online thu phí hồ sơ trước',
  'Kêu gọi đầu tư tài chính / tiền số lừa đảo'
]

export const SHOP_CATEGORIES = [
  'Trung gian giao dịch',
  'Tài khoản số & phần mềm',
  'Mua bán tài khoản game',
  'Thiết bị công nghệ & phụ kiện',
  'Thời trang & mỹ phẩm',
  'Dịch vụ mạng xã hội & thiết kế',
  'Đặt phòng & vé du lịch',
  'Lĩnh vực kinh doanh khác'
]

export function stripVietnamese(str = '') {
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeText(str = '') {
  return stripVietnamese(str).toLowerCase()
}

export function toSafeIndexKey(str = '') {
  return stripVietnamese(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120)
}

export function normalizeAccountNumber(str = '') {
  return String(str)
    .replace(/[\s.\-_]/g, '')
    .trim()
    .toUpperCase()
}

export function normalizeAccountHolder(str = '') {
  return stripVietnamese(str)
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

export function normalizePhone(str = '') {
  let clean = String(str).replace(/[\s.\-()]/g, '').trim()
  if (clean.startsWith('+84')) {
    clean = '0' + clean.slice(3)
  } else if (clean.startsWith('84') && clean.length === 11) {
    clean = '0' + clean.slice(2)
  }
  return clean
}

export function detectPlatformFromInput(input = '') {
  const lower = String(input).toLowerCase()
  if (lower.includes('facebook.com') || lower.includes('fb.com')) return 'facebook'
  if (lower.includes('zalo.me')) return 'zalo'
  if (lower.includes('tiktok.com')) return 'tiktok'
  if (lower.includes('t.me') || lower.includes('telegram.me')) return 'telegram'
  if (lower.includes('instagram.com')) return 'instagram'
  if (lower.includes('shopee.vn')) return 'shopee'
  if (lower.includes('threads.net') || lower.includes('threads.com')) return 'threads'
  return ''
}

export function extractSocialIdentifier(raw = '') {
  const input = String(raw).trim()
  if (!input) return { handle: '', cleanUrl: '' }

  // Plain handle or phone without URL
  if (!/^https?:\/\//i.test(input) && !/\.(com|vn|me|net|org)\//i.test(input)) {
    const cleanHandle = input.replace(/^@/, '').trim()
    const asPhone = normalizePhone(cleanHandle)
    return {
      handle: /^\d{9,12}$/.test(asPhone) ? asPhone : cleanHandle.toLowerCase(),
      cleanUrl: ''
    }
  }

  try {
    const withProto = /^https?:\/\//i.test(input) ? input : `https://${input}`
    const url = new URL(withProto)
    const host = url.hostname.replace(/^(www\.|m\.|web\.|mbasic\.)/i, '').toLowerCase()

    // Facebook special URL patterns
    if (host === 'facebook.com' || host === 'fb.com') {
      const idParam = url.searchParams.get('id')
      if (idParam) {
        return {
          handle: idParam.trim(),
          cleanUrl: `https://facebook.com/profile.php?id=${idParam.trim()}`
        }
      }
      const parts = url.pathname.split('/').filter(Boolean)
      if (parts[0] === 'people' && parts[2]) {
        return {
          handle: parts[2].trim(),
          cleanUrl: `https://facebook.com/profile.php?id=${parts[2].trim()}`
        }
      }
      if (parts[0] && !['share', 'groups', 'permalink.php', 'watch', 'photo', 'posts'].includes(parts[0])) {
        return {
          handle: parts[0].toLowerCase(),
          cleanUrl: `https://facebook.com/${parts[0]}`
        }
      }
      return {
        handle: url.pathname.replace(/^\/+|\/+$/g, '').toLowerCase(),
        cleanUrl: `https://facebook.com${url.pathname.replace(/\/+$/, '')}`
      }
    }

    // Zalo, TikTok, Telegram, Instagram, Shopee, Threads
    const parts = url.pathname.split('/').filter(Boolean)
    const firstSeg = (parts[0] || '').replace(/^@/, '')
    const cleanUrl = `https://${host}${url.pathname.replace(/\/+$/, '')}`
    return {
      handle: firstSeg ? normalizePhone(firstSeg).toLowerCase() : host,
      cleanUrl
    }
  } catch {
    return {
      handle: input.replace(/^@/, '').toLowerCase(),
      cleanUrl: input
    }
  }
}

export function buildSearchPayload(record) {
  const exactSet = new Set()
  const textParts = []

  if (record.subjectName) textParts.push(record.subjectName)
  if (record.shopName) textParts.push(record.shopName)
  if (record.ownerName) textParts.push(record.ownerName)
  if (record.category) textParts.push(record.category)

  const banks = Array.isArray(record.bankAccounts) ? record.bankAccounts : []
  for (const b of banks) {
    const acc = normalizeAccountNumber(b.accountNumber)
    if (acc) {
      exactSet.add(acc.toLowerCase())
      textParts.push(acc)
    }
    if (b.accountHolder) textParts.push(b.accountHolder)
    if (b.bankCode) textParts.push(b.bankCode)
    if (b.bankName) textParts.push(b.bankName)
  }

  const socials = Array.isArray(record.socials) ? record.socials : []
  for (const s of socials) {
    if (s.usernameOrPhone) {
      const phone = normalizePhone(s.usernameOrPhone)
      const parsed = extractSocialIdentifier(s.usernameOrPhone)
      if (phone) exactSet.add(phone.toLowerCase())
      if (parsed.handle) exactSet.add(parsed.handle.toLowerCase())
      textParts.push(s.usernameOrPhone)
    }
    if (s.url) {
      const parsedUrl = extractSocialIdentifier(s.url)
      if (parsedUrl.handle) exactSet.add(parsedUrl.handle.toLowerCase())
      if (parsedUrl.cleanUrl) exactSet.add(parsedUrl.cleanUrl.toLowerCase())
      textParts.push(s.url)
    }
    if (s.accountName) textParts.push(s.accountName)
  }

  return {
    exactTokens: Array.from(exactSet).filter(Boolean),
    searchText: normalizeText(textParts.join(' | '))
  }
}

export function buildIndexTokens(record = {}) {
  const tokens = new Set()
  const addKey = (raw) => {
    const k = toSafeIndexKey(raw)
    if (k && k.length >= 2) tokens.add(k)
  }
  const addWordsAndCompact = (raw) => {
    const norm = normalizeText(raw)
    if (!norm) return
    const words = norm.split(/[^a-z0-9]+/).filter((w) => w.length >= 2)
    for (const w of words) tokens.add(w.slice(0, 80))
    const compact = words.join('')
    if (compact.length >= 4 && compact.length <= 48) tokens.add(compact)
  }

  addWordsAndCompact(record.subjectName)
  addWordsAndCompact(record.shopName)
  addWordsAndCompact(record.ownerName)
  addWordsAndCompact(record.category)

  const banks = Array.isArray(record.bankAccounts) ? record.bankAccounts : []
  for (const b of banks) {
    const acc = normalizeAccountNumber(b.accountNumber)
    if (acc) addKey(acc)
    if (b.bankCode) addKey(b.bankCode)
    addWordsAndCompact(b.bankName)
    addWordsAndCompact(b.accountHolder)
  }

  const socials = Array.isArray(record.socials) ? record.socials : []
  for (const s of socials) {
    if (s.usernameOrPhone) {
      addKey(normalizePhone(s.usernameOrPhone))
      const parsed = extractSocialIdentifier(s.usernameOrPhone)
      if (parsed.handle) {
        addKey(parsed.handle)
        addKey(parsed.handle.replace(/[^a-zA-Z0-9]/g, ''))
      }
    }
    if (s.url) {
      const parsedUrl = extractSocialIdentifier(s.url)
      if (parsedUrl.handle) {
        addKey(parsedUrl.handle)
        addKey(parsedUrl.handle.replace(/[^a-zA-Z0-9]/g, ''))
      }
    }
    addWordsAndCompact(s.accountName)
  }

  return Array.from(tokens).slice(0, 60)
}

export function extractQueryPlan(rawQuery = '') {
  const trimmed = String(rawQuery || '').trim()
  if (!trimmed) return { exactKeys: [], wordKeys: [], prefixKey: '' }

  const isUrlLike = /^https?:\/\//i.test(trimmed) || /\.(com|vn|me|net|org)\//i.test(trimmed)
  const exactSet = new Set()

  if (isUrlLike) {
    const parsed = extractSocialIdentifier(trimmed)
    const hk = toSafeIndexKey(parsed.handle)
    if (hk.length >= 2) {
      exactSet.add(hk)
      const compact = hk.replace(/_/g, '')
      if (compact.length >= 2) exactSet.add(compact)
    }
    return {
      exactKeys: Array.from(exactSet),
      wordKeys: [],
      prefixKey: hk.length >= 3 ? hk : ''
    }
  }

  const accKey = toSafeIndexKey(normalizeAccountNumber(trimmed))
  const telKey = toSafeIndexKey(normalizePhone(trimmed))
  const handleKey = toSafeIndexKey(extractSocialIdentifier(trimmed).handle)

  for (const k of [accKey, telKey, handleKey]) {
    if (k && k.length >= 2) {
      exactSet.add(k)
      const compact = k.replace(/_/g, '')
      if (compact.length >= 2) exactSet.add(compact)
    }
  }

  const rawWords = normalizeText(trimmed)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2)
  const uniqueWords = Array.from(new Set(rawWords))
  const wordKeys = uniqueWords
    .slice()
    .sort((a, b) => b.length - a.length)
    .slice(0, 4)

  const lastWord = rawWords[rawWords.length - 1] || ''
  let prefixKey = ''
  if (uniqueWords.length === 1 && uniqueWords[0].length >= 3) {
    prefixKey = uniqueWords[0]
  } else if (handleKey.length >= 3 && !trimmed.includes(' ')) {
    prefixKey = handleKey
  } else if (lastWord.length >= 3) {
    prefixKey = lastWord
  }

  return {
    exactKeys: Array.from(exactSet),
    wordKeys,
    prefixKey
  }
}

export function matchRecord(record, rawQuery = '') {
  const trimmed = String(rawQuery).trim()
  if (!trimmed) return { matched: false, rank: 99, matchType: null, matchedValue: '' }

  const normText = normalizeText(trimmed)
  const normAcc = normalizeAccountNumber(trimmed).toLowerCase()
  const normTel = normalizePhone(trimmed).toLowerCase()
  const parsedSocial = extractSocialIdentifier(trimmed)

  const banks = Array.isArray(record.bankAccounts) ? record.bankAccounts : []
  for (const b of banks) {
    const acc = normalizeAccountNumber(b.accountNumber).toLowerCase()
    if (acc && normAcc && acc === normAcc) {
      return {
        matched: true,
        rank: 1,
        matchType: 'exact_stk',
        matchedValue: `${b.bankCode ? b.bankCode + ' · ' : ''}${b.accountNumber}`
      }
    }
  }

  const socials = Array.isArray(record.socials) ? record.socials : []
  for (const s of socials) {
    const handleFromField = extractSocialIdentifier(s.usernameOrPhone || '').handle.toLowerCase()
    const telFromField = normalizePhone(s.usernameOrPhone || '').toLowerCase()
    const parsedFromUrl = extractSocialIdentifier(s.url || '')

    if (
      (normTel && normTel.length >= 4 && (telFromField === normTel || handleFromField === normTel)) ||
      (parsedSocial.handle &&
        parsedSocial.handle.length >= 3 &&
        (handleFromField === parsedSocial.handle || parsedFromUrl.handle === parsedSocial.handle)) ||
      (parsedSocial.cleanUrl &&
        parsedFromUrl.cleanUrl &&
        parsedSocial.cleanUrl.toLowerCase() === parsedFromUrl.cleanUrl.toLowerCase())
    ) {
      return {
        matched: true,
        rank: 2,
        matchType: 'exact_social',
        matchedValue: s.usernameOrPhone || parsedFromUrl.handle || s.url
      }
    }
  }

  // Fallback check against precomputed exactTokens
  if (Array.isArray(record.exactTokens)) {
    const candidates = [normAcc, normTel, parsedSocial.handle, parsedSocial.cleanUrl?.toLowerCase()].filter(
      (v) => v && v.length >= 3
    )
    for (const c of candidates) {
      if (record.exactTokens.includes(c)) {
        return { matched: true, rank: 2, matchType: 'exact_social', matchedValue: trimmed }
      }
    }
  }

  // Partial STK prefix/substring (at least 5 digits)
  if (/^\d{5,}$/.test(normAcc)) {
    for (const b of banks) {
      const acc = normalizeAccountNumber(b.accountNumber).toLowerCase()
      if (acc.includes(normAcc)) {
        return {
          matched: true,
          rank: 3,
          matchType: 'partial_stk',
          matchedValue: b.accountNumber
        }
      }
    }
  }

  // Name / holder / general searchText match
  const haystack = record.searchText || buildSearchPayload(record).searchText
  if (normText.length >= 2 && haystack.includes(normText)) {
    return {
      matched: true,
      rank: 4,
      matchType: 'name_partial',
      matchedValue: record.shopName || record.subjectName || trimmed
    }
  }

  // Multi-word non-contiguous name match (e.g. "Nguyen Mai" matching "NGUYEN NGOC MAI")
  const queryWords = normText.split(/[^a-z0-9]+/).filter((w) => w.length >= 2)
  if (queryWords.length >= 2 && queryWords.every((w) => haystack.includes(w))) {
    return {
      matched: true,
      rank: 5,
      matchType: 'name_partial',
      matchedValue: record.shopName || record.subjectName || trimmed
    }
  }

  return { matched: false, rank: 99, matchType: null, matchedValue: '' }
}

export function formatDateVi(ts) {
  if (!ts) return 'Chưa rõ ngày'
  try {
    const d = new Date(Number(ts))
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(d)
  } catch {
    return ''
  }
}

export function formatCurrencyVi(amount) {
  const num = Number(String(amount || '').replace(/[^\d]/g, ''))
  if (!num || Number.isNaN(num)) return ''
  return new Intl.NumberFormat('vi-VN').format(num) + ' ₫'
}

export function platformLabel(id) {
  return PLATFORMS.find((p) => p.id === id)?.label || id || 'MXH'
}

export function resolveSocialId(soc = {}) {
  const direct = String(soc?.usernameOrPhone || '').trim()
  if (direct) return direct
  if (soc?.url) {
    return extractSocialIdentifier(soc.url).handle || ''
  }
  return ''
}

export function resolveSocialUrl(soc = {}) {
  const rawUrl = String(soc?.url || '').trim()
  if (rawUrl) {
    return /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`
  }

  const rawHandle = String(soc?.usernameOrPhone || '').trim()
  if (!rawHandle) return ''
  if (/^https?:\/\//i.test(rawHandle)) return rawHandle

  const clean = rawHandle.replace(/^@/, '').trim()
  if (!clean) return ''

  switch (soc?.platform) {
    case 'facebook':
      return /^\d+$/.test(clean)
        ? `https://www.facebook.com/profile.php?id=${clean}`
        : `https://www.facebook.com/${clean}`
    case 'zalo': {
      const tel = normalizePhone(clean)
      return /^\d{8,13}$/.test(tel) ? `https://zalo.me/${tel}` : ''
    }
    case 'tiktok':
      return `https://www.tiktok.com/@${clean}`
    case 'telegram':
      return `https://t.me/${clean}`
    case 'instagram':
      return `https://www.instagram.com/${clean}`
    case 'shopee':
      return `https://shopee.vn/${clean}`
    case 'threads':
      return `https://www.threads.net/@${clean}`
    case 'website':
      return clean.includes('.') ? `https://${clean}` : ''
    default:
      return ''
  }
}
