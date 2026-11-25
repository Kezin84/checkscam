import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import notifyReportHandler from './api/notify-report.js'
import notifySearchHandler from './api/notify-search.js'

function localApiNotifyPlugin(env) {
  function syncTelegramEnv() {
    const keys = [
      'TELEGRAM_BOT_TOKEN',
      'TELEGRAM_CHAT_ID',
      'TELEGRAM_REPORT_THREAD_ID',
      'TELEGRAM_SEARCH_BOT_TOKEN',
      'TELEGRAM_SEARCH_CHAT_ID',
      'TELEGRAM_SEARCH_THREAD_ID'
    ]
    for (const key of keys) {
      if (env[key] && !process.env[key]) {
        process.env[key] = env[key]
      }
    }
  }

  function enhanceRes(res) {
    res.status = (code) => {
      res.statusCode = code
      return res
    }
    res.json = (payload) => {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
      }
      res.end(JSON.stringify(payload))
      return res
    }
  }

  function attachApiMiddleware(server) {
    server.middlewares.use('/api/notify-report', async (req, res) => {
      syncTelegramEnv()
      enhanceRes(res)
      await notifyReportHandler(req, res)
    })

    server.middlewares.use('/api/notify-search', async (req, res) => {
      syncTelegramEnv()
      enhanceRes(res)
      await notifySearchHandler(req, res)
    })
  }

  return {
    name: 'local-api-notify',
    configureServer: attachApiMiddleware,
    configurePreviewServer: attachApiMiddleware
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue(), localApiNotifyPlugin(env)],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            firebase: ['firebase/app', 'firebase/database', 'firebase/auth']
          }
        }
      }
    }
  }
})
