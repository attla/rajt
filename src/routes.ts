import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import glob from 'tiny-glob'
import { config } from 'dotenv'

import IMPORT from './utils/import'
import { isAnonFn } from './utils/func'
import ensureDir from './utils/ensuredir'
import versionSHA from './utils/version-sha'
import type { Route } from './types'
import { error, substep, warn } from './utils/log'

const __filename = new URL(import.meta.url).pathname
const __root = resolve(dirname(__filename), '../../..')

const importName = (name?: string) => (name || 'Fn'+ Math.random().toString(36).substring(2)).replace(/\.ts$/, '')
const walk = async (dir: string, baseDir: string, fn: Function, parentMw: string[] = []): Promise<void> => {
  if (!existsSync(dir)) return
  const files = readdirSync(dir)

  const currentMw = [...parentMw]
  const indexFile = join(dir, 'index.ts')

  if (existsSync(indexFile)) {
    const mod = await IMPORT(indexFile)
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
      const mod = await IMPORT(fullPath)
      fn(fullPath, baseDir, mod.default, currentMw)
    }
  }
}

let hasDuplicatedRoutes = false
export async function getRoutes(
  dirs: string[] = ['actions', 'features', 'routes']
): Promise<Route[]> {
  hasDuplicatedRoutes = false
  const routes: Route[] = []

  let length = 0
  const keys: Set<string> = new Set()
  const bag: Record<string, string[]> = {}

  await Promise.all(dirs.map(dir => walk(
    resolve(__root, dir),
    dir,
    (path: string, baseDir: string, handle: any, middlewares: string[]) => {
      const name = importName(handle?.name)
      path = path.split(baseDir)[1]
      const file = baseDir + path

      const m = handle?.m?.toLowerCase()
      const [method, uri] = m ? [m, handle?.p] : [extractHttpVerb(path), extractHttpPath(path)]
      routes.push({
        method, path: uri,
        name,
        file,
        // @ts-ignore
        middlewares,
        handle,
      })

      if (!keys.has(name)) {
        keys.add(name)
      } else {
        ;(bag[name] ||= []).push(file)
        length++
      }
    }
  )))

  if (length) {
    hasDuplicatedRoutes = true
    Object.entries(bag).forEach(([name, paths]) => {
      warn(`Route "${name}" has `+ (paths.length > 1 ? `registered ${paths.length} times:` : 'already been registered:'))
      substep(...paths)
    })
  }

  return sortRoutes(routes)
}

function extractHttpVerb(file: string) {
  if (!file) return 'get'
  const match = file.match(/\.(get|post|put|patch|delete|head|options)\.(?=[jt]s$)/i)
  return match && match[1] ? match[1].toLowerCase() : 'get'
}

function extractHttpPath(file: string) {
  const route = '/'+ file.replace(/\\/g, '/')
    // .replace(/^(actions|features|routes)\//, '')
    .replace(/\.[jt]s$/, '')
    .replace(/\.(get|post|put|patch|delete|head|options)$/i, '')
    .replace(/\/index$/, '')
    .split('/')
    .filter(Boolean)
    .filter(part => !(part.startsWith('(') && part.endsWith(')')))
    .map(part => part.startsWith('[') && part.endsWith(']') ? ':'+ part.slice(1, -1) : part)
    .join('/')

  return route == '/' ? '/' : route.replace(/\/$/, '')
}

export function sortRoutes(routes: Route[]) {
  const metas = new Map<string, { score: number, segmentsCount: number }>()

  for (const route of routes)
    metas.set(route.path, computeRouteMeta(route.path))

  const list = routes.sort((a, b) => {
    const metaA = metas.get(a.path)!
    const metaB = metas.get(b.path)!

    if (metaA.score === metaB.score)
      return metaB.segmentsCount - metaA.segmentsCount

    return metaB.score - metaA.score
  })

  while (list.length && list.at(-1)?.path == '/') {
    const last = list.pop()
    last && list.unshift(last)
  }

  return list
}

function computeRouteMeta(path: string) {
  const segments = path.split('/').filter(Boolean)

  let score = 0
  for (const segment of segments) {
    if (segment === '*') {
      continue
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
    resolve(__root, dir),
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

function extractName(file: string) {
  return file.replace(/\.[^/.]+$/, '').split('/').slice(1).join('.')
}

export async function getConfigs(
  dirs: string[] = ['configs']
): Promise<Record<string, any>> {
  if (!dirs?.length) return {}
  const configs: Record<string, any> = {}

  const files = (await glob(join(__root, dirs?.length > 1 ? `{${dirs.join(',')}}` : dirs[0], '/**/*.{ts,js,cjs,mjs,json}')))
    .filter(file => !file.includes('.d.'))

  for (const file of files) {
    const mod = await IMPORT(join(__root, file))
    const keyPath = extractName(file).split('.')

    keyPath.reduce((acc, key, index) => {
      if (index == keyPath.length - 1) {
        acc[key] = mod.default
      } else if (!acc[key] || typeof acc[key] != 'object') {
        acc[key] = {}
      }

      return acc[key]
    }, configs)
  }

  return configs
}

const IDENTIFIER_RE = /^[$_\p{ID_Start}][$_\u200C\u200D\p{ID_Continue}]*$/u
function stringifyToJS(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'

  const type = typeof value

  if (type == 'string') return JSON.stringify(value)
  if (type == 'number' || type == 'boolean') return String(value)
  if (type == 'bigint') return `${value}n`
  if (type == 'function') return value.toString()

  if (Array.isArray(value))
    return `[${value.map(stringifyToJS).join(',')}]`

  if (type == 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => `${IDENTIFIER_RE.test(key) ? key : JSON.stringify(key)}:${stringifyToJS(val)}`)

    return `{${entries.join(',')}}`
  }

  return 'undefined'
}

export async function cacheRoutes() {
  const env = Object.entries(
    config({ path: '../../.env.prod' })?.parsed || {}
  ).filter(([key, val]) => key?.toLowerCase().indexOf('aws') != 0) // prevent AWS credentials

  const version = versionSHA('../../.git') // @ts-ignore
  env.push(['VERSION_SHA', process.env['VERSION_SHA'] = version]) // @ts-ignore
  env.push(['VERSION_HASH', process.env['VERSION_HASH'] = version?.substring(0, 7)])

  const rolePath = join(__root, 'configs/roles.ts')
  ensureDir(rolePath)
  if (!existsSync(rolePath))
    writeFileSync(rolePath, `export default {\n\n}`)

  const routes = await getRoutes()
  if (hasDuplicatedRoutes)
    throw new Error("The app can't build with duplicate routes")

  const middlewares = await getMiddlewares()
  const configs = Object.entries(await getConfigs())

  const iPath = join(__root, 'tmp/import-routes.mjs')
  ensureDir(iPath)
  writeFileSync(iPath, `// AUTO-GENERATED FILE - DO NOT EDIT
${env?.length ? `import { Envir } from '../node_modules/t0n/dist/index'\nEnvir.add({${env.map(([key, val]) => key +':'+ stringifyToJS(val)).join(',')}})` : ''}
${configs?.length ? `import Config from '../node_modules/rajt/src/config'\nConfig.add({${configs.map(([key, val]) => key +':'+ stringifyToJS(val)).join(',')}})` : ''}

import { registerHandler, registerMiddleware } from '../node_modules/rajt/src/register'

${routes.map(r => `import ${r.name} from '../${normalizeImportPath(r.file)}'`).join('\n')}
${middlewares.map(r => `import ${r.name} from '../${normalizeImportPath(r.file)}'`).join('\n')}

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

  const rPath = join(__root, 'tmp/routes.json')
  ensureDir(rPath)
  writeFileSync(rPath, JSON.stringify(routes.filter(r => r.method && r.path).map(route => [
    route.method,
    route.path,
    route.middlewares,
    route.name,
  ])))
}

function normalizeImportPath(file: string) {
  return file.replace(/\.tsx?$/i, '').replace(/(\/index)+$/i, '').replace(/\/+$/g, '')
}
