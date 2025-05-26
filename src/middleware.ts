import type { Context, MiddlewareHandler, Next } from 'hono'

export type MiddlewareType = MiddlewareHandler | Middleware | (new () => Middleware)
export default abstract class Middleware {
  static factory?: Function
  static opts?: object | any[]
  static path: string = '*'
  static async handle(c: Context, next: Next): Promise<void> {
    await next()
  }
}
