import { Ability } from './ability'

type Authenticatable = {
  role?: string,
  roles?: string[],
  perms?: string[],
}

export class Authnz<T extends object> {
  #abilities: string[]
  #roles: string[]
  #data: T

  constructor(data: T, abilities: string[], roles: string[]) {
    this.#abilities = abilities
    this.#roles = roles
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

  static fromToken<T extends object>(user: any): Authnz<T> | null {
    if (!user || user?.isInvalid()) return null
    user = user.get()
    const roles = [...(user?.role ? [user.role] : []), ...(user?.roles ?? [])]

    const combined = [...(user?.perms ?? []), ...roles.flatMap(role => {
      const perms = Ability.roles[role]
      if (!perms) return []
      return perms === '*' ? ['*'] : perms;
    })]

    const abilities = combined.includes('*') ? ['*'] : Array.from(new Set(combined))

    return new Authnz(user as T, abilities, roles)
  }

  #match(rule: string, ability: string): boolean {
    if (rule === ability) return true
    if (rule.endsWith('.*')) {
      const prefix = rule.slice(0, -2)
      return ability.startsWith(`${prefix}.`) || ability === prefix
    }
    return false
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
