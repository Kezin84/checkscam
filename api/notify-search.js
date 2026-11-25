/**
 * Local dev / Node handler for /api/notify-search.
 * Production runs on Cloudflare Workers (cloudflare-worker.js).
 */

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttr(value = '') {
  return escapeHtml(value).replace(/"/g, '&quot;')
}

function truncateText(text = '', maxLen = 240) {
  const clean = String(text || '').trim()
  if (clean.length <= maxLen) return clean
  return `${clean.slice(0, maxLen - 1)}…`
}

function parseThreadId(raw) {
  const num = Number(String(raw ?? '').trim())
  return Number.isInteger(num) && num > 0 ? num : null
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') return JSON.parse(req.body)
  const chunks = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim()
  return raw ? JSON.parse(raw) : {}
}

export default async function handler(req, res) {
  const dedicatedBotToken = (process.env.TELEGRAM_SEARCH_BOT_TOKEN || '').trim()
  const botToken = dedicatedBotToken || (process.env.TELEGRAM_BOT_TOKEN || '').trim()
  const chatId = (process.env.TELEGRAM_SEARCH_CHAT_ID || process.env.TELEGRAM_CHAT_ID || '').trim()
  const threadId = parseThreadId(process.env.TELEGRAM_SEARCH_THREAD_ID)

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      endpoint: 'notify-search',
      hasBotToken: Boolean(botToken),
      hasDedicatedBotToken: Boolean(dedicatedBotToken),
      hasChatId: Boolean(chatId),
      hasThreadId: Boolean(threadId)
    })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' })
  }

  if (!botToken || !chatId) {
    return res.status(500).json({
      ok: false,
      error: 'Server missing TELEGRAM_BOT_TOKEN or TELEGRAM_SEARCH_CHAT_ID / TELEGRAM_CHAT_ID'
    })
  }

  let body
  try {
    body = await readJsonBody(req)
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid JSON body' })
  }

  const queryText = String(body?.query || '').trim()
  if (queryText.length < 2) {
    return res.status(200).json({ ok: true, skipped: 'too_short' })
  }

  const reportsCount = Math.max(0, Number(body?.reportsCount || 0) || 0)
  const shopsCount = Math.max(0, Number(body?.shopsCount || 0) || 0)
  const matchedReportNames = Array.isArray(body?.matchedReportNames)
    ? body.matchedReportNames.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 3)
    : []
  const matchedShopNames = Array.isArray(body?.matchedShopNames)
    ? body.matchedShopNames.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 3)
    : []

  const ip =
    String(req.headers?.['cf-connecting-ip'] || '').trim() ||
    String(req.headers?.['x-forwarded-for'] || '')
      .split(',')[0]
      .trim() ||
    req.socket?.remoteAddress ||
    'Không rõ'

  const origin =
    req.headers?.origin ||
    (req.headers?.host ? `http://${req.headers.host}` : '')

  const lines = ['🔎 <b>LƯỢT TRA CỨU MỚI</b>']
  lines.push(`🔑 <b>Từ khóa:</b> <code>${escapeHtml(truncateText(queryText, 240))}</code>`)
  if (reportsCount === 0 && shopsCount === 0) {
    lines.push('📊 <b>Kết quả:</b> ⚪ Chưa có dữ liệu trên hệ thống')
  } else {
    const parts = []
    if (reportsCount > 0) parts.push(`🚨 <b>${reportsCount} cảnh báo lừa đảo</b>`)
    if (shopsCount > 0) parts.push(`✅ <b>${shopsCount} shop uy tín</b>`)
    lines.push(`📊 <b>Kết quả:</b> ${parts.join(' · ')}`)
    if (matchedReportNames.length) {
      lines.push(`   ↳ <b>Cảnh báo:</b> ${escapeHtml(matchedReportNames.join(', '))}`)
    }
    if (matchedShopNames.length) {
      lines.push(`   ↳ <b>Shop:</b> ${escapeHtml(matchedShopNames.join(', '))}`)
    }
  }
  lines.push(`🌐 <b>IP:</b> <code>${escapeHtml(ip)}</code>`)
  if (origin) {
    lines.push(
      `🔗 <a href="${escapeAttr(`${origin.replace(/\/+$/, '')}/?q=${encodeURIComponent(queryText)}`)}">Mở lại kết quả tra cứu</a>`
    )
  }

  const payload = {
    chat_id: chatId,
    text: lines.join('\n'),
    parse_mode: 'HTML',
    disable_web_page_preview: true
  }
  if (threadId) payload.message_thread_id = threadId

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000)
    })
    const tgJson = await tgRes.json().catch(() => ({}))
    if (!tgRes.ok || !tgJson?.ok) {
      return res.status(502).json({
        ok: false,
        error: tgJson?.description || `Telegram API returned ${tgRes.status}`
      })
    }
    return res.status(200).json({ ok: true, messageId: tgJson.result?.message_id || null })
  } catch (err) {
    return res.status(502).json({
      ok: false,
      error: err?.message || 'Failed to reach Telegram API'
    })
  }
}
