import Action, { ActionType } from '../action'
// import BaseMiddleware, { MiddlewareType } from '../middleware'

export default function resolve(obj: ActionType) {
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

// export function resolveMiddleware(obj: MiddlewareType) {
//   if (typeof obj === 'function' && obj.length === 2)
//     return obj

//   if (obj instanceof BaseMiddleware)
//     return obj.handle

//   if (BaseMiddleware.isPrototypeOf(obj)) {
//     const instance = new (obj as new () => BaseMiddleware)()
//     return instance.handle
//   }

//   throw new Error('Invalid middleware provided. Must be a Hono middleware function or MiddlewareClass instance/constructor')
// }

// // import Action, { ActionType } from '../action'

// export default function resolve(obj: any) {
//   if (typeof obj === 'function' && obj?.length === 2)
//     return [obj]

//   // if (obj instanceof Action)
//   //   return obj.run()

//   // const instance = new (obj as new () => Action)()
//   // @ts-ignore
//   const instance = new obj()
//   // if (Action.isPrototypeOf(obj))
//   if (obj?.prototype?.run)
//     return instance.run()

//   if (obj?.prototype?.handle)
//     return [instance.handle]

//   throw new Error('Invalid action')
// }
