import type { IRequest, Routes } from '../types'
import { Roles, Abilities } from './types'
import { verbAlias } from '../http'

export class Ability {
  static #roles: Roles = {}
  static #abilities: Abilities = []
  static #actions: Record<string, string> = {}

  static empty() {
    this.#roles = {}
    this.#abilities = []
  }

  static fromRoutes(routes: Routes) {
    if (!routes?.length) return

    const actions: Record<string, string> = {}
    const abilities = new Set()
    for (const route of routes) {
      const isArr = Array.isArray(route)
      const name = isArr ? route[3] : route.name
      if (!name || abilities.has(name)) continue

      abilities.add(name)
      actions[(isArr ? route[1] : route.path) +'$'+ verbAlias[isArr ? route[0] : route.method]] = name
      const formatted = this.format(name)

      if (formatted)
        this.#abilities.push(formatted)
    }

    this.#actions = actions
  }

  static fromRequest(req: IRequest) {
    const ability = this.#actions[`${req.routePath}$` + verbAlias[req.method.toLowerCase()]]
    return ability ? this.format(ability) : ''
  }

  static fromAction(target: any): string {
    return !target ? '' : this.format(typeof target === 'string' ? target : (target.name.length > 3 ? target.name : (target?.p || '')))
  }

  static format(path: string) {
    return path === '/'
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
