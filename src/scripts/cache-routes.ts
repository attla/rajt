import { existsSync, writeFileSync } from 'node:fs'
import { config } from 'dotenv'
import { getRoutes, getMiddlewares } from '../routes'
import ensureDir from '../utils/ensuredir'
import versionSHA from '../utils/version-sha'

const env = Object.entries(
  config({ path: '../../.env.prod' })?.parsed || {}
).filter(([key, val]) => key?.toLowerCase().indexOf('aws') != 0) // prevent AWS credentials

const version = versionSHA('../../.git')
env.push(['VERSION_SHA', process.env['VERSION_SHA'] = version])
env.push(['VERSION_HASH', process.env['VERSION_HASH'] = version?.substring(0, 7)])

async function cacheRoutes() {
  const rolePath = '../../roles.json'
  if (!existsSync(rolePath))
    writeFileSync(rolePath, '{}')

  const routes = await getRoutes()
  const middlewares = await getMiddlewares()

  const iPath = '../../tmp/import-routes.mjs'
  ensureDir(iPath)
  writeFileSync(iPath, `// AUTO-GENERATED FILE - DO NOT EDIT
${env?.length ? `import { Envir } from '../node_modules/t0n/dist/index'\nEnvir.add({${env.map(([key, val]) => key + ':' + JSON.stringify(val)).join(',')}})` : ''}

import { registerHandler, registerMiddleware } from '../node_modules/rajt/src/register'

${routes.map(r => `import ${r.name} from '../${normalizePath(r.file)}'`).join('\n')}
${middlewares.map(r => `import ${r.name} from '../${normalizePath(r.file)}'`).join('\n')}

try {
  const handlers = {${routes.map(r => r.name).join()}}

  for (const [name, handler] of Object.entries(handlers)) {
    if (typeof handler === 'function' || handler.prototype?.handle) {
      registerHandler(name, handler)
    }
  }

  const middlewares = {${middlewares.map(r => r.name).join()}}

  for (const [name, mw] of Object.entries(middlewares)) {
    registerMiddleware(mw)
  }
} catch (e) {
  console.error('Failed to register handlers:', e)
}
`)

  const rPath = '../../tmp/routes.json'
  ensureDir(rPath)
  writeFileSync(rPath, JSON.stringify(routes.filter(r => r.method && r.path).map(route => [
    route.method,
    route.path,
    route.middlewares,
    route.name,
  ])))
}

function normalizePath(file: string) {
  return file.replace(/\.tsx?$/i, '').replace(/(\/index)+$/i, '').replace(/\/+$/g, '')
}

cacheRoutes()
  .then(() => {
    console.log('✅ Routes cached!')
    process.exit(0)
  }).catch(e => {
    console.error('❌ Error: ', e)
    process.exit(1)
  })
