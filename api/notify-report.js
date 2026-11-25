/**
 * Vercel Serverless Function: forward new pending scam reports to a Telegram group.
 * Keeps TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID strictly server-side via env vars.
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

function resolveAdminUrl(req) {
  const origin = req.headers?.origin
  if (typeof origin === 'string' && /^https?:\/\//i.test(origin)) {
    return `${origin.replace(/\/+$/, '')}/admin`
  }
  const host = req.headers?.['x-forwarded-host'] || req.headers?.host
  if (typeof host === 'string' && host.trim()) {
    const proto = req.headers?.['x-forwarded-proto'] === 'http' ? 'http' : 'https'
    return `${proto}://${host.trim()}/admin`
  }
  return ''
}

function formatTelegramMessage({ reportId, report, adminUrl, reporterIp }) {
  const lines = ['🚨 <b>ĐƠN TỐ CÁO MỚI CHỜ DUYỆT</b>']

  const incidents = Array.isArray(report.incidents) && report.incidents.length > 0 ? report.incidents : null

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

  const ipText = String(reporterIp || report.reporterIp || '').trim()
  if (ipText) {
    if (!report.reporterName && !report.reporterContact) lines.push('')
    lines.push(`🌐 <b>IP người tố cáo:</b> <code>${escapeHtml(ipText)}</code>`)
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
  const botToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim()
  const chatId = (process.env.TELEGRAM_CHAT_ID || '').trim()

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      endpoint: 'notify-report',
      hasBotToken: Boolean(botToken),
      hasChatId: Boolean(chatId)
    })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' })
  }

  if (!botToken || !chatId) {
    return res.status(500).json({
      ok: false,
      error: 'Server missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID'
    })
  }

  let body
  try {
    body = await readJsonBody(req)
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid JSON body' })
  }

  const reportId = String(body?.reportId || '').trim()
  const report = body?.report
  if (!report || typeof report !== 'object') {
    return res.status(400).json({ ok: false, error: 'Missing report payload' })
  }

  const hasContent =
    Boolean(report.subjectName) ||
    Boolean(report.scamType) ||
    (Array.isArray(report.bankAccounts) && report.bankAccounts.length > 0) ||
    (Array.isArray(report.socials) && report.socials.length > 0)

  if (!hasContent) {
    return res.status(400).json({ ok: false, error: 'Empty report payload' })
  }

  const reporterIp =
    String(req.headers?.['cf-connecting-ip'] || '').trim() ||
    String(req.headers?.['x-forwarded-for'] || '')
      .split(',')[0]
      .trim() ||
    req.socket?.remoteAddress ||
    ''

  const text = formatTelegramMessage({
    reportId,
    report,
    adminUrl: resolveAdminUrl(req),
    reporterIp
  })

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      }),
      signal: AbortSignal.timeout(8000)
    })

    const tgJson = await tgRes.json().catch(() => ({}))
    if (!tgRes.ok || !tgJson?.ok) {
      return res.status(502).json({
        ok: false,
        error: tgJson?.description || `Telegram API returned ${tgRes.status}`
      })
    }

    return res.status(200).json({
      ok: true,
      messageId: tgJson.result?.message_id || null
    })
  } catch (err) {
    return res.status(502).json({
      ok: false,
      error: err?.message || 'Failed to reach Telegram API'
    })
  }
}
