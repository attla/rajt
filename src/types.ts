import type {
  Hono, Env, Handler,
  ErrorHandler, NotFoundHandler,
  ValidationTargets,
  // MiddlewareHandler,
} from 'hono'
import type { ResponseHeader } from 'hono/utils/headers'
// import type { StatusCode } from 'hono/utils/http-status'
import { mimes, type BaseMime } from 'hono/utils/mime'
import type { OpenAPIV3_1, OpenAPIV3 } from 'openapi-types'
import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { DescribeRouteOptions as RawDescribeRouteOptions, ResolverReturnType } from 'hono-openapi'
import z from 'zod'
import Action from './action'
import request from './request'
import response from './response'
import validator from './validator'

// export type { H, Handler, HandlerResponse } from 'hono/types'
export type {
  Hono,
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
export type { BaseMime, StandardSchemaV1 }

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

export type StandardSchema = StandardSchemaV1 | OpenAPIV3_1.ReferenceObject
export type DescribeRouteOptions = Omit<RawDescribeRouteOptions, 'responses'> & {
  responses?: {
    [key: string | number]: (Omit<OpenAPIV3.ResponseObject, 'description' | 'headers' | 'content' | 'links'> & {
      description?: string,
      headers?: { // TODO maybe dont accept ResolverReturnType
        [header: string]: OpenAPIV3_1.ReferenceObject | OpenAPIV3_1.HeaderObject
      },
      content?: {
        [key: BaseMime | keyof typeof mimes]: Omit<OpenAPIV3_1.MediaTypeObject, 'schema'> & {
          schema?: StandardSchema | OpenAPIV3_1.SchemaObject | ResolverReturnType,
        },
      },
      links?: { // TODO maybe dont accept ResolverReturnType
        [link: string]: OpenAPIV3_1.ReferenceObject | OpenAPIV3_1.LinkObject
      },
    }) | StandardSchema,
  },
}

export type Route = {
  method: string,
  path: string,
  name: string,
  file: string,
  middlewares: Function[],
  handle: Handlers,
  desc: DescribeRouteOptions,
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
