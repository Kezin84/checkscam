import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { installClientGuards } from './utils/clientGuard'
import './styles/tokens.css'
import './styles/system.css'

installClientGuards()

const app = createApp(App)
app.use(router)
app.mount('#app')
