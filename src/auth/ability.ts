import { Routes } from '../types'
import { Roles, Abilities } from './types'

export class Ability {
  static #roles: Roles = {}
  static #abilities: Abilities = []

  static empty() {
    this.#roles = {}
    this.#abilities = []
  }

  static fromRoutes(actions: Routes) {
    if (!actions?.length) return

    const paths = actions?.map(a => Array.isArray(a) ? a[0]+a[1] : a.method+a.path) || []
    const items = new Set(paths)

    if (items.size !== actions.length)
      throw new Error(`Duplicate routes detected: "${paths.filter((path, index) => paths.indexOf(path) !== index).join('", "')}"`)

    this.#abilities = Array.from(items).map(a => this.format(a)).filter(Boolean)
  }

  static fromAction(target: any): string | null {
    return !target || !target?.p ? null : this.format(target.p)
  }

  static format(path: string) {
    return path.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/^\/*/, '')
      .replace(/[^a-zA-Z0-9/]|[\s_.]/g, '-')
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/\//g, '.')
      .replace(/-+/g, '-')
      .toLowerCase()
  }

  static get abilities() {
    return this.#abilities
  }

  static get roles() {
    return this.#roles
  }

  static set roles(roles: Roles) {
    this.#roles = roles
  }
}
