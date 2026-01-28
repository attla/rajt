import Config from './config'
import { Ability } from './auth'
import createApp from './create-app'

// @ts-ignore
import '../../../tmp/import-routes.mjs'
// @ts-ignore
import routes from '../../../tmp/routes.json'

// @ts-ignore
Ability.fromRoutes(routes)
Ability.roles = Config.get('roles', {})

// @ts-ignore
export const app = createApp({ routes })
