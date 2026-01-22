import { existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Route } from './types'
import { isAnonFn } from './utils/func'

import { writeFileSync } from 'node:fs'
import { config } from 'dotenv'
import ensureDir from './utils/ensuredir'
import versionSHA from './utils/version-sha'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const importName = (name?: string) => (name || 'Fn'+ Math.random().toString(36).substring(2)).replace(/\.ts$/, '')
const walk = async (dir: string, baseDir: string, fn: Function, parentMw: string[] = []): Promise<void> => {
  if (!existsSync(dir)) return
  const files = readdirSync(dir)

  const currentMw = [...parentMw]
  const indexFile = join(dir, 'index.ts')

  if (existsSync(indexFile)) {
    const mod = await import(indexFile)
    const group = mod.default

    !isAnonFn(group) && group?.mw?.length && currentMw.push(group?.name)
    fn(indexFile, baseDir, group, currentMw)
  }

  for (const file of files) {
    const fullPath = join(dir, file)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      await walk(fullPath, baseDir, fn, currentMw)
    } else if (file != 'index.ts' && file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      const mod = await import(fullPath)
      fn(fullPath, baseDir, mod.default, currentMw)
    }
  }
}

export async function getRoutes(
  dirs: string[] = ['actions', 'features']
): Promise<Route[]> {
  const routes: Route[] = []
  let mw: string[] = []

  await Promise.all(dirs.map(dir => walk(
    resolve(__dirname, '../../..', dir),
    dir,
    (fullPath: string, baseDir: string, handle: any, middlewares: string[]) => {
      const name = importName(handle?.name)
      const file = baseDir + fullPath.split(baseDir)[1]

      routes.push({
        method: handle?.m?.toLowerCase() || '',
        path: handle?.p || '',
        name,
        file,
        // @ts-ignore
        middlewares,
        handle,
      })
    }
  )))

  return sortRoutes(routes)
}

function sortRoutes(routes: Route[]) {
  const metas = new Map<string, { score: number, segmentsCount: number }>()

  for (const route of routes)
    metas.set(route.path, computeRouteMeta(route.path))

  return routes.sort((a, b) => {
    const metaA = metas.get(a.path)!
    const metaB = metas.get(b.path)!

    if (metaA.score === metaB.score)
      return metaB.segmentsCount - metaA.segmentsCount

    return metaB.score - metaA.score
  })
}

function computeRouteMeta(path: string) {
  const segments = path.split('/').filter(Boolean)

  let score = 0
  for (const segment of segments) {
    if (segment === '*') {
      score += 0
    } else if (segment.startsWith(':')) {
      score += 1
    } else {
      score += 10
    }
  }

  return { score, segmentsCount: segments.length }
}

export async function getMiddlewares(
  dirs: string[] = ['middlewares']
): Promise<Route[]> {
  const mw: Route[] = []

  await Promise.all(dirs.map(dir => walk(
    resolve(__dirname, '../../..', dir),
    dir,
    (fullPath: string, baseDir: string, handle: any) => {
      // @ts-ignore
      mw.push({
        name: importName(handle?.name),
        file: baseDir + fullPath.split(baseDir)[1],
        handle,
      })
    }
  )))

  return mw
}

const env = Object.entries(
  config({ path: '../../.env.prod' })?.parsed || {}
).filter(([key, val]) => key?.toLowerCase().indexOf('aws') != 0) // prevent AWS credentials

const version = versionSHA('../../.git') // @ts-ignore
env.push(['VERSION_SHA', process.env['VERSION_SHA'] = version]) // @ts-ignore
env.push(['VERSION_HASH', process.env['VERSION_HASH'] = version?.substring(0, 7)])

export async function cacheRoutes() {
  const rolePath = join(__dirname, '../../../roles.json')
  if (!existsSync(rolePath))
    writeFileSync(rolePath, '{}')

  const routes = await getRoutes()
  const middlewares = await getMiddlewares()

  const iPath = join(__dirname, '../../../tmp/import-routes.mjs')
  ensureDir(iPath)
  writeFileSync(iPath, `// AUTO-GENERATED FILE - DO NOT EDIT
${env?.length ? `import { Envir } from '../node_modules/t0n/dist/index'\nEnvir.add({${env.map(([key, val]) => key + ':' + JSON.stringify(val)).join(',')}})` : ''}

import { registerHandler, registerMiddleware } from '../node_modules/rajt/src/register'

${routes.map(r => `import ${r.name} from '../${normalizePath(r.file)}'`).join('\n')}
${middlewares.map(r => `import ${r.name} from '../${normalizePath(r.file)}'`).join('\n')}

try {
  const handlers = {${routes.map(r => r.name).join()}}

  for (const [name, handler] of Object.entries(handlers)) {
    if (typeof handler == 'function' || handler.prototype?.handle) {
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

  const rPath = join(__dirname, '../../../tmp/routes.json')
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
