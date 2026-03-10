import { getHandler } from '../register'

export function resolve(...objs: any[]) {
  const _ = []
  for (let obj of objs) {
    if (typeof obj == 'string')
      obj = getHandler(obj)

    if (typeof obj == 'function' && obj?.length == 2) {

    } else if (obj?.run) {
      _.push(...obj.run())
      continue
    } else if (obj?.handle) {
      obj = obj.handle
    } else if (obj?.factory) {
      obj = obj?.opts ? obj.factory(...Array.isArray(obj.opts) ? obj.opts : [obj.opts]) : obj.factory()
    } else {
      const instance = new obj()
      if (obj?.prototype?.run) {
        _.push(...instance.run())
        continue
      } else if (obj?.prototype?.handle) {
        obj = instance.handle
      }

      throw new Error(`Invalid action "${obj?.name || String(obj)}" - unsupported type`)
    }

   obj &&  _.push(obj)
  }

  return _
}

export function resolveMiddleware(obj: any) {
  if (typeof obj == 'function' && obj.length == 2)
    return obj

  if (obj?.factory)
    return obj?.opts ? obj.factory(...Array.isArray(obj.opts) ? obj.opts : [obj.opts]) : obj.factory()

  if (obj?.handle)
    return obj.handle

  if (obj.prototype?.handle)
    return (new obj()).handle

  throw new Error('Invalid middleware provided. Must be a Hono middleware function or MiddlewareClass instance/constructor')
}
