import type { Handler, ValidationTargets } from 'hono'
import { ResponseHeader } from 'hono/utils/headers'
import { StatusCode } from 'hono/utils/http-status'
import { BaseMime } from 'hono/utils/mime'
import z from 'zod'
import Action from './action'
import request from './request'
import response from './response'
import validator from './validator'

export type { Context, Next } from 'hono'

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

export type ActionType = Function | Handler | Action | (new () => Action)

export type Handlers = (Function | Handler | (new () => Action))[]

export type Routes = Route[]

export type LambdaResponse = {
  statusCode: StatusCode,
  body: string,
}

export type Errors = Record<string, string | string[]>
export type ErrorResponse = {
  m?: string, // message
  e?: Errors, // error bag
}

export type ResponseHeadersInit = [
    string,
    string
][] | Record<"Content-Type", BaseMime> | Record<ResponseHeader, string> | Record<string, string> | Headers
export type ResponseInit<T extends StatusCode = StatusCode> = {
    headers?: ResponseHeadersInit,
    status?: T,
    statusText?: string,
}
export type ResponseOrInit<T extends StatusCode = StatusCode> = ResponseInit<T> | Response
// export type JSONValue =
//   | string
//   | number
//   | boolean
//   | null
//   | { [key: string]: JSONValue }
//   | JSONValue[]
