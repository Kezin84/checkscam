<script setup>
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { uploadImageToCloudinary, optimizeCloudinaryUrl } from '@/services/cloudinary'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  maxFiles: {
    type: Number,
    default: 8
  },
  single: {
    type: Boolean,
    default: false
  },
  buttonLabel: {
    type: String,
    default: 'Chọn ảnh bằng chứng hoặc dán ảnh (Ctrl + V)'
  }
})

const emit = defineEmits(['update:modelValue', 'uploading'])

const fileInputRef = ref(null)
const modalDialogRef = ref(null)
const contextPasteRef = ref(null)

const modalOpen = ref(false)
const isDragging = ref(false)
const isModalDragging = ref(false)
const justPasted = ref(false)
const activeUploads = ref([])
const uploadError = ref('')
const statusHint = ref('')
const dragIndex = ref(null)
const dragOverIndex = ref(null)

let prevBodyOverflow = ''
let pasteFlashTimer = null

function triggerPasteFlash() {
  justPasted.value = true
  if (pasteFlashTimer) clearTimeout(pasteFlashTimer)
  pasteFlashTimer = setTimeout(() => {
    justPasted.value = false
  }, 650)
}

function openModal() {
  uploadError.value = ''
  statusHint.value = ''
  modalOpen.value = true
  nextTick(() => {
    modalDialogRef.value?.focus()
  })
}

function closeModal() {
  modalOpen.value = false
  isModalDragging.value = false
}

function triggerBrowse() {
  fileInputRef.value?.click()
}

function extractImagesFromClipboardData(clipboardData) {
  if (!clipboardData) return []
  const pastedFiles = []

  if (clipboardData.items) {
    for (const item of clipboardData.items) {
      if (item.type?.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) pastedFiles.push(file)
      }
    }
  }

  if (!pastedFiles.length && clipboardData.files?.length) {
    for (const file of clipboardData.files) {
      if (
        file.type?.startsWith('image/') ||
        /\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(file.name || '')
      ) {
        pastedFiles.push(file)
      }
    }
  }

  return pastedFiles
}

async function processFiles(fileList) {
  uploadError.value = ''
  statusHint.value = ''

  const rawFiles = Array.from(fileList || []).filter(
    (f) =>
      f &&
      (f.type?.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(f.name || ''))
  )
  if (!rawFiles.length) return

  const limit = props.single
    ? 1
    : props.maxFiles - props.modelValue.length - activeUploads.value.length
  if (limit <= 0) {
    uploadError.value = `Tối đa ${props.maxFiles} ảnh cho mỗi mục.`
    return
  }

  const batch = rawFiles.slice(0, limit)
  emit('uploading', true)

  let uploadedCount = 0

  for (const file of batch) {
    const tempId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const displayName =
      !file.name || file.name === 'image.png' ? 'Ảnh từ bộ nhớ tạm' : file.name
    const tracker = { id: tempId, name: displayName, progress: 5 }
    activeUploads.value.push(tracker)

    try {
      const result = await uploadImageToCloudinary(file, (pct) => {
        const found = activeUploads.value.find((u) => u.id === tempId)
        if (found) found.progress = pct
      })
      const next = props.single ? [result.url] : [...props.modelValue, result.url]
      emit('update:modelValue', next)
      await nextTick()
      uploadedCount += 1
    } catch (err) {
      uploadError.value = err?.message || 'Không thể tải ảnh lên máy chủ.'
    } finally {
      activeUploads.value = activeUploads.value.filter((u) => u.id !== tempId)
    }
  }

  if (activeUploads.value.length === 0) {
    emit('uploading', false)
  }
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }

  if (uploadedCount > 0 && !uploadError.value && modalOpen.value) {
    if (props.single) {
      closeModal()
    } else {
      statusHint.value = `Đã thêm ${uploadedCount} ảnh thành công. Bạn có thể tiếp tục Ctrl + V để dán thêm hoặc bấm Hoàn tất.`
    }
  }
}

function handleInlineDrop(e) {
  isDragging.value = false
  if (e.dataTransfer?.types?.includes('text/x-uploader-index')) return
  if (e.dataTransfer?.files?.length) {
    processFiles(e.dataTransfer.files)
  }
}

function handleModalDrop(e) {
  isModalDragging.value = false
  if (e.dataTransfer?.types?.includes('text/x-uploader-index')) return
  if (e.dataTransfer?.files?.length) {
    processFiles(e.dataTransfer.files)
  }
}

function handleInlinePaste(e) {
  if (modalOpen.value || e.defaultPrevented) return
  const pastedFiles = extractImagesFromClipboardData(e.clipboardData)
  if (pastedFiles.length) {
    e.preventDefault()
    processFiles(pastedFiles)
  }
}

function onWindowPaste(e) {
  if (!modalOpen.value || e.defaultPrevented) return
  const pastedFiles = extractImagesFromClipboardData(e.clipboardData)
  e.preventDefault()

  if (contextPasteRef.value) {
    contextPasteRef.value.textContent = ''
  }

  if (pastedFiles.length) {
    triggerPasteFlash()
    processFiles(pastedFiles)
  } else {
    statusHint.value = ''
    uploadError.value =
      'Bộ nhớ tạm hiện chưa có hình ảnh. Hãy chụp màn hình (Win + Shift + S / PrtSc) hoặc sao chép ảnh rồi nhấn Ctrl + V.'
  }
}

function onContextBeforeInput(e) {
  if (e.inputType !== 'insertFromPaste') {
    e.preventDefault()
  }
}

async function pasteFromClipboard() {
  uploadError.value = ''
  statusHint.value = ''

  if (!navigator.clipboard?.read) {
    statusHint.value =
      'Trình duyệt không hỗ trợ đọc bộ nhớ tạm bằng nút bấm. Hãy nhấn trực tiếp Ctrl + V hoặc chuột phải / chạm giữ vào ô bên dưới rồi chọn Dán.'
    contextPasteRef.value?.focus()
    return
  }

  try {
    const clipboardItems = await navigator.clipboard.read()
    const files = []

    for (const clipItem of clipboardItems) {
      const imgType = clipItem.types.find((t) => t.startsWith('image/'))
      if (imgType) {
        const blob = await clipItem.getType(imgType)
        if (blob) {
          const rawExt = imgType.split('/')[1] || 'png'
          const ext = rawExt === 'jpeg' ? 'jpg' : rawExt
          files.push(new File([blob], `clipboard-${Date.now()}.${ext}`, { type: imgType }))
        }
      }
    }

    if (!files.length) {
      uploadError.value =
        'Không tìm thấy hình ảnh trong bộ nhớ tạm. Hãy sao chép ảnh hoặc chụp màn hình trước rồi bấm Dán ảnh (hoặc nhấn Ctrl + V).'
      return
    }

    triggerPasteFlash()
    await processFiles(files)
  } catch {
    statusHint.value =
      'Trình duyệt yêu cầu dán thủ công: hãy nhấn phím Ctrl + V ngay trên cửa sổ này, hoặc chuột phải / chạm giữ vào ô bên dưới để chọn Dán.'
    contextPasteRef.value?.focus()
  }
}

function onWindowKeydown(e) {
  if (!modalOpen.value) return
  if (e.key === 'Escape') {
    e.stopPropagation()
    closeModal()
  }
}

watch(modalOpen, (open) => {
  if (typeof window === 'undefined') return
  if (open) {
    prevBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('paste', onWindowPaste)
    window.addEventListener('keydown', onWindowKeydown)
  } else {
    document.body.style.overflow = prevBodyOverflow
    window.removeEventListener('paste', onWindowPaste)
    window.removeEventListener('keydown', onWindowKeydown)
  }
})

onBeforeUnmount(() => {
  if (pasteFlashTimer) clearTimeout(pasteFlashTimer)
  if (typeof window !== 'undefined') {
    if (modalOpen.value) {
      document.body.style.overflow = prevBodyOverflow
    }
    window.removeEventListener('paste', onWindowPaste)
    window.removeEventListener('keydown', onWindowKeydown)
  }
})

function removeAt(idx) {
  const next = props.modelValue.filter((_, i) => i !== idx)
  emit('update:modelValue', next)
}

function moveItem(fromIdx, toIdx) {
  if (
    fromIdx === toIdx ||
    fromIdx < 0 ||
    toIdx < 0 ||
    fromIdx >= props.modelValue.length ||
    toIdx >= props.modelValue.length
  ) {
    return
  }
  const next = [...props.modelValue]
  const [moved] = next.splice(fromIdx, 1)
  next.splice(toIdx, 0, moved)
  emit('update:modelValue', next)
}

function onThumbDragStart(idx, e) {
  if (props.single || props.modelValue.length < 2) return
  dragIndex.value = idx
  dragOverIndex.value = idx
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/x-uploader-index', String(idx))
  }
}

function onThumbDragOver(idx, e) {
  if (dragIndex.value === null) return
  e.preventDefault()
  dragOverIndex.value = idx
}

function onThumbDrop(idx, e) {
  if (dragIndex.value === null) return
  e.preventDefault()
  e.stopPropagation()
  moveItem(dragIndex.value, idx)
  dragIndex.value = null
  dragOverIndex.value = null
}

function onThumbDragEnd() {
  dragIndex.value = null
  dragOverIndex.value = null
}
</script>

<template>
  <div class="uploader" @paste="handleInlinePaste">
    <input
      ref="fileInputRef"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif"
      :multiple="!single"
      class="uploader__hidden"
      @change="processFiles($event.target.files)"
    />

    <div
      class="uploader__dropzone"
      :class="{ 'is-dragging': isDragging }"
      tabindex="0"
      role="button"
      :aria-label="buttonLabel"
      @click="openModal"
      @keydown.enter.prevent="openModal"
      @keydown.space.prevent="openModal"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleInlineDrop"
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true" class="uploader__icon">
        <path d="M12 16V5M12 5L7.5 9.5M12 5L16.5 9.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="square" />
        <path d="M4 15.5V19H20V15.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="square" />
      </svg>
      <div class="uploader__copy">
        <span class="uploader__title">{{ buttonLabel }}</span>
        <span class="uploader__meta">
          Bấm vào đây để mở cửa sổ dán ảnh (Ctrl + V / Paste) hoặc chọn tệp từ máy · Tối đa 10 MB/ảnh.
        </span>
      </div>
      <span class="uploader__pill">Dán Ctrl+V / Chọn tệp</span>
    </div>

    <div v-if="activeUploads.length && !modalOpen" class="uploader__progress-list">
      <div v-for="u in activeUploads" :key="u.id" class="uploader__progress-row">
        <span class="uploader__file-name">Đang tải lên: {{ u.name }}</span>
        <span class="mono">{{ u.progress }}%</span>
        <div class="uploader__bar">
          <div class="uploader__bar-fill" :style="{ width: `${u.progress}%` }"></div>
        </div>
      </div>
    </div>

    <p v-if="uploadError && !modalOpen" class="field__error">{{ uploadError }}</p>

    <div v-if="modelValue.length" class="uploader__grid" :class="{ 'uploader__grid--single': single }">
      <div
        v-for="(imgUrl, idx) in modelValue"
        :key="imgUrl + idx"
        class="uploader__thumb"
        :class="{
          'is-sortable': !single && modelValue.length > 1,
          'is-dragging-item': dragIndex === idx,
          'is-drop-target': dragOverIndex === idx && dragIndex !== null && dragIndex !== idx
        }"
        :draggable="!single && modelValue.length > 1"
        @dragstart="onThumbDragStart(idx, $event)"
        @dragover="onThumbDragOver(idx, $event)"
        @drop="onThumbDrop(idx, $event)"
        @dragend="onThumbDragEnd"
      >
        <img :src="optimizeCloudinaryUrl(imgUrl, 360)" :alt="`Ảnh tải lên ${idx + 1}`" loading="lazy" />

        <span v-if="!single && modelValue.length > 1" class="mono uploader__order">
          #{{ idx + 1 }}
        </span>

        <button
          type="button"
          class="uploader__remove"
          :aria-label="`Xóa ảnh ${idx + 1}`"
          @click.stop="removeAt(idx)"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
            <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" />
          </svg>
        </button>

        <div v-if="!single && modelValue.length > 1" class="uploader__reorder">
          <button
            type="button"
            class="uploader__move"
            :disabled="idx === 0"
            :aria-label="`Chuyển ảnh ${idx + 1} lên trước`"
            @click.stop="moveItem(idx, idx - 1)"
          >
            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true">
              <path d="M10 3.5L5.5 8L10 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" />
            </svg>
          </button>
          <button
            type="button"
            class="uploader__move"
            :disabled="idx === modelValue.length - 1"
            :aria-label="`Chuyển ảnh ${idx + 1} ra sau`"
            @click.stop="moveItem(idx, idx + 1)"
          >
            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true">
              <path d="M6 3.5L10.5 8L6 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal dán ảnh (Ctrl + V / Paste) hoặc tải tệp từ thiết bị -->
    <Teleport to="body">
      <div
        v-if="modalOpen"
        class="upload-modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="Dán ảnh hoặc tải ảnh lên"
        @click.self="closeModal"
      >
        <div ref="modalDialogRef" class="upload-modal" tabindex="-1">
          <div class="upload-modal__head">
            <div class="upload-modal__head-copy">
              <div class="upload-modal__badges">
                <span class="stamp">Tải lên & Dán ảnh nhanh</span>
                <span v-if="!single" class="mono upload-modal__counter">
                  {{ modelValue.length }} / {{ maxFiles }} ảnh
                </span>
                <span v-else class="mono upload-modal__counter">Chế độ 1 ảnh</span>
              </div>
              <h3>{{ buttonLabel }}</h3>
              <p class="muted">
                Nhấn <strong>Ctrl + V</strong> ngay trên cửa sổ này để dán ảnh chụp màn hình, bấm nút Dán ảnh hoặc chọn tệp từ thiết bị.
              </p>
            </div>

            <button
              type="button"
              class="modal-close-x"
              aria-label="Đóng cửa sổ tải ảnh"
              title="Đóng (Esc)"
              @click="closeModal"
            >
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
            </button>
          </div>

          <div class="upload-modal__body">
            <div
              class="upload-modal__stage"
              :class="{
                'is-dragging': isModalDragging,
                'is-pasted': justPasted
              }"
              @dragover.prevent="isModalDragging = true"
              @dragleave.prevent="isModalDragging = false"
              @drop.prevent="handleModalDrop"
            >
              <div class="upload-modal__visual" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
                  <rect x="5" y="4" width="14" height="17" rx="2" stroke="currentColor" stroke-width="1.7" />
                  <path d="M9 4V3C9 2.44772 9.44772 2 10 2H14C14.5523 2 15 2.44772 15 3V4" stroke="currentColor" stroke-width="1.7" />
                  <path d="M8.5 14.5L11 12L15.5 16.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="square" />
                  <circle cx="14.5" cy="9.5" r="1.3" fill="currentColor" />
                </svg>
              </div>

              <div class="upload-modal__prompt">
                <p class="upload-modal__headline">
                  Nhấn
                  <kbd class="mono upload-modal__kbd">Ctrl</kbd>
                  <span>+</span>
                  <kbd class="mono upload-modal__kbd">V</kbd>
                  để dán ảnh ngay lập tức
                </p>
                <p class="upload-modal__sub">
                  Kéo thả ảnh vào khung này, hoặc dùng một trong hai nút bên dưới (JPG, PNG, WebP tối đa 10 MB).
                </p>
              </div>

              <div class="upload-modal__actions">
                <button
                  type="button"
                  class="btn btn--primary"
                  @click="pasteFromClipboard"
                >
                  <svg viewBox="0 0 20 20" width="17" height="17" fill="none" aria-hidden="true">
                    <rect x="5" y="4" width="10" height="13" rx="1.5" stroke="currentColor" stroke-width="1.6" />
                    <path d="M8 4V3H12V4" stroke="currentColor" stroke-width="1.6" />
                    <path d="M7.5 10.5H12.5M10 8V13" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" />
                  </svg>
                  <span>Dán ảnh (Paste)</span>
                </button>

                <button
                  type="button"
                  class="btn btn--secondary"
                  @click="triggerBrowse"
                >
                  <svg viewBox="0 0 20 20" width="17" height="17" fill="none" aria-hidden="true">
                    <path d="M10 13.5V4.5M10 4.5L6.3 8.2M10 4.5L13.7 8.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" />
                    <path d="M3.5 13V16H16.5V13" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" />
                  </svg>
                  <span>Chọn tệp từ thiết bị</span>
                </button>
              </div>

              <div
                ref="contextPasteRef"
                class="upload-modal__context-paste"
                contenteditable="true"
                inputmode="none"
                spellcheck="false"
                role="textbox"
                aria-label="Ô nhận chuột phải hoặc chạm giữ để Dán ảnh"
                data-placeholder="Hoặc bấm chuột phải / chạm giữ vào ô này → chọn Dán (Paste)"
                @beforeinput="onContextBeforeInput"
              ></div>
            </div>

            <div v-if="activeUploads.length" class="uploader__progress-list">
              <div v-for="u in activeUploads" :key="u.id" class="uploader__progress-row">
                <span class="uploader__file-name">Đang tải lên: {{ u.name }}</span>
                <span class="mono">{{ u.progress }}%</span>
                <div class="uploader__bar">
                  <div class="uploader__bar-fill" :style="{ width: `${u.progress}%` }"></div>
                </div>
              </div>
            </div>

            <p v-if="uploadError" class="field__error upload-modal__alert">{{ uploadError }}</p>
            <p v-else-if="statusHint" class="upload-modal__hint">{{ statusHint }}</p>

            <div v-if="modelValue.length" class="upload-modal__preview-block">
              <div class="upload-modal__preview-head">
                <span class="label">
                  {{ single ? 'Ảnh hiện tại (dán hoặc chọn ảnh mới để thay thế)' : `Ảnh đã tải lên (${modelValue.length}/${maxFiles})` }}
                </span>
              </div>

              <div class="uploader__grid" :class="{ 'uploader__grid--single': single }">
                <div
                  v-for="(imgUrl, idx) in modelValue"
                  :key="'modal-' + imgUrl + idx"
                  class="uploader__thumb"
                  :class="{
                    'is-sortable': !single && modelValue.length > 1,
                    'is-dragging-item': dragIndex === idx,
                    'is-drop-target': dragOverIndex === idx && dragIndex !== null && dragIndex !== idx
                  }"
                  :draggable="!single && modelValue.length > 1"
                  @dragstart="onThumbDragStart(idx, $event)"
                  @dragover="onThumbDragOver(idx, $event)"
                  @drop="onThumbDrop(idx, $event)"
                  @dragend="onThumbDragEnd"
                >
                  <img :src="optimizeCloudinaryUrl(imgUrl, 360)" :alt="`Ảnh tải lên ${idx + 1}`" loading="lazy" />

                  <span v-if="!single && modelValue.length > 1" class="mono uploader__order">
                    #{{ idx + 1 }}
                  </span>

                  <button
                    type="button"
                    class="uploader__remove"
                    :aria-label="`Xóa ảnh ${idx + 1}`"
                    @click.stop="removeAt(idx)"
                  >
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
                      <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" />
                    </svg>
                  </button>

                  <div v-if="!single && modelValue.length > 1" class="uploader__reorder">
                    <button
                      type="button"
                      class="uploader__move"
                      :disabled="idx === 0"
                      :aria-label="`Chuyển ảnh ${idx + 1} lên trước`"
                      @click.stop="moveItem(idx, idx - 1)"
                    >
                      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true">
                        <path d="M10 3.5L5.5 8L10 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="uploader__move"
                      :disabled="idx === modelValue.length - 1"
                      :aria-label="`Chuyển ảnh ${idx + 1} ra sau`"
                      @click.stop="moveItem(idx, idx + 1)"
                    >
                      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true">
                        <path d="M6 3.5L10.5 8L6 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="upload-modal__foot">
            <span class="upload-modal__foot-note muted">
              Mẹo: Nhấn <strong class="mono">Win + Shift + S</strong> để chụp vùng màn hình rồi nhấn <strong class="mono">Ctrl + V</strong> ngay tại đây.
            </span>
            <button type="button" class="btn btn--primary btn--sm" @click="closeModal">
              {{ modelValue.length && !single ? `Hoàn tất (${modelValue.length} ảnh)` : 'Đóng' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.uploader {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}

.uploader__hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.uploader__dropzone {
  display: flex;
  align-items: center;
  gap: var(--s-4);
  padding: 18px 20px;
  border-radius: var(--r-md);
  border: 1px dashed var(--p-line-strong);
  background: var(--p-bg);
  cursor: pointer;
  transition: background-color 150ms var(--ease), border-color 150ms var(--ease);
}

.uploader__dropzone:hover,
.uploader__dropzone.is-dragging {
  background: var(--p-accent-soft);
  border-color: var(--p-action);
}

.uploader__icon {
  color: var(--p-action);
  flex-shrink: 0;
}

.uploader__copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.uploader__title {
  font-size: var(--t-body);
  font-weight: 500;
  color: var(--p-ink);
}

.uploader__meta {
  font-size: var(--t-label);
  color: var(--p-muted);
}

.uploader__pill {
  flex-shrink: 0;
  padding: 6px 12px;
  border-radius: var(--r-sm);
  border: 1px solid rgba(13, 116, 128, 0.28);
  background: var(--p-card);
  color: var(--p-action);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.uploader__progress-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.uploader__progress-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px 12px;
  font-size: var(--t-label);
  color: var(--p-ink);
  padding: 10px 12px;
  border-radius: var(--r-sm);
  background: var(--p-surface);
}

.uploader__file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.uploader__bar {
  grid-column: 1 / -1;
  height: 4px;
  border-radius: 2px;
  background: var(--p-line);
  overflow: hidden;
}

.uploader__bar-fill {
  height: 100%;
  background: var(--p-action);
  transition: width 120ms linear;
}

.uploader__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
  gap: var(--s-3);
}

.uploader__grid--single {
  grid-template-columns: 96px;
}

.uploader__thumb {
  position: relative;
  aspect-ratio: 4 / 3;
  border-radius: var(--r-md);
  overflow: hidden;
  border: 1px solid var(--p-line);
  background: var(--p-surface);
  transition: transform 140ms var(--ease), border-color 140ms var(--ease), opacity 140ms var(--ease);
}

.uploader__thumb.is-sortable {
  cursor: grab;
}

.uploader__thumb.is-sortable:active {
  cursor: grabbing;
}

.uploader__thumb.is-dragging-item {
  opacity: 0.45;
}

.uploader__thumb.is-drop-target {
  border-color: var(--p-action);
  box-shadow: 0 0 0 2px var(--p-accent-soft);
}

.uploader__order {
  position: absolute;
  top: 6px;
  left: 6px;
  padding: 2px 6px;
  border-radius: var(--r-sm);
  background: rgba(24, 37, 43, 0.85);
  color: #ffffff;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.3;
  pointer-events: none;
}

.uploader__reorder {
  position: absolute;
  left: 6px;
  bottom: 6px;
  display: inline-flex;
  gap: 4px;
}

.uploader__move {
  width: 26px;
  height: 26px;
  border-radius: var(--r-sm);
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(24, 37, 43, 0.85);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.uploader__move:hover:not(:disabled) {
  background: var(--p-action);
}

.uploader__move:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.uploader__grid--single .uploader__thumb {
  aspect-ratio: 1 / 1;
}

.uploader__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.uploader__remove {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 28px;
  height: 28px;
  border-radius: var(--r-sm);
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(24, 37, 43, 0.85);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.uploader__remove:hover {
  background: var(--p-danger);
}

/* Upload & Paste Modal */
.upload-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 85;
  background: rgba(24, 37, 43, 0.58);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.upload-modal {
  width: min(100%, 580px);
  max-height: 90svh;
  display: flex;
  flex-direction: column;
  background: var(--p-card);
  border: 1px solid var(--p-line-strong);
  border-radius: var(--r-lg);
  overflow: hidden;
  box-shadow: 0 18px 42px rgba(24, 37, 43, 0.2);
}

.upload-modal:focus {
  outline: none;
}

.upload-modal__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--p-line);
}

.upload-modal__head-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.upload-modal__badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.upload-modal__counter {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: var(--r-sm);
  background: var(--p-accent-soft);
  color: var(--p-action);
  font-weight: 500;
}

.upload-modal__head-copy p {
  font-size: var(--t-small);
}

.upload-modal__body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
  overflow-y: auto;
}

.upload-modal__stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--s-4);
  padding: 24px 20px;
  border-radius: var(--r-md);
  border: 1.5px dashed var(--p-line-strong);
  background: var(--p-bg);
  transition:
    background-color 150ms var(--ease),
    border-color 150ms var(--ease),
    box-shadow 150ms var(--ease);
}

.upload-modal__stage.is-dragging,
.upload-modal__stage.is-pasted {
  background: var(--p-accent-soft);
  border-color: var(--p-action);
  box-shadow: 0 0 0 3px rgba(13, 116, 128, 0.14);
}

.upload-modal__visual {
  width: 52px;
  height: 52px;
  border-radius: var(--r-md);
  background: var(--p-accent-soft);
  color: var(--p-action);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.upload-modal__prompt {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 44ch;
}

.upload-modal__headline {
  font-size: var(--t-body);
  font-weight: 500;
  color: var(--p-ink);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.upload-modal__kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  padding: 2px 7px;
  border-radius: var(--r-sm);
  border: 1px solid var(--p-line-strong);
  border-bottom-width: 2px;
  background: var(--p-card);
  font-size: 12px;
  font-weight: 600;
  color: var(--p-ink);
  line-height: 1.3;
}

.upload-modal__sub {
  font-size: var(--t-label);
  color: var(--p-muted);
}

.upload-modal__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
}

.upload-modal__context-paste {
  width: 100%;
  max-width: 420px;
  padding: 8px 12px;
  border-radius: var(--r-sm);
  border: 1px dashed var(--p-line);
  background: var(--p-card);
  color: var(--p-muted);
  font-size: 12px;
  line-height: 1.4;
  cursor: text;
  caret-color: transparent;
  user-select: none;
}

.upload-modal__context-paste:empty::before {
  content: attr(data-placeholder);
  color: var(--p-muted);
}

.upload-modal__context-paste:focus {
  outline: none;
  border-color: var(--p-action);
  background: #ffffff;
  box-shadow: 0 0 0 2px rgba(13, 116, 128, 0.12);
}

.upload-modal__alert {
  padding: 10px 12px;
  border-radius: var(--r-sm);
  background: var(--p-danger-bg);
  border: 1px solid var(--p-danger-line);
}

.upload-modal__hint {
  padding: 10px 12px;
  border-radius: var(--r-sm);
  background: var(--p-verified-bg);
  border: 1px solid var(--p-verified-line);
  color: var(--p-verified);
  font-size: var(--t-label);
  font-weight: 500;
}

.upload-modal__preview-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid var(--p-line);
}

.upload-modal__preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.upload-modal__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 24px;
  border-top: 1px solid var(--p-line);
  background: var(--p-surface);
}

.upload-modal__foot-note {
  font-size: 12px;
}

@media (max-width: 639px) {
  .uploader__dropzone {
    flex-wrap: wrap;
    padding: 14px 16px;
  }

  .uploader__pill {
    width: 100%;
    text-align: center;
  }

  .upload-modal__head,
  .upload-modal__body {
    padding: 16px;
  }

  .upload-modal__actions {
    flex-direction: column;
  }

  .upload-modal__actions .btn {
    width: 100%;
  }

  .upload-modal__foot {
    flex-direction: column;
    align-items: stretch;
    padding: 12px 16px;
  }

  .upload-modal__foot .btn {
    width: 100%;
  }
}
</style>
