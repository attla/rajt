import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { config } from 'dotenv'
import { serve, type ServerType } from '@hono/node-server'
import createApp from './create-app'
import { getRoutes, getMiddlewares } from './routes'
import { registerHandler, registerMiddleware } from './register'
import { Ability } from './auth'
import jsonImport from './utils/json-import'
import { setEnv, detectEnvironment } from './utils/environment'
import shutdown from './utils/shutdown'

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

const port = process.env?.PORT ? Number(process.env.PORT) : 3000

let server: ServerType | null = serve({ fetch, port })

shutdown(() => {
  if (server) {
    server?.close()
    server = null
  }
})
