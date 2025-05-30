import type { ContentfulStatusCode, StatusCode } from 'hono/utils/http-status'
import type { ErrorResponse, Errors } from './types'
import c from './context'

export default class Response {
  static raw(status?: StatusCode, body?: string) {
    return c.cx.newResponse(body ? body : null, { status })
  }

  static ok(): Response
  static ok<T>(data: T): Response
  static ok<T>(data?: T) {
    if (data === undefined)
      return this.raw(200)

    return c.cx.json(data, 200)
  }

  static created(): Response
  static created<T>(data: T): Response
  static created<T>(data?: T) {
    if (data === undefined)
      return this.raw(201)

    return c.cx.json(data, 201)
  }

  static accepted(): Response
  static accepted<T>(data: T): Response
  static accepted<T>(data?: T) {
    if (data === undefined)
      return this.raw(202)

    return c.cx.json(data, 202)
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
  static unauthorized<T>(data: T): Response
  static unauthorized<T>(data?: T) {
    if (data === undefined)
      return this.raw(401)

    return c.cx.json(data, 401)
  }

  static forbidden(): Response
  static forbidden<T>(data: T): Response
  static forbidden<T>(data?: T) {
    if (data === undefined)
      return this.raw(403)

    return c.cx.json(data, 403)
  }

  static notFound(): Response
  static notFound(msg: string): Response
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
    status ??= 500
    if (!errors && !msg)
      return this.raw(status, msg)

    const resp: ErrorResponse = {}
    if (msg) resp.m = msg
    if (errors) resp.e = errors

    return c.cx.json(resp, status)
  }
}
