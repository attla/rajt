import type { MiddlewareHandler } from 'hono'
import BaseMiddleware, { MiddlewareType } from './middleware'

function method(method: string, path = '/') {
  return function (target: any) {
    target.m = method
    target.p = path
    target.mw = []
  }
}

export function Get(path = '/') {
  return method('get', path)
}

export function Post(path = '/') {
  return method('post', path)
}

export function Put(path = '/') {
  return method('put', path)
}

export function Patch(path = '/') {
  return method('patch', path)
}

export function Delete(path = '/') {
  return method('delete', path)
}

export function Middleware(...handlers: MiddlewareType[]) {
  return function (target: any) {
    const middlewareHandlers = handlers.map(handler => {
      if (typeof handler === 'function' && handler.length === 2)
        return handler

      if (handler instanceof BaseMiddleware)
        return handler.handle

      if (BaseMiddleware.isPrototypeOf(handler)) {
        const instance = new (handler as new () => BaseMiddleware)()
        return instance.handle
      }

      throw new Error('Invalid middleware provided. Must be a Hono middleware function or MiddlewareClass instance/constructor')
    })

    const existingMiddlewares: MiddlewareHandler[] = target?.mw || []
    const allMiddlewares = [...existingMiddlewares, ...middlewareHandlers]

    target.mw = allMiddlewares
  }
}
export function Middlewares(...handlers: MiddlewareType[]) {
  return Middleware(...handlers)
}
