import { config } from 'dotenv'
import { serve } from '@hono/node-server'
import createApp from './create-app'
import getRoutes from './routes'
import { getAvailablePort } from './utils/port'

config({ path: '.env.dev' })

const routes = await getRoutes()
const fetch = createApp({ routes }).fetch

const desiredPort = process.env?.PORT ? Number(process.env.PORT) : 3000
getAvailablePort(desiredPort)
  .then(port => {
    if (port != desiredPort)
      console.log(`🟨 Port ${desiredPort} was in use, using ${port} as a fallback`)

    console.log(`🚀 API running on http://localhost:${port}`)
    serve({ fetch, port })
  }).catch(err => {
    console.error('Error finding available port:', err)
  })
