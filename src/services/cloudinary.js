const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dsmtq5rbh'
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'checkscam_unsigned'

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10MB

export function uploadImageToCloudinary(file, onProgress) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Không tìm thấy tệp ảnh để tải lên.'))
      return
    }
    if (file.type && !ALLOWED_MIME.includes(file.type)) {
      reject(new Error('Chỉ chấp nhận định dạng ảnh JPG, PNG hoặc WebP.'))
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      reject(new Error('Dung lượng mỗi ảnh tối đa 10 MB.'))
      return
    }

    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`
    const formData = new FormData()
    formData.append('file', file)
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
}

export function optimizeCloudinaryUrl(url = '', width = 640) {
  if (!url || !url.includes('res.cloudinary.com')) return url
  if (url.includes('/upload/f_auto')) return url
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_limit/`)
}
