import { Ability } from './ability'

export class Authnz<T extends object> {
  #abilities: string[]
  #roles: string[]
  #data: T
  #token: any

  constructor(token: any, data: T, abilities: string[], roles: string[]) {
    this.#abilities = abilities
    this.#roles = roles
    this.#token = token
    this.#data = data
  }

  can(...abilities: string[]): boolean {
    if (this.#abilities.includes('*')) return true

    return abilities.flat().every(ability => {
      if (this.#roles.includes(ability)) return true
      return this.#abilities.some(rule => this.#match(rule, ability))
    })
  }
  cant(...abilities: string[]): boolean {
    return !this.can(...abilities)
  }

  hasRole(...roles: string[]): boolean {
    return roles.flat().every(role => this.#roles.includes(role))
  }

  has(prop: string, value: any = null): boolean {
    return this.#token?.hasValue(prop, value) || false
  }
  hasValue(prop: string, value: any = null): boolean {
    return this.has(prop, value)
  }

  static fromToken<T extends object>(token: any): Authnz<T> | null {
    if (!token || !token?.isValid()) return null
    const user = token.get()
    const roles = [...(user?.role ? [user.role] : []), ...(user?.roles ?? [])]

    const combined = [...(user?.perms ?? []), ...roles.flatMap(role => {
      const perms = Ability.roles[role]
      if (!perms) return []
      return perms === '*' ? ['*'] : perms
    })]

    const abilities = combined.includes('*') ? ['*'] : Array.from(new Set(combined))

    return new Authnz<T>(token, user, abilities, roles)
  }

  #match(rule: string, ability: string): boolean {
    if (rule === ability) return true
    if (
      this.#wildcardMatch(rule, ability, '_*')
      || this.#wildcardMatch(rule, ability, '-*')
      || this.#wildcardMatch(rule, ability, '.*')
    ) return true

    return false
  }

  #wildcardMatch(rule: string, ability: string, suffix: string) {
    return rule.endsWith(suffix)
      && (ability.startsWith(rule.slice(0, -2) + suffix[0]) || ability === rule.slice(0, -2))
  }

  get abilities() {
    return this.#abilities
  }

  get roles() {
    return this.#roles
  }

  get data() {
    return this.#data
  }
}
