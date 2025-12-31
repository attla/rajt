import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { config } from 'dotenv'
import { serve } from '@hono/node-server'
import createApp from './create-app'
import { getRoutes, getMiddlewares } from './routes'
import { registerHandler, registerMiddleware } from './register'
import { Ability } from './auth'
import { getAvailablePort } from './utils/port'
import jsonImport from './utils/json-import'
import { setEnv, detectEnvironment } from './utils/environment'

setEnv(detectEnvironment())

const __dirname = join(dirname(fileURLToPath(import.meta.url)), '../../../')

config({ path: join(__dirname, '.env.dev') })

let routes = await getRoutes()
routes.forEach(r => registerHandler(r.name, r.handle))
routes = routes.filter(r => r?.path)

const middlewares = await getMiddlewares()
middlewares.forEach(mw => registerMiddleware(mw.handle))

Ability.fromRoutes(routes)
Ability.roles = jsonImport(join(__dirname, 'roles.json'))

const fetch = createApp({ routes }).fetch

const desiredPort = process.env?.PORT ? Number(process.env.PORT) : 3000
getAvailablePort(desiredPort)
  .then(port => {
    if (port != desiredPort)
      console.warn(`🟠 Port ${desiredPort} was in use, using ${port} as a fallback`)

    console.log(`🚀 API running on http://localhost:${port}`)
    serve({ fetch, port })
  }).catch(e => logger.error('Error finding available port:', e))
