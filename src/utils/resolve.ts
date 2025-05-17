import Action, { ActionType } from '../action'

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
