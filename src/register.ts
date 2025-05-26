export const handlers = {}

export function registerHandler(id: string, handler: any) {
  if (typeof handler === 'function') {
    // @ts-ignore
    handlers[id] = handler
  } else if (handler.prototype?.handle) {
    const instance = new handler()
    // @ts-ignore
    handlers[id] = instance.handle.bind(instance)
  } else if (handler.run) {
    const instance = new handler()
    // @ts-ignore
    handlers[id] = instance.run.bind(instance)
  } else {
    console.warn(`Handler ${id} could not be registered - unsupported type`)
  }
}

export function getHandler(id: string): Function {
  // @ts-ignore
  const handler = handlers[id] || null
  if (!handler) throw new Error(`Handler ${id} not registered`)
  return handler
}

export const _mw: Function[] = []
export const getMiddlewares = () => _mw
export function registerMiddleware(handler: any) {
  _mw.push(handler)
}
