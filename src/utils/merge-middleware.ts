import type { MiddlewareHandler } from 'hono'
import { MiddlewareType } from '../middleware'
import { resolveMiddleware } from './resolve'

export default function mergeMiddleware(target: Function | any, ...handlers: MiddlewareType[]) {
  const existingMiddlewares: MiddlewareHandler[] = target?.mw || []
  const allMiddlewares = [...existingMiddlewares, ...handlers.flat().map(handler => resolveMiddleware(handler))]
  target.mw = allMiddlewares
}
