import type { Context, Next } from 'hono'
import { MiddlewareType } from './middleware'
import JsonResponse from './response'
import { Ability, Authnz, Token } from './auth'
import { registerGlobalMiddleware } from './register'
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

type MiddlewareOpt = string | RegExp
export function GlobalMiddleware(): ClassDecorator
export function GlobalMiddleware(target: Function): void
export function GlobalMiddleware(opt?: MiddlewareOpt): ClassDecorator
export function GlobalMiddleware(...args: any[]): void | ClassDecorator {
  if (typeof args[0] === 'function')
    return _globalmw(args[0])

  return (target: any) => _globalmw(target, ...args)
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
    const unauthorized = JsonResponse.unauthorized()

    const auth = Authnz.fromToken(Token.fromRequest(c))
    const ability = Ability.fromAction(target)

    if (!auth || !ability || auth.cant(ability))
      return unauthorized

    c.set('#auth', auth)
    await next()
  })
}

function _globalmw(target: Function | any, path?: string) {
  target.gmw = true
  target.p = path
  registerGlobalMiddleware(target)
}
