import { Authnz } from './authnz'
import { Token } from './token'

export class Auth {
  static #u: Authnz<any> | null = null

  static resolve() {
    this.#u = Authnz.fromToken(Token.fromRequest())
  }

  static get user() {
    return this.#u ? this.#u?.data : null
  }

  static can(...abilities: string[]): boolean {
    return this.#u ? this.#u.can(...abilities) : false
  }

  static cant(...abilities: string[]): boolean {
    return !this.can(...abilities)
  }

  static hasRole(...roles: string[]): boolean {
    return this.#u ? this.#u.hasRole(...roles) : false
  }

  static has(prop: string, value: any = null): boolean {
    return this.#u ? this.#u.has(prop, value) : false
  }
  static hasValue(prop: string, value: any = null): boolean {
    return this.has(prop, value)
  }
}
