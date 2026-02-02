export function resolve(obj: any, id: string) {
  if (typeof obj == 'function' && obj?.length == 2)
    return [obj]

  if (obj?.run)
    return obj.run()

  if (obj?.handle)
    return obj.handle()

  const instance = new obj()
  if (obj?.prototype?.run)
    return instance.run()

  if (obj?.prototype?.handle)
    return [instance.handle]

  throw new Error(`Invalid action "${id}" - unsupported type`)
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
