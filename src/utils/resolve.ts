import Action, { ActionType } from '../action'
import { MiddlewareType } from '../middleware'

export function resolve(obj: ActionType) {
  if (typeof obj === 'function' && obj?.length === 2)
    return [obj]

  if (obj instanceof Action)
    return obj.run()

  const instance = new (obj as new () => Action)()
  if (Action.isPrototypeOf(obj))
    return instance.run()

  if (obj?.prototype?.handle)
    return [instance.handle]

  throw new Error('Invalid action')
}

export function resolveMiddleware(obj: MiddlewareType) {
  if (typeof obj === 'function' && obj.length === 2)
    return obj

  if (obj?.factory)
    return obj?.opts ? obj.factory(...Array.isArray(obj.opts) ? obj.opts : [obj.opts]) : obj.factory()

  if (obj?.handle)
    return obj.handle

  if (obj.prototype?.handle)
    return (new obj()).handle

  throw new Error('Invalid middleware provided. Must be a Hono middleware function or MiddlewareClass instance/constructor')
}
