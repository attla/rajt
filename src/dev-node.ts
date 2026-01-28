import { serve, type ServerType } from '@hono/node-server'
import app from './dev'
import shutdown from './utils/shutdown'

const fetch = app.fetch

const port = process.env?.PORT ? Number(process.env.PORT) : 3000

let server: ServerType | null = serve({ fetch, port })

shutdown(() => {
  if (server) {
    server?.close()
    server = null
  }
})
