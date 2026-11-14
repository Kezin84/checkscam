import { ref } from 'vue'

const FALLBACK_BANKS = [
  { code: 'VCB', shortName: 'Vietcombank', name: 'NH TMCP Ngoại thương Việt Nam', logo: 'https://api.vietqr.io/img/VCB.png' },
  { code: 'MB', shortName: 'MBBank', name: 'NH TMCP Quân đội', logo: 'https://api.vietqr.io/img/MB.png' },
  { code: 'TCB', shortName: 'Techcombank', name: 'NH TMCP Kỹ thương Việt Nam', logo: 'https://api.vietqr.io/img/TCB.png' },
  { code: 'ACB', shortName: 'ACB', name: 'NH TMCP Á Châu', logo: 'https://api.vietqr.io/img/ACB.png' },
  { code: 'BIDV', shortName: 'BIDV', name: 'NH TMCP Đầu tư và Phát triển Việt Nam', logo: 'https://api.vietqr.io/img/BIDV.png' },
  { code: 'ICB', shortName: 'VietinBank', name: 'NH TMCP Công thương Việt Nam', logo: 'https://api.vietqr.io/img/ICB.png' },
  { code: 'VBA', shortName: 'Agribank', name: 'NH Nông nghiệp và Phát triển Nông thôn', logo: 'https://api.vietqr.io/img/VBA.png' },
  { code: 'VPB', shortName: 'VPBank', name: 'NH TMCP Việt Nam Thịnh Vượng', logo: 'https://api.vietqr.io/img/VPB.png' },
  { code: 'TPB', shortName: 'TPBank', name: 'NH TMCP Tiên Phong', logo: 'https://api.vietqr.io/img/TPB.png' },
  { code: 'STB', shortName: 'Sacombank', name: 'NH TMCP Sài Gòn Thương Tín', logo: 'https://api.vietqr.io/img/STB.png' },
  { code: 'VIB', shortName: 'VIB', name: 'NH TMCP Quốc tế Việt Nam', logo: 'https://api.vietqr.io/img/VIB.png' },
  { code: 'HDB', shortName: 'HDBank', name: 'NH TMCP Phát triển TP.HCM', logo: 'https://api.vietqr.io/img/HDB.png' },
  { code: 'SHB', shortName: 'SHB', name: 'NH TMCP Sài Gòn - Hà Nội', logo: 'https://api.vietqr.io/img/SHB.png' },
  { code: 'MSB', shortName: 'MSB', name: 'NH TMCP Hàng Hải Việt Nam', logo: 'https://api.vietqr.io/img/MSB.png' },
  { code: 'OCB', shortName: 'OCB', name: 'NH TMCP Phương Đông', logo: 'https://api.vietqr.io/img/OCB.png' },
  { code: 'LPB', shortName: 'LPBank', name: 'NH TMCP Lộc Phát Việt Nam', logo: 'https://api.vietqr.io/img/LPB.png' },
  { code: 'SEAB', shortName: 'SeABank', name: 'NH TMCP Đông Nam Á', logo: 'https://api.vietqr.io/img/SEAB.png' },
  { code: 'EIB', shortName: 'Eximbank', name: 'NH TMCP Xuất Nhập khẩu Việt Nam', logo: 'https://api.vietqr.io/img/EIB.png' },
  { code: 'CAKE', shortName: 'CAKE by VPBank', name: 'NH số CAKE by VPBank', logo: 'https://api.vietqr.io/img/CAKE.png' },
  { code: 'TIMO', shortName: 'Timo', name: 'Ngân hàng số Timo by Ban Viet', logo: 'https://api.vietqr.io/img/TIMO.png' },
  { code: 'MOMO', shortName: 'Ví MoMo', name: 'Ví điện tử MoMo', logo: '' },
  { code: 'ZALOPAY', shortName: 'ZaloPay', name: 'Ví điện tử ZaloPay', logo: '' },
  { code: 'VIETTELMONEY', shortName: 'Viettel Money', name: 'Hệ sinh thái tài chính số Viettel Money', logo: '' },
  { code: 'GCASH', shortName: 'GCash (PH)', name: 'Ví điện tử GCash Philippines', logo: '' },
  { code: 'MAYA', shortName: 'Maya (PH)', name: 'Ví điện tử & Ngân hàng số Maya Philippines', logo: '' },
  { code: 'BDO', shortName: 'BDO (PH)', name: 'BDO Unibank Philippines', logo: '' },
  { code: 'BPI', shortName: 'BPI (PH)', name: 'Bank of the Philippine Islands', logo: '' },
  { code: 'UBP', shortName: 'UnionBank (PH)', name: 'Union Bank of the Philippines', logo: '' },
  { code: 'GOTYME', shortName: 'GoTyme (PH)', name: 'GoTyme Bank Philippines', logo: '' }
]

const banksRef = ref([...FALLBACK_BANKS])
let loaded = false

export function useBanks() {
  if (!loaded) {
    loaded = true
    loadVietQrBanks()
  }

  function findBank(codeOrName = '') {
    const key = String(codeOrName).trim().toLowerCase()
    if (!key) return null
    return (
      banksRef.value.find(
        (b) => b.code.toLowerCase() === key || b.shortName.toLowerCase() === key
      ) || null
    )
  }

  return {
    banks: banksRef,
    findBank
  }
}

async function loadVietQrBanks() {
  try {
    const cached = sessionStorage.getItem('checkgd_banks_v1')
    if (cached) {
      const parsed = JSON.parse(cached)
      if (Array.isArray(parsed) && parsed.length > 0) {
        banksRef.value = parsed
        return
      }
    }
    const res = await fetch('https://api.vietqr.io/v2/banks')
    const json = await res.json()
    if (Array.isArray(json?.data) && json.data.length > 0) {
      const mapped = json.data.map((item) => ({
        code: item.code,
        shortName: item.shortName || item.code,
        name: item.name || item.shortName,
        logo: item.logo || ''
      }))
      // Append popular e-wallets not always in NAPAS list
      const extras = FALLBACK_BANKS.filter(
        (fb) => !mapped.some((m) => m.code.toUpperCase() === fb.code.toUpperCase())
      )
      const combined = [...mapped, ...extras]
      banksRef.value = combined
      sessionStorage.setItem('checkgd_banks_v1', JSON.stringify(combined))
    }
  } catch {
    // Keep offline fallback silently
  }
}
