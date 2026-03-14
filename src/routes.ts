import { copyFileSync, existsSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve, relative } from 'pathe'

import { IMPORT } from 't0n'
import glob from 'tiny-glob'
import { config } from 'dotenv'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { mimes } from 'hono/utils/mime'
import { STATUS_CODES } from 'node:http'
import { registerHandler, registerMiddleware } from './register'
import createApp from './create-app'
import _response from './response'
import _validator from './validator'
import { isAnonFn } from './utils/func'
import ensureDir from './utils/ensuredir'
import versionSHA from './utils/version-sha'
import { rn, substep, warn } from './utils/log'
import { _root, _rajt } from './utils/paths'
import { generateOpenAPI } from './open-api/spec'
import { verbAlias } from './http'
import { resolve as _resolve } from './utils/resolve'
import { highlightedMethod, highlightedURI } from './cli/utils'

import type * as z from 'zod'
import type { Routes, Rule, StandardSchemaV1 } from './types'

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

function isZodSchema(obj: any): obj is z.ZodType {
  return (
    obj &&
    typeof obj == 'object' &&
    ('_def' in obj || '_type' in obj) &&
    (obj.safeParse !== undefined || obj.parse !== undefined)
  )
}

function ResolveDescribeSchema(obj: any, deep: boolean = false) {
  if (!obj || typeof obj != 'object') return obj
  if (isZodSchema(obj))
    return { content: {'application/json': { schema: resolver(obj as unknown as StandardSchemaV1) }} }

  if (obj.content && typeof obj.content == 'object') {
    for (const mediaType in obj.content) {
      const contentItem = obj.content[mediaType]
      if (contentItem?.schema && isZodSchema(contentItem.schema))
        contentItem.schema = resolver(contentItem.schema)

      if (mediaType in mimes) {
        obj.content[mimes[mediaType]] = contentItem
        delete obj.content[mediaType]
      }
    }

    return obj
  }

  for (const key in obj) {
    if (obj[key] && typeof obj[key] == 'object') {
      obj[key] = ResolveDescribeSchema(obj[key], true)

      if (!deep && !obj[key]?.description) {
        const desription = (new Response(null, { status: Number(key) })).statusText || STATUS_CODES[key]
        if (desription) obj[key].description = desription
      }

    }
  }

  return obj
}

let hasDuplicatedRoutes = false
export async function getRoutes(
  dirs: string[] = ['actions', 'features', 'routes']
): Promise<Routes> {
  hasDuplicatedRoutes = false
  const routes: Routes = []

  let length = 0
  const keys: Set<string> = new Set()
  const bag: Record<string, string[]> = {}
  const _route = (key: string, _: string) => {
    if (!keys.has(key)) {
      keys.add(key)
    } else {
      ;(bag[key] ||= []).push(_)
      length++
    }
  }

  await Promise.all(dirs.map(dir => walk(
    resolve(_root, dir),
    dir,
    (path: string, baseDir: string, handle: any, middlewares: string[]) => {
      const name = importName(handle?.name)
      path = path.split(baseDir)[1]
      const file = baseDir + path

      const m = handle?.m?.toLowerCase()
      const [method, uri] = m ? [m, handle?.p] : [extractHttpVerb(path), extractHttpPath(path)]
      const d = handle?.d || {}
      const desc = {
        summary: handle?.d?.summary || name,
        ...d,
        responses: {
          500: {$ref: '#/components/responses/500'},
          ...ResolveDescribeSchema(d?.responses),
        }
      }

      const mw = (handle.mw?.length ? [...handle.mw, ...middlewares] : middlewares).flatMap(obj => {
        return typeof obj == 'string' ? obj : obj?.name || null
      }).filter(Boolean) as Function[]

      routes.push({
        method, path: uri,
        name,
        file,
        // @ts-ignore
        middlewares: mw,
        handle,
        desc,
      })

      const routeKey = method +'|'+ uri
      _route(name, file)
      _route(routeKey, file)
    }
  )))

  if (length) {
    hasDuplicatedRoutes = true
    Object.entries(bag).forEach(([name, paths]) => {
      if (name.includes('|')) {
        let [method, uri] = name.split('|')
        method = method.toUpperCase()
        name =  `${highlightedMethod(method, null, true)}  "${highlightedURI(uri, method)}"`
      }

      warn(`Route ${name} has `+ (paths.length > 1 ? `registered ${paths.length} times:` : 'already been registered:'))
      substep(...paths)
    })

    rn()
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

export function sortRoutes(routes: Routes) {
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
): Promise<Routes> {
  const mw: Routes = []

  await Promise.all(dirs.map(dir => walk(
    resolve(_root, dir),
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
  dirs = dirs.filter(dir => existsSync(join(_root, dir)))
  if (!dirs?.length) return {}
  const configs: Record<string, any> = {}

  const files = (await glob(join(_root, dirs?.length > 1 ? `{${dirs.join(',')}}` : dirs[0], '/**/*.{ts,js,cjs,mjs,json}')))
    .filter(file => !file.includes('.d.'))

  for (const file of files) {
    const mod = await IMPORT(join(_root, file))
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

export async function dependencyEntry(lib: string, root: string) {
  const path = await import.meta.resolve(lib)
  return relative(root, path.replace('file://', ''))
}

async function dependencyPath(lib: string) {
  const entry = await dependencyEntry(lib, join(_root, '.rajt'))
  return entry.substring(0, entry.lastIndexOf(lib) + lib.length)
}

export async function cacheRoutes() {
  const env = Object.entries(
    config({ path: join(_root, '.env.prod') })?.parsed || {}
  ).filter(([key, val]) => key?.toLowerCase().indexOf('aws') != 0) // prevent AWS credentials

  const version = versionSHA('../../.git') // @ts-ignore
  env.push(['VERSION_SHA', process.env['VERSION_SHA'] = version]) // @ts-ignore
  env.push(['VERSION_HASH', process.env['VERSION_HASH'] = version?.substring(0, 7)])

  const rolePath = join(_root, 'configs/roles.ts')
  ensureDir(rolePath)
  if (!existsSync(rolePath))
    writeFileSync(rolePath, `export default {\n\n}`)

  const routes = await getRoutes()
  if (hasDuplicatedRoutes)
    throw new Error("The app can't build with duplicate routes")

  const middlewares = await getMiddlewares()
  const configs = await getConfigs()
  const handlers = [
    ['auth/middlewares', 'Autorized', 'Autorized'],
  ]

  for (const r of routes)
    registerHandler(r.name, r.handle)

  for (const mw of middlewares)
    registerMiddleware(mw.handle)

  for (const h of handlers) {
    const mod = await IMPORT(join(_rajt, h[0]))
    registerHandler(h[1], mod[h[1]])
  }

  _validator.setParser((rule: Rule) => validator(rule.target, rule.schema, (result, c) => {
    if (!result.success) // @ts-ignore
      return _response.badRequest(result.error)
  }))
  // @ts-ignore
  const openApi = await generateOpenAPI(createApp({ routes, routeRegister: (app: Hono, route: Route) => {
    app[route.method](route.path, describeRoute(route.desc), ..._resolve(...route.middlewares, route.handle))
  } }), configs?.rajt || {})

  const iPath = join(_root, '.rajt/imports.mjs')
  ensureDir(iPath)

  const localfireEntry = await dependencyEntry('localflare-api', _root)
  copyFileSync(localfireEntry, join(_root, '.rajt/localfire.js'))

  const _rajtDir = await dependencyPath('rajt')

  stringifyToJS(Object.fromEntries(routes.map(r => ([r.path + r.method, r.name]))))

  writeFileSync(iPath, `// AUTO-GENERATED FILE - DO NOT EDIT
${env?.length ? `import { Envir } from '${await dependencyPath('t0n')}/src/envir'\nEnvir.add({${env.map(([key, val]) => key +':'+ stringifyToJS(val)).join(',')}})` : ''}
${Object.entries(configs)?.length ? `import Config from '${_rajtDir}/src/config'\nConfig.add(${stringifyToJS(configs)})` : ''}

import { registerHandler, registerMiddleware } from '${_rajtDir}/src/register'
${handlers.map(([file, name, _export]) => `\nimport ${_export ? `{ ${name} }` : name} from '${_rajtDir}/src/${file}'\nregisterHandler('${name}', ${name})`).join('\n')}

${Object.entries(openApi)?.length ? `registerHandler('RAJT_OPENAPI', ${stringifyToJS(openApi)})` : ''}
Config.set('routes', ${stringifyToJS(Object.fromEntries(routes.map(r => ([r.path+'$'+verbAlias[r.method], r.name]))))})

${routes.map(r => `import ${r.name} from '../${normalizeImportPath(r.file)}'`).join('\n')}
${middlewares.map(r => `import ${r.name} from '../${normalizeImportPath(r.file)}'`).join('\n')}

try {
  const handlers = {${routes.map(r => r.name).join()}}

  for (const [name, handler] of Object.entries(handlers)) {
    registerHandler(name, handler)
  }

  const middlewares = {${middlewares.map(r => r.name).join()}}

  for (const [name, mw] of Object.entries(middlewares)) {
    registerMiddleware(mw)
  }
} catch (e) {
  console.error('Failed to register handlers:', e)
}
`)

  const rPath = join(_root, '.rajt/routes.json')
  ensureDir(rPath)
  writeFileSync(rPath, JSON.stringify(routes.filter(r => r.method && r.path).map(route => [
    verbAlias[route.method],
    route.path,
    route.middlewares,
    route.name,
  ])))
}

function normalizeImportPath(file: string) {
  return file.replace(/\.tsx?$/i, '').replace(/(\/index)+$/i, '').replace(/\/+$/g, '')
}
