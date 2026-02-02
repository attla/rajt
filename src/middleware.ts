import type {
  Context, MiddlewareHandler, Next,
  IRequest,
} from './types'

export type MiddlewareType = MiddlewareHandler | Middleware | (new () => Middleware)

export class Middleware {
  static factory?: Function
  static opts?: object | any[]
  static path: string = '*'
  static async handle(c: Context, next: Next): Promise<void> {
    await next()
  }
}

export const toHonoMiddleware = (mw: MiddlewareHandler) => async (req: IRequest, next: Next) => await mw(req.cx, next)
