import { dirname, join } from 'node:path'
import { config } from 'dotenv'
import createApp from './create-app'
import { getRoutes, getMiddlewares, getConfigs } from './routes'
import { registerHandler, registerMiddleware } from './register'
import Config from './config'
import { Ability } from 'rajt/auth'
import { setEnv, detectEnvironment } from 'rajt/env'

setEnv(detectEnvironment())

const __dirname = join(dirname(new URL(import.meta.url).pathname), '../../../')

config({ path: join(__dirname, '.env.dev') })

Config.add(await getConfigs())

let routes = await getRoutes()
routes.forEach(r => registerHandler(r.name, r.handle))
routes = routes.filter(r => r?.method && r?.path)

const middlewares = await getMiddlewares()
middlewares.forEach(mw => registerMiddleware(mw.handle))

Ability.fromRoutes(routes)
Ability.roles = Config.get('roles', {})

const app = createApp({ routes, configs: Config.get('rajt', {}) })

export default app
