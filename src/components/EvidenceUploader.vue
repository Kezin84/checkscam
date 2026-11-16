<script setup>
import { ref } from 'vue'
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
const isDragging = ref(false)
const activeUploads = ref([])
const uploadError = ref('')
const dragIndex = ref(null)
const dragOverIndex = ref(null)

function triggerBrowse() {
  fileInputRef.value?.click()
}

async function processFiles(fileList) {
  uploadError.value = ''
  const files = Array.from(fileList || []).filter((f) => f && f.type?.startsWith('image/'))
  if (!files.length) return

  const limit = props.single ? 1 : props.maxFiles - props.modelValue.length
  if (limit <= 0) {
    uploadError.value = `Tối đa ${props.maxFiles} ảnh cho mỗi hồ sơ.`
    return
  }

  const batch = files.slice(0, limit)
  emit('uploading', true)

  for (const file of batch) {
    const tempId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const tracker = { id: tempId, name: file.name || 'clipboard.png', progress: 5 }
    activeUploads.value.push(tracker)

    try {
      const result = await uploadImageToCloudinary(file, (pct) => {
        const found = activeUploads.value.find((u) => u.id === tempId)
        if (found) found.progress = pct
      })
      const next = props.single ? [result.url] : [...props.modelValue, result.url]
      emit('update:modelValue', next)
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
}

function handleDrop(e) {
  isDragging.value = false
  if (e.dataTransfer?.types?.includes('text/x-uploader-index')) return
  if (e.dataTransfer?.files?.length) {
    processFiles(e.dataTransfer.files)
  }
}

function handlePaste(e) {
  const items = e.clipboardData?.items
  if (!items) return
  const pastedFiles = []
  for (const item of items) {
    if (item.type?.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) pastedFiles.push(file)
    }
  }
  if (pastedFiles.length) {
    e.preventDefault()
    processFiles(pastedFiles)
  }
}

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
  <div class="uploader" @paste="handlePaste">
    <input
      ref="fileInputRef"
      type="file"
      accept="image/jpeg,image/png,image/webp"
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
      @click="triggerBrowse"
      @keydown.enter.prevent="triggerBrowse"
      @keydown.space.prevent="triggerBrowse"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true" class="uploader__icon">
        <path d="M12 16V5M12 5L7.5 9.5M12 5L16.5 9.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="square" />
        <path d="M4 15.5V19H20V15.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="square" />
      </svg>
      <div class="uploader__copy">
        <span class="uploader__title">{{ buttonLabel }}</span>
        <span class="uploader__meta">
          Hỗ trợ JPG, PNG, WebP (tối đa 10 MB/ảnh). Bấm chọn tệp, kéo thả hoặc nhấn Ctrl + V để dán ảnh chụp màn hình.
        </span>
      </div>
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

    <p v-if="uploadError" class="field__error">{{ uploadError }}</p>

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
</style>
