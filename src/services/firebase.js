import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth'
import { ref, computed } from 'vue'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAERIfCQX_WeHxozRV_uQHS_FcCHhAMafg',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'checkscam-24adf.firebaseapp.com',
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ||
    'https://checkscam-24adf-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'checkscam-24adf',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'checkscam-24adf.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '958988650406',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:958988650406:web:e5de57b34aaaf67195f167',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-41M4ZH7K9Z'
}

export const ADMIN_EMAIL = (
  import.meta.env.VITE_ADMIN_EMAIL || 'quangdang080420022@gmail.com'
)
  .trim()
  .toLowerCase()

export const firebaseApp = initializeApp(firebaseConfig)
export const db = getDatabase(firebaseApp)
export const auth = getAuth(firebaseApp)

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

const currentUser = ref(null)
const authReady = ref(false)
const authError = ref('')

onAuthStateChanged(auth, (user) => {
  currentUser.value = user
  authReady.value = true
})

export function useAuth() {
  const isAdmin = computed(() => {
    const email = currentUser.value?.email?.trim().toLowerCase()
    return Boolean(email && email === ADMIN_EMAIL)
  })

  async function loginWithGoogle() {
    authError.value = ''
    try {
      const result = await signInWithPopup(auth, googleProvider)
      return result.user
    } catch (err) {
      if (err?.code === 'auth/popup-closed-by-user') {
        authError.value = 'Đã đóng cửa sổ đăng nhập trước khi hoàn tất.'
      } else if (err?.code === 'auth/operation-not-allowed') {
        authError.value =
          'Chưa bật Google Sign-in trên Firebase Console (Build → Authentication → Sign-in method → Google → Enable).'
      } else if (err?.code === 'auth/unauthorized-domain') {
        authError.value =
          'Tên miền hiện tại chưa được thêm vào Authorized domains trong Firebase Authentication.'
      } else {
        authError.value = err?.message || 'Không thể đăng nhập bằng Google lúc này.'
      }
      throw err
    }
  }

  async function logout() {
    authError.value = ''
    await firebaseSignOut(auth)
  }

  return {
    currentUser,
    authReady,
    authError,
    isAdmin,
    loginWithGoogle,
    logout
  }
}
