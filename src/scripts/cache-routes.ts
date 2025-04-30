import { writeFileSync } from 'node:fs'
import getRoutes from '../routes'
import ensureDir from '../utils/ensuredir'

async function cacheRoutes() {
  const routes = await getRoutes(true)

  const iPath = './tmp/import-routes.mjs'
  ensureDir(iPath)
  writeFileSync(iPath, `// AUTO-GENERATED FILE - DO NOT EDIT
import { registerHandler } from '../src/register'

${routes.map(r => `import ${r.name} from '../${normalizePath(r.file)}'`).join('\n')}

try {
  const handlers = {${routes.map(r => r.name).join()}}

  for (const [name, handler] of Object.entries(handlers)) {
    if (typeof handler === 'function' || handler.prototype?.handle) {
      registerHandler(name, handler)
    }
  }
} catch (error) {
  console.error('Failed to register handlers:', error)
}
`)

  const rPath = './tmp/routes.json'
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
