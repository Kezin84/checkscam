import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import notifyReportHandler from './api/notify-report.js'

function localApiNotifyPlugin(env) {
  function attachApiMiddleware(server) {
    server.middlewares.use('/api/notify-report', async (req, res) => {
      if (env.TELEGRAM_BOT_TOKEN && !process.env.TELEGRAM_BOT_TOKEN) {
        process.env.TELEGRAM_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN
      }
      if (env.TELEGRAM_CHAT_ID && !process.env.TELEGRAM_CHAT_ID) {
        process.env.TELEGRAM_CHAT_ID = env.TELEGRAM_CHAT_ID
      }

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

      await notifyReportHandler(req, res)
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
