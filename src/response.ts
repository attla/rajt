import { Context } from 'hono'
import type { ContentfulStatusCode, StatusCode } from 'hono/utils/http-status'
import { ErrorResponse, Errors } from './types'
import { getCookie, getSignedCookie, setCookie, setSignedCookie, deleteCookie } from 'hono/cookie'
import type { CookieOptions, CookiePrefixOptions } from 'hono/utils/cookie'

const cookieWrapper = (c: Context) => ({
  all: () => getCookie(c),
  allSigned: (secret: string) => getSignedCookie(c, secret),
  get: (name: string, prefixOptions?: CookiePrefixOptions) => prefixOptions ? getCookie(c, name, prefixOptions) : getCookie(c, name),
  getSigned: (secret: string, name: string, prefixOptions?: CookiePrefixOptions) => prefixOptions ? getSignedCookie(c, secret, name, prefixOptions) : getSignedCookie(c, secret, name),
  set: (name: string, value: string, opt?: CookieOptions) => setCookie(c, name, value, opt),
  setSigned: (name: string, value: string, secret: string, opt?: CookieOptions) => setSignedCookie(c, name, value, secret, opt),
  delete: (name: string, opt?: CookieOptions) => deleteCookie(c, name, opt)
})

export default class JsonResponse {
  static #c: Context
  static #cookie: ReturnType<typeof cookieWrapper>

  static setContext(c: Context) {
    this.#c = c
    this.#cookie = cookieWrapper(c)
    return this
  }

  static get cx(): Context {
    return this.#c
  }

  static get cookie() {
    return this.#cookie
  }

  static raw(status?: StatusCode, body?: string) {
    return this.cx.newResponse(body ? body : null, { status })
  }

  static ok(): Response
  static ok<T>(data: T): Response
  static ok<T>(data?: T) {
    if (data === undefined)
      return this.raw(200)

    return this.cx.json(data, 200)
  }

  static created(): Response
  static created<T>(data: T): Response
  static created<T>(data?: T) {
    if (data === undefined)
      return this.raw(201)

    return this.cx.json(data, 201)
  }

  static accepted(): Response
  static accepted<T>(data: T): Response
  static accepted<T>(data?: T) {
    if (data === undefined)
      return this.raw(202)

    return this.cx.json(data, 202)
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

    return this.cx.json(data, 401)
  }

  static forbidden(): Response
  static forbidden<T>(data: T): Response
  static forbidden<T>(data?: T) {
    if (data === undefined)
      return this.raw(403)

    return this.cx.json(data, 403)
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

    return this.cx.json(resp, status)
  }
}
