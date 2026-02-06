import { HtmlEscapedCallbackPhase, resolveCallback } from 'hono/utils/html'
import type {
  ContentfulStatusCode, RedirectStatusCode, StatusCode,
  BaseMime, HeaderRecord,
  ErrorResponse, Errors,
} from './types'

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

  static text(str?: string, status?: StatusCode, headers?: HeaderRecord) {
    return this.raw(status, str, 'text/plain; charset=UTF-8' as BaseMime, headers)
  }

  static json<T>(data?: T, status?: StatusCode, headers?: HeaderRecord) {
    if (data == null)
      return this.raw(status, null, undefined, headers)

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
  static ok<T>(data: T, headers?: HeaderRecord): Response
  static ok<T>(data?: T, headers?: HeaderRecord) {
    return this.json(data, 200, headers)
  }

  static created(): Response
  static created<T>(data: T, headers?: HeaderRecord): Response
  static created<T>(data?: T, headers?: HeaderRecord) {
    return this.json(data, 201, headers)
  }

  static accepted(): Response
  static accepted<T>(data: T, headers?: HeaderRecord): Response
  static accepted<T>(data?: T, headers?: HeaderRecord) {
    return this.json(data, 202, headers)
  }

  static deleted(headers?: HeaderRecord) {
    return this.noContent(headers)
  }

  static noContent(headers?: HeaderRecord) {
    return this.json(null, 204, headers)
  }

  static badRequest(): Response
  static badRequest(errors?: Errors, msg?: string, headers?: HeaderRecord) {
    return this.error(errors, msg, 400, headers)
  }

  static unauthorized(): Response
  static unauthorized<T>(data: T, headers?: HeaderRecord): Response
  static unauthorized<T>(data?: T, headers?: HeaderRecord) {
    return this.json(data, 401, headers)
  }

  static forbidden(): Response
  static forbidden<T>(data: T, headers?: HeaderRecord): Response
  static forbidden<T>(data?: T, headers?: HeaderRecord) {
    return this.json(data, 403, headers)
  }

  static notFound(): Response
  static notFound<T>(msg: T, headers?: HeaderRecord): Response
  static notFound<T>(msg?: T, headers?: HeaderRecord) {
    return this.json(msg, 404, headers)
  }

  static conflict(): Response
  static conflict(errors?: Errors, msg?: string, headers?: HeaderRecord) {
    return this.error(errors, msg, 409, headers)
  }

  static unsupportedMediaType(): Response
  static unsupportedMediaType(errors?: Errors, msg?: string, headers?: HeaderRecord) {
    return this.error(errors, msg, 415, headers)
  }

  static internalError(): Response
  static internalError(errors?: Errors, msg?: string, headers?: HeaderRecord) {
    return this.error(errors, msg, 500, headers)
  }

  static error(errors?: Errors, msg?: string, status?: ContentfulStatusCode, headers?: HeaderRecord) {
    status ??= 500
    if (!errors && !msg)
      return this.raw(status, msg)

    const resp: ErrorResponse = {}
    if (msg) resp.m = msg
    if (errors) resp.e = errors

    return this.json(resp, status, headers)
  }
}
