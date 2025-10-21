import type { Context, Next } from 'hono'
import { MiddlewareType } from './middleware'
import Response from './response'
import { Ability, Auth as Gate } from './auth'
import mergeMiddleware from './utils/merge-middleware'

function method(method: string, ...args: any[]): void | ClassDecorator {
  if (args.length === 1 && typeof args[0] === 'function')
    return _method(method, '/', args[0])

  const path = typeof args[0] === 'string' ? args[0] : '/'
  return (target: Function) => _method(method, path, target)
}

function _method(method: string, path = '/', target: Function | any) {
  target.m = method
  target.p = path
  target.mw = []
}

export function Get(): ClassDecorator
export function Get(target: Function): void
export function Get(path: string): ClassDecorator
export function Get(...args: any[]): void | ClassDecorator {
  return method('get', ...args)
}

export function Post(): ClassDecorator
export function Post(target: Function): void
export function Post(path: string): ClassDecorator
export function Post(...args: any[]): void | ClassDecorator {
  return method('post', ...args)
}

export function Put(): ClassDecorator
export function Put(target: Function): void
export function Put(path: string): ClassDecorator
export function Put(...args: any[]): void | ClassDecorator {
  return method('put', ...args)
}

export function Patch(): ClassDecorator
export function Patch(target: Function): void
export function Patch(path: string): ClassDecorator
export function Patch(...args: any[]): void | ClassDecorator {
  return method('patch', ...args)
}

export function Delete(): ClassDecorator
export function Delete(target: Function): void
export function Delete(path: string): ClassDecorator
export function Delete(...args: any[]): void | ClassDecorator {
  return method('delete', ...args)
}

export function Head(): ClassDecorator
export function Head(target: Function): void
export function Head(path: string): ClassDecorator
export function Head(...args: any[]): void | ClassDecorator {
  return method('head', ...args)
}

export function Options(): ClassDecorator
export function Options(target: Function): void
export function Options(path: string): ClassDecorator
export function Options(...args: any[]): void | ClassDecorator {
  return method('options', ...args)
}

export function Connect(): ClassDecorator
export function Connect(target: Function): void
export function Connect(path: string): ClassDecorator
export function Connect(...args: any[]): void | ClassDecorator {
  return method('connect', ...args)
}

export function Trace(): ClassDecorator
export function Trace(target: Function): void
export function Trace(path: string): ClassDecorator
export function Trace(...args: any[]): void | ClassDecorator {
  return method('trace', ...args)
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
