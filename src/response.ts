import { Context } from 'hono'
import { ContentfulStatusCode, StatusCode } from 'hono/utils/http-status'
import { ErrorResponse, Errors, LambdaResponse, ResponseOrInit } from './types'
import { InvalidJSONValue, JSONValue } from 'hono/utils/types'

class NullContext {
  resp = new Response('Context not found. Use JsonResponse.setContext() first.', { status: 500 })

  newResponse(body?: any, init?: ResponseOrInit<StatusCode>): Response {
    return this.resp
  }
  json(json: JSONValue | {} | InvalidJSONValue, status: ContentfulStatusCode = 500): Response {
    return this.resp
  }
  // overide do hono context
  // newResponse(body?: any, init?: ResponseOrInit<StatusCode>): Response {
  //   return new Response(body ?? null, typeof init === 'number' ? {status: init} : init ?? {status: 500})
  // }
  // json(json: JSONValue | {} | InvalidJSONValue, status: ContentfulStatusCode = 500): Response {
  //   return new Response(JSON.stringify(json), {
  //     status,
  //     headers: { 'Content-Type': 'application/json' }
  //   })
  // }
}

export default class JsonResponse {
  static #c?: Context

  static setContext(c: Context) {
    this.#c = c
    return this
  }

  static get #cx(): Context | NullContext {
    return this.#c ?? new NullContext()
  }

  static raw(status?: StatusCode, body?: string) {
    return this.#cx.newResponse(body ? body : null, { status })
  }

  static ok(): Response
  static ok<T>(data?: T) {
    if (data === undefined)
      return this.raw(200)

    return this.#cx.json(data, 200)
  }

  static created(): Response
  static created<T>(data?: T) {
    if (data === undefined)
      return this.raw(201)

    return this.#cx.json(data, 201)
  }

  static accepted(): Response
  static accepted<T>(data?: T) {
    if (data === undefined)
      return this.raw(202)

    return this.#cx.json(data, 202)
  }

  static deleted() {
    return this.noContent()
  }

  static noContent() {
    return this.raw(204)
  }

  static badRequest(): Response
  static badRequest(errors?: Errors, msg?: string) {
    return this.error(errors, msg, 400)
  }

  static unauthorized(): Response
  static unauthorized<T>(data?: T) {
    if (data === undefined)
      return this.raw(401)

    return this.#cx.json(data, 401)
  }

  static forbidden(): Response
  static forbidden<T>(data?: T) {
    if (data === undefined)
      return this.raw(403)

    return this.#cx.json(data, 403)
  }

  static notFound(): Response
  static notFound(msg?: string) {
    return this.raw(404, msg)
  }

  static conflict(): Response
  static conflict(errors?: Errors, msg?: string) {
    return this.error(errors, msg, 409)
  }

  static unsupportedMediaType(): Response
  static unsupportedMediaType(errors?: Errors, msg?: string) {
    return this.error(errors, msg, 415)
  }

  static internalError(): Response
  static internalError(errors?: Errors, msg?: string) {
    return this.error(errors, msg, 500)
  }

  static error(errors?: Errors, msg?: string, status?: ContentfulStatusCode) {
    const context = this.#cx
    status ??= 500

    if (!errors && !msg)
      return this.raw(status, msg)

    const resp: ErrorResponse = {}
    if (msg) resp.m = msg
    if (errors) resp.e = errors

    return context.json(resp, status)
  }
}
