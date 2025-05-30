import { Envir } from 't0n'
import { Token as Factory } from 'cripta'
import c from '../context'

export class Token {
  static #name: string = 'Authorization'
  static #prefix: string = 'bearer'

  static fromRequest() {
    const token = this.fromCookie() || this.fromHeader()
    return token ? this.parse(token) : null
  }

  static fromHeader(): string | null {
    const header = c.cx.req.header(this.#name) || c.cx.req.header('HTTP_AUTHORIZATION') || c.cx.req.header('REDIRECT_HTTP_AUTHORIZATION') || null

    if (header) {
      const position = header.toLowerCase().indexOf(this.#prefix.toLowerCase())
      if (position !== -1) {
        let token = header.slice(position + this.#prefix.length).trim()
        const commaPos = token.indexOf(',')
        if (commaPos !== -1) token = token.slice(0, commaPos).trim()

        return token
      }
    }

    return null
  }

  static fromCookie(): string | null {
    const uid = c.cx.req.header('uid')

    if (uid) {
      const auth = c.cookie.get('__auth_' + uid)
      return auth ? auth : null
    }

    return null
  }

  static parse(token: string) {
    const host = this.host(Envir.get('FLOW_SERVER') || c.cx.req.header('host') || '')

    return Factory.parse(token)
      .issuedBy(host)
      .permittedFor(host)
  }

  static create(user: any, exp: number = 7200) {
    const time = Math.floor(Date.now() / 1000)
    const host = this.host(c.cx.req.header('host') || '')

    return Factory.create()
      .issuedBy(host)
      .permittedFor(host)
      .issuedAt(time)
      .expiresAt(time + exp)
      .body(user)
  }

  static setPrefix(prefix: string): void {
    this.#prefix = prefix
  }

  static setName(name: string): void {
    this.#name = name
  }

  static host(url: string | null | undefined): string {
    if (!url) return ''

    let formattedUrl = String(url)
    if (!formattedUrl.startsWith('http'))
      formattedUrl = 'http://' + formattedUrl

    try {
      const parsedUrl = new URL(formattedUrl)
      return parsedUrl.host
    } catch (e) {
      return ''
    }
  }
}
