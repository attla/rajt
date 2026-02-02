import type {
  Hono, Env, Handler,
  ErrorHandler, NotFoundHandler,
  ValidationTargets,
  // MiddlewareHandler,
} from 'hono'
import type { ResponseHeader } from 'hono/utils/headers'
// import type { StatusCode } from 'hono/utils/http-status'
import type { BaseMime } from 'hono/utils/mime'
import z from 'zod'
import Action from './action'
import request from './request'
import response from './response'
import validator from './validator'


// export type { H, Handler, HandlerResponse } from 'hono/types'
export type {
  Env, Context, Next,
  // ErrorHandler, NotFoundHandler,
  MiddlewareHandler, // TODO: remove..
  ValidationTargets,
} from 'hono'
export type { HTTPResponseError } from 'hono/types'

export type {
  ContentfulStatusCode,
  RedirectStatusCode,
  StatusCode,
} from 'hono/utils/http-status'
export type { BaseMime }

type PublicMethods<T> = {
  [K in keyof T]: K extends `#${string}` | `$${string}` | symbol | 'prototype' ? never : K
}[keyof T]

export type IRequest = Pick<request, PublicMethods<request>>
export type IResponse = Pick<typeof response, PublicMethods<typeof response>>

export type IValidator = Pick<typeof validator, PublicMethods<typeof validator>>
export type Rule = {
  schema: z.ZodObject<any>
  target: keyof ValidationTargets
  eTarget?: 'fieldErrors' | 'formErrors'
}
export type Rules = Rule[] | Rule | null

export type Route = {
  method: string,
  path: string,
  name: string,
  file: string,
  middlewares: Function[],
  handle: Handlers,
}

// export type ActionType = Function | Handler | Action | (new () => Action)

export type Handlers = (Function | Handler | (new () => Action))[]

export type Routes = Route[]

export type HeaderRecord =
  | Record<'Content-Type', BaseMime>
  | Record<ResponseHeader, string | string[]>
  | Record<string, string | string[]>


export type InitFunction<E extends Env = Env> = (app: Hono<E>) => void
export type ServerOptions<E extends Env = Env> = Partial<{
  routes: Routes,
  notFound: NotFoundHandler<E>,
  onError: ErrorHandler<E>,
  root: string,
  app?: Hono<E>,
  init?: InitFunction<E>,
}>

export interface MiddlewareFactory {

}
// export type MiddlewareType = MiddlewareHandler | Middleware | (new () => Middleware)

export type Errors = Record<string, string | string[]>
export type ErrorResponse = {
  m?: string, // message
  e?: Errors, // error bag
}

// TODO: not used..

// export type LambdaResponse = {
//   statusCode: StatusCode,
//   body: string,
// }

// export type ResponseHeadersInit = [
//     string,
//     string
// ][] | Record<"Content-Type", BaseMime> | Record<ResponseHeader, string> | Record<string, string> | Headers
// export type ResponseInit<T extends StatusCode = StatusCode> = {
//     headers?: ResponseHeadersInit,
//     status?: T,
//     statusText?: string,
// }
// export type ResponseOrInit<T extends StatusCode = StatusCode> = ResponseInit<T> | Response
// export type JSONValue =
//   | string
//   | number
//   | boolean
//   | null
//   | { [key: string]: JSONValue }
//   | JSONValue[]
