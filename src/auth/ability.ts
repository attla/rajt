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

    const paths = actions?.map(a => Array.isArray(a) ? a[0] + a[1] : a.method + a.path) || []
    const items = new Set(paths)

    if (items.size !== actions.length)
      throw new Error(`Duplicate routes detected: "${paths.filter((path, index) => paths.indexOf(path) !== index).join('", "')}"`)

    this.#abilities = Array.from(new Set(actions?.map(a => Array.isArray(a) ? a[3] : a.name) || []))
      .map(a => this.format(a))
      .filter(Boolean)
  }

  static fromAction(target: any): string {
    return !target ? '' : this.format(target.name.length > 3 ? target.name : (target?.p || ''))
  }

  static format(path: string) {
    return path == '/'
      ? 'index'
      : path.normalize('NFD')
         .replace(/[\u0300-\u036f]/g, '')
         .replace(/^\/*/, '')
         .replace(/([a-z])([A-Z])/g, '$1-$2')
         .replace(/[^a-zA-Z0-9/]|[\s\-.]/g, '_')
         .replace(/_+/g, '_')
         .replace(/\//g, '.')
         .replace(/\._/g, '.')
         .replace(/^[._-]+/, '')
         .replace(/[._-]+$/, '')
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
