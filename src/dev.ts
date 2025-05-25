import { config } from 'dotenv'
import { serve } from '@hono/node-server'
import createApp from './create-app'
import getRoutes from './routes'
import { Ability } from './auth'
import { getAvailablePort } from './utils/port'
import jsonImport from './utils/json-import'

config({ path: '../../.env.dev' })

const routes = await getRoutes()
Ability.fromRoutes(routes)
Ability.roles = jsonImport('../../../../.rolefile')

const fetch = createApp({ routes }).fetch

const desiredPort = process.env?.PORT ? Number(process.env.PORT) : 3000
getAvailablePort(desiredPort)
  .then(port => {
    if (port != desiredPort)
      console.warn(`🟨 Port ${desiredPort} was in use, using ${port} as a fallback`)

    console.log(`🚀 API running on http://localhost:${port}`)
    serve({ fetch, port })
  }).catch(err => {
    console.error('Error finding available port:', err)
  })
