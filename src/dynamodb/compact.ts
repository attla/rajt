import type { SchemaStructure } from './types'
import getLength from '../utils/lenght'

export default class Compact {
  static #typeRegex: RegExp
  static #reverseTypeRegex: RegExp
  static #reverseTypeMap: Record<string, string>
  static #typeMap: Record<string, string> = {
    // Boolean
    'true': 'T',
    'false': 'F',
    // Null
    'null': 'N',
    // Array
    '[]': 'A',
    '["0"]': 'A0',
    '["1"]': 'A1',
    '["false"]': 'A2',
    '["true"]': 'A3',
    // Object
    '{}': 'O',
    // String
    '""': 'S',
    '"0"': 'S0',
    '"1"': 'S1',
    '"false"': 'S2',
    '"true"': 'S3',
  }

  static {
    this.#reverseTypeMap = Object.fromEntries(Object.entries(this.#typeMap).map(([k, v]) => [v, k.replace(/"/g, "'")]))
    this.#typeRegex = this.#mapRegex(Object.keys(this.#typeMap))
    this.#reverseTypeRegex = this.#mapRegex(Object.keys(this.#reverseTypeMap))
  }

  static encode(obj: any, schema: SchemaStructure): string {
    const seen: any[] = []
    return this.#minify(
      JSON.stringify(this.zip(obj, schema, seen))
        .replace(/"\^(\d+)"/g, '^$1')
        .replace(/"/g, '~TDQ~')
        .replace(/'/g, '"')
        .replace(/~TDQ~/g, "'")
        .replace(/\\'/g, "^'")
    )
  }

  static smartDecode<T = any>(val: any, schema: SchemaStructure): T {
    if (!val) return val as T

    if (Array.isArray(val))
      return val.map((i: { v: string }) => this.decode<T>(i?.V, schema)).filter(Boolean) as T

    return val?.V ? this.decode<T>(val.V, schema) : val
  }

  static decode<T = any>(val: string, schema: SchemaStructure): T {
    if (!val || typeof val !== 'string') return val as T

    return this.withSchema(this.unzip(JSON.parse(
      this.#deminify(val)
        .replace(/"/g, '~TSQ~')
        .replace(/'/g, '"')
        .replace(/~TSQ~/g, "'")
        .replace(/\^"/g, '\\"')
        .replace(/(?<=[,{\[]|^)(\^\d+)(?=[,\]}[]|$)/g, '"$1"')
    )), schema) as T
  }

  static zip(obj: any, schema: SchemaStructure, seen: any[]): any[] {
    if (!obj || [null, true, false].includes(obj)) return obj

    return schema.map(key => {
      if (typeof key === 'string')
        return this.memo(obj[key], seen)

      const mainKey = Object.keys(key)[0]
      const subKeys = key[mainKey]
      const val = obj[mainKey]

      if (Array.isArray(val))
        return val.map(item => this.zip(item, subKeys, seen))

      return this.zip(val, subKeys, seen)
    })
  }

  static unzip(val: any, seen: any[] = [], deep = false): any[] {
    const type = typeof val
    const length = getLength(val, type)

    if ([null, true, false].includes(val) || type != 'object' && length < 2)
      return val

    if (Array.isArray(val))
      return val.map(item => this.unzip(item, seen, deep))

    if (type == 'object') {
      for (const key in val)
        val[key] = this.unzip(val[key], seen)

      return val
    }

    if (type == 'string' && val.startsWith('^')) {
      const item = seen[parseInt(val.slice(1), 10)]
      return item ? item : val
    }

    seen.push(val)
    return val
  }

  static withSchema(value: any[], keys: any[]): any {
    if (!value || !Array.isArray(value))
      return value

    return Object.fromEntries(
      keys.map((key, index) => this.entry(key, value[index])).filter(Boolean)
    )
  }

  static entry(key: any, value: any): any {
    if (!key) return undefined

    if (typeof key == 'string')
      return [key, value || null]

    const mainKey = Object.keys(key)[0]
    const subKeys = key[mainKey]

    if (Array.isArray(value)) {
      if (value.length < 1)
        return [mainKey, []]

      return Array.isArray(value[0])
        ? [mainKey, value.map(v => this.withSchema(v, subKeys))]
        : [mainKey, this.withSchema(value, subKeys)]
    }

    return [mainKey, value || null]
  }

  static memo(val: any, seen: any[]): any {
    if (Array.isArray(val))
      return val.map(item => this.memo(item, seen))

    const type = typeof val
    if (type == 'object' && val != null) {
      for (const key in val)
        val[key] = this.memo(val[key], seen)

      return val
    }

    const length = getLength(val, type)
    if ([null, true, false].includes(val) || type != 'object' && length < 2)
      return val

    const index = seen.indexOf(val)
    if (index !== -1)
      return `^${index}`

    seen.push(val)
    return val
  }

  static #mapRegex(keys: string[]) {
    keys = keys.sort((a, b) => b.length - a.length).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    return new RegExp(`(?<![^\\s,\\[\\{:])(${keys.join('|')})(?![^\\s,\\]\\}:])`, 'g')
  }

  static #minify(val: string): string {
    return val.replace(this.#typeRegex, match => this.#typeMap[match])
  }

  static #deminify(val: string): string {
    return val.replace(this.#reverseTypeRegex, match => this.#reverseTypeMap[match])
  }
}
