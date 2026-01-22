import type { ContentfulStatusCode, RedirectStatusCode, StatusCode } from 'hono/utils/http-status'
import type { BaseMime } from 'hono/utils/mime'
import type { ResponseHeader } from 'hono/utils/headers'
import type { ErrorResponse, Errors } from './types'
import { HtmlEscapedCallbackPhase, resolveCallback } from 'hono/utils/html'

type HeaderRecord =
  | Record<'Content-Type', BaseMime>
  | Record<ResponseHeader, string | string[]>
  | Record<string, string | string[]>

type RBag = {
  status?: StatusCode,
  headers?: HeaderRecord,
}

export default class $Response {
  static raw(
    status?: StatusCode,
    body?: any,
    cType?: BaseMime,
    headers?: HeaderRecord
  ) {
    const b: RBag = { status: status || 200 }

    if (cType || headers) {
      headers ??= {}
      if (cType) headers['Content-Type'] = cType
      b.headers = headers
    }

    return new Response(body ?? null, b)
  }

  static text(data?: string, status?: StatusCode) {
    return this.raw(status, data, 'text/plain; charset=UTF-8' as BaseMime)
  }

  static json<T>(data?: T, status?: StatusCode, headers?: HeaderRecord) {
    if (data == null)
      return this.raw(status)

    return this.raw(status, JSON.stringify(data), 'application/json', headers)
  }

  static redirect(
    location: string | URL,
    status?: RedirectStatusCode,
    headers?: HeaderRecord
  ) {
    const loc = String(location)

    return new Response(null, {
      status: status || 302,
      headers: { ...headers, 'Location': /[^\x00-\xFF]/.test(loc) ? encodeURI(loc) : loc }
    })
  }

  static html(
    html: string | Promise<string>,
    status?: ContentfulStatusCode,
    headers?: HeaderRecord
  ): Response | Promise<Response> {
    const res = (html: string) => this.raw(status, html, 'text/html; charset=UTF-8' as BaseMime, headers)
    return typeof html == 'string'
      ? res(html)
      : resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res)
  }

  static ok(): Response
  static ok<T>(data: T): Response
  static ok<T>(data?: T) {
    return this.json(data, 200)
  }

  static created(): Response
  static created<T>(data: T): Response
  static created<T>(data?: T) {
    return this.json(data, 201)
  }

  static accepted(): Response
  static accepted<T>(data: T): Response
  static accepted<T>(data?: T) {
    return this.json(data, 202)
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
    return this.json(data, 401)
  }

  static forbidden(): Response
  static forbidden<T>(data: T): Response
  static forbidden<T>(data?: T) {
    return this.json(data, 403)
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

    return this.json(resp, status)
  }
}
