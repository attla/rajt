import { Handler } from 'hono'
import { ResponseHeader } from 'hono/utils/headers'
import { StatusCode } from 'hono/utils/http-status'
import { BaseMime } from 'hono/utils/mime'
import Action from './action'

export type Route = {
  method: string,
  path: string,
  name: string,
  file: string,
  middlewares: Function[],
  handle: Handlers,
}

export type Handlers = (Function | Handler | (new () => Action))[]

export type Routes = Route[]

export type LambdaResponse = {
  statusCode: StatusCode,
  body: string,
}

export type Errors = Record<string, string | string[]>
export type ErrorResponse = {
  m?: string, // message
  // c?: number, // http code
  e?: Errors, // error bag
  // e?: Record<string, string | string[]>, // error bag
}

// export type Response<E> = E | ErrorResponse

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


export type { Context, Next } from 'hono'
