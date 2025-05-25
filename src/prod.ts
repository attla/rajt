import { handle } from 'hono/aws-lambda'
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
const app = createApp({ routes })

// export default app // AWS Lambda & Cloudflare Workers
export const handler = handle(app) // AWS Lambda (LLRT)
