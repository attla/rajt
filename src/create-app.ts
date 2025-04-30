/* eslint-disable @typescript-eslint/no-explicit-any */
import { Hono } from 'hono'
import type { Env, Context, ErrorHandler, NotFoundHandler, Next } from 'hono'
// import type { Env, Context, ErrorHandler, MiddlewareHandler, NotFoundHandler, Next } from 'hono'
// import { createMiddleware } from 'hono/factory'
// import type { H, Handler, HandlerResponse } from 'hono/types'
import { HTTPResponseError } from 'hono/types'
import { Routes } from './types'
import { BadRequest, Unauthorized } from './exceptions'
import response from './response'
import resolve from './utils/resolve'
import { getHandler } from './register'
import env from './utils/environment'

type InitFunction<E extends Env = Env> = (app: Hono<E>) => void

export type ServerOptions<E extends Env = Env> = Partial<{
  routes: Routes,
  notFound: NotFoundHandler<E>,
  onError: ErrorHandler<E>,
  root: string,
  app?: Hono<E>,
  init?: InitFunction<E>,
}>

const isDev = env() === 'dev'
const NFHandler = () => response.notFound()
const EHandler = async (e: Error | HTTPResponseError) => {
  console.error(e)

  switch (true) {
    case e instanceof Unauthorized:
    case 'status' in e && e.status === 401:
      return response.unauthorized()

    case e instanceof BadRequest:
    case 'status' in e && e.status === 400:
      // @ts-ignore
      return response.badRequest(undefined, e?.message)

    // case e.message.includes('Not Found'):
    // // @ts-ignore
    // case e?.status === 404:
    //   return json.notFound();

    default:
      return response.internalError(
        // @ts-ignore
        isDev
          ? e.stack?.split('\n').map(line =>
              line.replace(
                /at (.+ )?\(?([^)]+)\)?/g,
                (match, method, path) => {
                  if (!path) return match

                  const nodeModulesIndex = path.indexOf('node_modules')
                  if (nodeModulesIndex > -1) {
                    return `${method || ''}(node_modules${path.slice(nodeModulesIndex + 'node_modules'.length)})`
                  }

                  const projectRoot = process.cwd()
                  const relativePath = path.startsWith(projectRoot)
                    ? path.slice(projectRoot.length + 1)
                    : path
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
  //   isDev ? e.stack?.split('\n    at ').map() : undefined,
  //   e.message || 'Internal Error'
  // )
  // error: e.message,
  // cause: e.cause || 'Desconhecido',
  // stack: isDev ? e.stack : undefined
}

export const createApp = <E extends Env>(options?: ServerOptions<E>) => {
  // const root = options?.root ?? '/'
  const app = options?.app ?? new Hono<E>()

  const middlewares = [
    async (c: Context, next: Next) => {
      response.setContext(c)
      await next()
    },
  ]
  middlewares.forEach(middleware => app.use(middleware))

  app.onError(options?.onError || EHandler)
  app.notFound(options?.notFound || NFHandler)

  if (options?.init)
    options.init(app)

  const routes = options?.routes || []
  for (const route of routes) {
    if (Array.isArray(route)) {
      const handle = getHandler(route[3])
      // @ts-ignore
      app[route[0]](route[1], ...mw(route[2], route[3]), ...resolve(handle))
    } else {
      // @ts-ignore
      app[route.method](route.path, ...mw(route.middlewares, route.name), ...resolve(route.handle))
    }
  }

  return app
}

function mw(...objs: string[]): Function[] {
  return objs.flatMap(obj => {
    if (typeof obj !== 'string') return null
    // @ts-ignore
    return getHandler(obj)?.mw || null
  }).flat().filter(Boolean)
}

export default createApp
