import { Envir } from 't0n'
import { Token as Factory } from 'cripta'
import { UAParser } from 'ua-parser-js'
import type { IRequest } from '@/types'

export class Token {
  static #cookieName: string = '__auth_'
  static #name: string = 'Authorization'
  static #prefix: string = 'bearer'

  static fromRequest(req: IRequest) {
    const token = this.fromCookie(req) || this.fromHeader(req)
    return token ? this.parse(req, token) : null
  }

  static fromHeader(req: IRequest): string | null {
    const header = req.header(this.#name) || req.header('HTTP_AUTHORIZATION') || req.header('REDIRECT_HTTP_AUTHORIZATION') || null

    if (header) {
      const pos = header.toLowerCase().indexOf(this.#prefix.toLowerCase())
      if (pos < 0) return header

      let token = header.slice(pos + this.#prefix.length).trim()
      const commaPos = token.indexOf(',')
      if (commaPos > -1) token = token.slice(0, commaPos).trim()

      return token
    }

    return null
  }

  static fromCookie(req: IRequest): string | null {
    const uid = req.header('uid')

    if (uid) {
      const auth = req.cookie.get(this.#cookieName + uid)
      return auth ? auth : null
    }

    return null
  }

  static parse(req: IRequest, token: string) {
    const host = this.host(req)
    const serveHost = Envir.get('FLOW_SERVER', host) as string

    return Factory.parse(token)
      .issuedBy(serveHost)
      .permittedFor(host)
      .withClaim('u', this.userAgent(req))
      .withClaim('i', this.ip(req))
  }

  static create(req: IRequest, user: any, exp: number = 7200) {
    const time = Math.floor(Date.now() / 1000)
    const host = this.host(req)

    return Factory.create()
      .issuedBy(host)
      .permittedFor(host)
      .issuedAt(time)
      .expiresAt(time + exp)
      .withClaim('u', this.userAgent(req))
      .withClaim('i', this.ip(req))
      .body(user)
  }

  static setPrefix(prefix: string): void {
    this.#prefix = prefix
  }

  static setName(name: string): void {
    this.#name = name
  }

  static host(req: IRequest): string {
    const url = req.url || req.header('host')
    if (!url) return ''

    let formattedUrl = String(url)
    if (!formattedUrl.startsWith('http'))
      formattedUrl = 'http://' + formattedUrl

    try {
      const parsedUrl = new URL(formattedUrl)
      return parsedUrl.host
    } catch {
      return ''
    }
  }

  static userAgent(req: IRequest) {
    const ua = req?.userAgent
    if (!ua) return 0
    const { browser, device, os } = UAParser(ua)
    return (browser?.name || '') + (browser?.major || '') + (device?.model || '') + (os?.name || '')
  }

  static ip(req: IRequest) {
     return req?.ip || 0
  }
}
