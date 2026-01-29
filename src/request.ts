import { getCookie, getSignedCookie, setCookie, setSignedCookie, deleteCookie } from 'hono/cookie'
import { HTTPException } from 'hono/http-exception'
import { Authnz, Token } from './auth'

import type { Context } from 'hono'
import type { CookieOptions, CookiePrefixOptions } from 'hono/utils/cookie'
import type { CustomHeader, RequestHeader } from 'hono/utils/headers'
import type { BodyData, ParseBodyOptions } from 'hono/utils/body'

const cookieWrapper = (c: Context) => ({
  all: () => getCookie(c),
  allSigned: (secret: string) => getSignedCookie(c, secret),
  get: (name: string, prefixOptions?: CookiePrefixOptions) => prefixOptions ? getCookie(c, name, prefixOptions) : getCookie(c, name),
  getSigned: (secret: string, name: string, prefixOptions?: CookiePrefixOptions) => prefixOptions ? getSignedCookie(c, secret, name, prefixOptions) : getSignedCookie(c, secret, name),
  set: (name: string, value: string, opt?: CookieOptions) => setCookie(c, name, value, opt),
  setSigned: (name: string, value: string, secret: string, opt?: CookieOptions) => setSignedCookie(c, name, value, secret, opt),
  delete: (name: string, opt?: CookieOptions) => deleteCookie(c, name, opt)
})

export const GET_REQUEST: unique symbol = Symbol()

export default class $Request {
  #c!: Context
  #cookie: ReturnType<typeof cookieWrapper>
  #u: Authnz<any> | null = null

  #host: string

  constructor(c: Context) {
    this.#c = c
    this.#cookie = cookieWrapper(c)
    this.#u = Authnz.fromToken(Token.fromRequest(this))

    const url = new URL(c.req.raw.url)
    this.#host = url.protocol +'://'+ url.host
  }

  get user() {
    return this.#u ? this.#u?.data : null
  }

  get auth() {
    return this.#u
  }

  can(...abilities: string[]) {
    return this.#u ? this.#u.can(...abilities) : false
  }

  cant(...abilities: string[]) {
    return !this.can(...abilities)
  }

  hasRole(...roles: string[]) {
    return this.#u ? this.#u.hasRole(...roles) : false
  }

  has(prop: string, value: any = null) {
    return this.#u ? this.#u.has(prop, value) : false
  }
  hasValue(prop: string, value: any = null) {
    return this.has(prop, value)
  }

  get cx() {
    return this.#c
  }

  get cookie() {
    return this.#cookie
  }

  get ip(): string | undefined {
    return this.#c.req.header('cf-connecting-ip')
      || this.#c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
      || this.#c.env?.aws?.lambda?.event?.requestContext?.identity?.sourceIp
      || this.#c.req.header('x-real-ip')
      || this.#c.env?.remoteAddr?.hostname
  }

  get userAgent(): string | undefined {
    return this.#c.req.header('user-agent')
  }

  get routePath() {
    return this.#c.req.routePath
  }

  get url() {
    return this.#c.req.raw.url
  }

  get host() {
    return this.#host
  }

  get path() {
    return this.#c.req.path
  }

  get method() {
    return this.#c.req.raw.method
  }

  get matchedRoutes() {
    return this.#c.req.matchedRoutes
  }

  get raw() {
    return this.#c.req.raw
  }

  header(name: RequestHeader): string | undefined
  header(name: string): string | undefined
  header(): Record<RequestHeader | (string & CustomHeader), string>
  header(name?: string) { // @ts-ignore
    return this.#c.req.header(name)
  }

  param(key?: string) { // @ts-ignore
    return this.#c.req.param(key)
  }

  query(): Record<string, string>
  query(key: string): string | undefined
  query(key?: string) { // @ts-ignore
    return this.#c.req.query(key)
  }

  queries(): Record<string, string[]>
  queries(key: string):string[] | undefined
  queries(key?: string) { // @ts-ignore
    return this.#c.req.queries(key)
  }

  async body<E>() {
    const cType = this.#c.req.header('Content-Type')
    if (!cType) return {} as E

    if (/^application\/([a-z-\.]+\+)?json(;\s*[a-zA-Z0-9\-]+\=([^;]+))*$/.test(cType))
      return await this.json<E>()

    if (
      cType?.startsWith('multipart/form-data')
      || cType?.startsWith('application/x-www-form-urlencoded')
    ) {
      return await this.parseBody() as E
    }

    return {} as E
  }

  async parseBody<Options extends Partial<ParseBodyOptions>, T extends BodyData<Options>>(
    options?: Options
  ): Promise<T>
  async parseBody<T extends BodyData>(options?: Partial<ParseBodyOptions>): Promise<T>
  async parseBody(options?: Partial<ParseBodyOptions>) {
    try {
      return await this.#c.req.parseBody(options)
    } catch (e) {
      throw new HTTPException(400, {
        message: 'Malformed FormData request.'+ (e instanceof Error ? ` ${e.message}` : ` ${String(e)}`)
      })
    }
  }

  async json<E>() {
    try {
      return await this.#c.req.json<E>()
    } catch {
      throw new HTTPException(400, { message: 'Malformed JSON in request body' })
    }
  }

  text() {
    return this.#c.req.text()
  }

  arrayBuffer() {
    return this.#c.req.arrayBuffer()
  }

  blob() {
    return this.#c.req.blob()
  }

  formData() {
    return this.#c.req.formData()
  }
}
