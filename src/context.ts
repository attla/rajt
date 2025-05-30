import { Context } from 'hono'
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

export default class CX {
  static #c: Context
  static #cookie: ReturnType<typeof cookieWrapper>

  static setContext(c: Context) {
    this.#c = c
    this.#cookie = cookieWrapper(c)
  }

  static get cx(): Context {
    return this.#c
  }

  static get cookie() {
    return this.#cookie
  }
}
