import type { Context, MiddlewareHandler, Next } from 'hono'

export type IMiddleware = {
  handle(c: Context, next: Next): Promise<void> | void
}

export default abstract class Middleware implements IMiddleware {
  public abstract handle(c: Context, next: Next): Promise<void> | void
}

// export type MiddlewareHandler = (c: Context, next: Next) => Promise<void> | void
export type MiddlewareType = MiddlewareHandler | Middleware | (new () => Middleware)
