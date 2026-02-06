import Config from './config'
import { Ability } from './auth'
import createApp from './create-app'

// @ts-ignore
import '../../../.rajt/import-routes.mjs'
// @ts-ignore
import routes from '../../../.rajt/routes.json'

// @ts-ignore
Ability.fromRoutes(routes)
Ability.roles = Config.get('roles', {})

// @ts-ignore
export const app = createApp({ routes, configs: Config.get('rajt', {}) })
