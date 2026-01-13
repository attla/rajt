import createApp from './create-app'
import { Ability } from './auth'

// @ts-ignore
await import('../../../tmp/import-routes.mjs')

// @ts-ignore
const routes = (await import('../../../tmp/routes.json')).default

// @ts-ignore
Ability.roles = (await import('../../../roles.json')).default
// @ts-ignore
Ability.fromRoutes(routes)

// @ts-ignore
export const app = createApp({ routes })
