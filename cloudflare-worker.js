/**
 * Cloudflare Worker entrypoint:
 * 1. Handles /api/notify-report (forwards new pending scam reports to Telegram using Secret env vars)
 * 2. Serves static Vite build assets with SPA fallback to /index.html for Vue Router paths
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

function formatTelegramMessage({ reportId, report, adminUrl }) {
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

  const text = formatTelegramMessage({
    reportId,
    report,
    adminUrl: `${url.origin}/admin`
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
      })
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

    if (url.pathname === '/api/notify-report' || url.pathname === '/api/notify-report/') {
      return handleNotifyReport(request, env, url)
    }

    if (env?.ASSETS) {
      const assetRes = await env.ASSETS.fetch(request)
      if (assetRes.status !== 404) {
        return assetRes
      }
      if (request.method === 'GET' || request.method === 'HEAD') {
        return env.ASSETS.fetch(new URL('/index.html', url.origin))
      }
      return assetRes
    }

    return new Response('Not Found', { status: 404 })
  }
}
