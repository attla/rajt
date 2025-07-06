import type { Context, Next } from 'hono'
import { MiddlewareType } from './middleware'
import Response from './response'
import { Ability, Auth as Gate } from './auth'
import mergeMiddleware from './utils/merge-middleware'

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
    mergeMiddleware(target, ...handlers)
  }
}
export function Middlewares(...handlers: MiddlewareType[]) {
  return Middleware(...handlers)
}

export function Auth(target: Function): void
export function Auth(): ClassDecorator
export function Auth(...args: any[]): void | ClassDecorator {
  if (args.length === 1 && typeof args[0] === 'function')
    return _auth(args[0])

  return (target: any) => _auth(target)
}

function _auth(target: Function | any) {
  mergeMiddleware(target, async (c: Context, next: Next) => {
    const user = Gate.user
    const ability = Ability.fromAction(target)

    if (!user || !ability || Gate.cant(ability))
      return Response.unauthorized()

    await next()
  })
}
