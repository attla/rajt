export const handlers: Record<string, Function> = {}

export function registerHandler(id: string, handler: any) {
  // if (id in handlers)
  //   console.warn(`Handler "${id}" has already been registered`)

  handlers[id] = handler
}

export function getHandler(id: string): Function {
  const handler = handlers[id] || null
  if (!handler) throw new Error(`Handler ${id} not registered`)
  return handler
}

export const _mw: Function[] = []
export const getMiddlewares = () => _mw
export function registerMiddleware(handler: any) {
  _mw.push(handler)
}
