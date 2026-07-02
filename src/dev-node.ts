import { serve, type ServerType } from '@hono/node-server'
import { shutdown } from 't0n/cli'
import app from './dev'

const fetch = app.fetch

const port = process.env?.PORT ? Number(process.env.PORT) : 3000

let server: ServerType | null = serve({ fetch, port })

shutdown(() => {
  if (server) {
    server?.close()
    server = null
  }
})
