import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { matchedRoutes } from 'hono/route'
import { Envir } from 't0n'
import type {
  Env, Context, Next,
  HTTPResponseError,
  ServerOptions,
} from './types'
import { resolve, resolveMiddleware } from './utils/resolve'
import { getMiddlewares, getHandler } from './register'
import request, { GET_REQUEST } from './request'
import response from './response'
import { isDev } from './utils/environment'
import localDate from './utils/local-date'
import { gray } from './utils/colors'

const NFHandler = () => response.notFound()
const EHandler = async (e: Error | HTTPResponseError) => {
  console.error(e)

  switch (true) {
    case 'status' in e && e.status == 401:
      return response.unauthorized()

    case 'status' in e && e.status == 400: // @ts-ignore
      return response.badRequest(null, e?.message)

    default:
      return response.internalError(
        // @ts-ignore
        isDev()
          ? e.stack?.split('\n').map(line =>
              line.replace(
                /at (.+ )?\(?([^)]+)\)?/g,
                (match, method, path) => {
                  if (!path) return match

                  const nodeModulesIndex = path.indexOf('node_modules')
                  if (nodeModulesIndex > -1)
                    return `${method || ''}(node_modules${path.slice(nodeModulesIndex + 'node_modules'.length)})`

                  const projectRoot = process.cwd()
                  const relativePath = path.startsWith(projectRoot) ? path.slice(projectRoot.length + 1) : path
                  return `${method || ''}(${relativePath})`
                }
              ).trim()
            )
          : undefined,
        e.message || 'Internal Error'
      )
  }

  // return json.internalError(
  //   // @ts-ignore
  //   isDev() ? e.stack?.split('\n    at ').map() : undefined,
  //   e.message || 'Internal Error'
  // )
  // error: e.message,
  // cause: e.cause || '???',
  // stack: isDev (? e.stack : undefined
}

export const createApp = <E extends Env>(options?: ServerOptions<E>) => {
  // const root = options?.root ?? '/'
  const app = options?.app ?? new Hono<E>()

  if (isDev()) {
    app.use('*', async function (c: Context, next: Next) {
      const method = c.req.method
      const route = matchedRoutes(c).find(route => route.method == method)?.path
      const logWithRoute = (args: string[]) => {
        if (!route || !args.length) return args
        return args.map(arg => {
          if (!arg) return arg
          const split = arg?.split(' ')
          if (split.length < 3 || split[2] == route)
            return arg

          split.splice(Math.min(3, split.length), 0, gray(route))
          return split.join(' ')
        })
      }

      const devLogger = logger((...args: any[]) => {
        const timestamp = gray(localDate())
        console.log(timestamp, ...logWithRoute(args))
      })

      await devLogger(c, next)
    })
  }

  app.use(async (c: Context, next: Next) => {
    c.set(GET_REQUEST as unknown as string, new request(c))
    if (c.env) Envir.add(c.env)
    await next()
  })
  getMiddlewares().forEach(mw => {
    const h = async (c: Context, next: Next) => await resolveMiddleware(mw)(c.get(GET_REQUEST as unknown as string), next)
    // @ts-ignore
    mw?.path ? app.use(String(mw.path), h) : app.use(h)
  })
  // @ts-ignore
  app.onError(options?.onError || EHandler)
  // @ts-ignore
  app.notFound(options?.notFound || NFHandler)

  if (options?.init) options.init(app)

  const routes = options?.routes || []
  for (const route of routes) {
    if (Array.isArray(route)) { // @ts-ignore
      app[route[0]](route[1], ...mw(route[2], route[3]), ...resolve(getHandler(route[3]), route[3]))
    } else { // @ts-ignore
      app[route.method](route.path, ...mw(route.middlewares, route.name), ...resolve(route.handle, route.name))
    }
  }

  return app
}

function mw(...objs: string[]): Function[] {
  return objs.flatMap(obj => {
    if (typeof obj != 'string') return null
    // @ts-ignore
    return getHandler(obj)?.mw || null
  }).flat().filter(Boolean)
}

export default createApp
