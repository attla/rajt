import { existsSync, writeFileSync } from 'node:fs'
import { config } from 'dotenv'
import { getRoutes, getMiddlewares } from '../routes'
import ensureDir from '../utils/ensuredir'

config({ path: '../../.env.dev' })

async function cacheRoutes() {
  const rolePath = '../../roles.json'
  if (!existsSync(rolePath))
    writeFileSync(rolePath, '{}')

  const routes = await getRoutes(true)
  const middlewares = await getMiddlewares()

  const iPath = '../../tmp/import-routes.mjs'
  ensureDir(iPath)
  writeFileSync(iPath, `// AUTO-GENERATED FILE - DO NOT EDIT
import { registerHandler } from '../node_modules/rajt/src/register'

${routes.map(r => `import ${r.name} from '../${normalizePath(r.file)}'`).join('\n')}
${middlewares.map(r => `import ${r.name} from '../${normalizePath(r.file)}'`).join('\n')}

try {
  const handlers = {${routes.map(r => r.name).join()}}

  for (const [name, handler] of Object.entries(handlers)) {
    if (typeof handler === 'function' || handler.prototype?.handle) {
      registerHandler(name, handler)
    }
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
