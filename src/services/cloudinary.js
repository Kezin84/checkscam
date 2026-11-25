const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dsmtq5rbh'
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'checkscam_unsigned'

const ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/avif',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon'
]
const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10MB
const MAX_UPLOAD_DIMENSION = 1600
const JPEG_QUALITY = 0.86

function prepareImageFile(file, { preserveTransparency = false, maxDimension = MAX_UPLOAD_DIMENSION } = {}) {
  return new Promise((resolve) => {
    // Keep SVG / ICO / animated GIF untouched
    if (
      file.type === 'image/svg+xml' ||
      file.type === 'image/x-icon' ||
      file.type === 'image/vnd.microsoft.icon' ||
      (preserveTransparency && file.type === 'image/gif')
    ) {
      resolve(file)
      return
    }

    if (typeof document === 'undefined' || typeof Image === 'undefined') {
      resolve(file)
      return
    }

    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      try {
        let { width, height } = img
        if (!width || !height) {
          URL.revokeObjectURL(objectUrl)
          resolve(file)
          return
        }

        const scale = Math.min(1, maxDimension / Math.max(width, height))
        const targetW = Math.max(1, Math.round(width * scale))
        const targetH = Math.max(1, Math.round(height * scale))

        // Preserve transparent PNG/WebP logos & favicons without flattening onto white JPEG
        if (preserveTransparency) {
          if (scale === 1 && file.size <= 1024 * 1024) {
            URL.revokeObjectURL(objectUrl)
            resolve(file)
            return
          }
          const canvas = document.createElement('canvas')
          canvas.width = targetW
          canvas.height = targetH
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            URL.revokeObjectURL(objectUrl)
            resolve(file)
            return
          }
          ctx.clearRect(0, 0, targetW, targetH)
          ctx.drawImage(img, 0, 0, targetW, targetH)
          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(objectUrl)
              if (!blob) {
                resolve(file)
                return
              }
              const baseName = String(file.name || 'image').replace(/\.[^.]+$/, '')
              resolve(new File([blob], `${baseName}.png`, { type: 'image/png' }))
            },
            'image/png'
          )
          return
        }

        // Keep already-small JPEGs untouched to avoid double re-encoding
        if (file.type === 'image/jpeg' && scale === 1 && file.size <= 350 * 1024) {
          URL.revokeObjectURL(objectUrl)
          resolve(file)
          return
        }

        const canvas = document.createElement('canvas')
        canvas.width = targetW
        canvas.height = targetH
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          URL.revokeObjectURL(objectUrl)
          resolve(file)
          return
        }

        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, targetW, targetH)
        ctx.drawImage(img, 0, 0, targetW, targetH)

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl)
            if (!blob) {
              resolve(file)
              return
            }
            const baseName = String(file.name || 'image').replace(/\.[^.]+$/, '')
            resolve(new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' }))
          },
          'image/jpeg',
          JPEG_QUALITY
        )
      } catch {
        URL.revokeObjectURL(objectUrl)
        resolve(file)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(file)
    }

    img.src = objectUrl
  })
}

export function uploadImageToCloudinary(file, onProgress, options = {}) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Không tìm thấy tệp ảnh để tải lên.'))
      return
    }
    if (file.type && !ALLOWED_MIME.includes(file.type)) {
      reject(new Error('Chỉ chấp nhận tệp hình ảnh hợp lệ (JPG, PNG, WebP, SVG, ICO, GIF, AVIF).'))
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      reject(new Error('Dung lượng mỗi ảnh tối đa 10 MB.'))
      return
    }

    prepareImageFile(file, options).then((preparedFile) => {
      const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`
      const formData = new FormData()
      formData.append('file', preparedFile)
      formData.append('upload_preset', UPLOAD_PRESET)

      const xhr = new XMLHttpRequest()
      xhr.open('POST', endpoint, true)

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && typeof onProgress === 'function') {
          const pct = Math.round((event.loaded / event.total) * 100)
          onProgress(pct)
        }
      }

      xhr.onload = () => {
        try {
          const res = JSON.parse(xhr.responseText)
          if (xhr.status >= 200 && xhr.status < 300 && res.secure_url) {
            resolve({
              url: res.secure_url,
              width: res.width,
              height: res.height,
              publicId: res.public_id
            })
          } else {
            reject(new Error(res?.error?.message || 'Tải ảnh lên không thành công.'))
          }
        } catch {
          reject(new Error('Phản hồi từ máy chủ lưu trữ ảnh không hợp lệ.'))
        }
      }

      xhr.onerror = () => {
        reject(new Error('Mất kết nối mạng trong quá trình tải ảnh bằng chứng.'))
      }

      xhr.send(formData)
    })
  })
}

export function optimizeCloudinaryUrl(url = '', width = 640) {
  if (!url || !url.includes('res.cloudinary.com')) return url
  if (url.includes('/upload/f_jpg')) return url
  if (url.includes('/upload/f_auto')) {
    return url.replace('/upload/f_auto,q_auto,', `/upload/f_jpg,q_auto:good,fl_progressive,`)
  }
  return url.replace('/upload/', `/upload/f_jpg,q_auto:good,fl_progressive,w_${width},c_limit/`)
}
