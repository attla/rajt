import type { SchemaStructure } from './types'
import getLength from '../utils/lenght'

export default class Compact {
  static #typeMap: Record<string, string> = {
    // Null
    'null,': 'N,',
    ',null': ',N',
    'null]': 'N]',
    // True
    'true,': 'T,',
    ',true': ',T',
    'true]': 'T]',
    // False
    'false,': 'F,',
    ',false': ',F',
    'false]': 'F]',
    // Array
    '[],': 'A,',
    ',[]': ',A',
    '[]]': 'A]',
    // Object
    '{},': 'O,',
    ',{}': ',O',
    '{}]': 'O]'
  }

  static encode(obj: any, schema: SchemaStructure): string {
    const seen: any[] = []
    return this.replaceTypes(
      JSON.stringify(this.zip(obj, schema, seen)).replace(/(,|\[)"(\^\d+)"(\]|,|$)/g, '$1$2$3')
        .replace(/"/g, '~TDQ~')
        .replace(/'/g, '"')
        .replace(/~TDQ~/g, "'")
        .replace(/\\'/g, "^'"),
      this.#typeMap
    )
  }

  static smartDecode<T = any>(val: any, schema: SchemaStructure): T {
    if (!val) return val as T

    if (Array.isArray(val))
      return val.map((i: { v: string }) => this.decode<T>(i?.V, schema)).filter(Boolean) as T

    return val?.V ? this.decode<T>(val.V, schema) : val
  }

  static decode<T = any>(val: string, schema: SchemaStructure): T {
    if (!val) return val as T

    val = this.replaceTypes(val, this.reverseMap(this.#typeMap))
      .replace(/"/g, '~TSQ~')
      .replace(/'/g, '"')
      .replace(/~TSQ~/g, "'")
      .replace(/\^"/g, '\\"')
      .replace(/(,|\[)(\^\d+)(\]|,|$)/g, '$1"$2"$3')

    return this.withSchema(this.unzip(JSON.parse(val)), schema) as T
  }

  static zip(obj: any, schema: SchemaStructure, seen: any[]): any[] {
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

  static unzip(array: any[], seen: any[] = [], deep = false): any[] {
    return array.map(item => {
      const length = getLength(item)

      if ([null, true, false].includes(item) || typeof item !== 'object' && length < 2)
        return item

      if (Array.isArray(item))
        return this.unzip(item, seen, true)

      if (typeof item === 'string' && item.startsWith('^')) {
        const pos = parseInt(item.slice(1), 10)
        const val = seen[pos]
        return deep || (val && !`${val}`.startsWith('^')) ? val : item
      }

      seen.push(item)
      return item
    })
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

    if (typeof key === 'string')
      return [key, value]

    const mainKey = Object.keys(key)[0]
    const subKeys = key[mainKey]

    if (Array.isArray(value)) {
      if (value.length === 0)
        return [mainKey, []]

      return Array.isArray(value[0])
        ? [mainKey, value.map(v => this.withSchema(v, subKeys))]
        : [mainKey, this.withSchema(value, subKeys)]
    }

    return [mainKey, value]
  }

  static memo(val: any, seen: any[]): any {
    const length = getLength(val)
    // TODO: may be incompatible with empty objects or arrays
    if (typeof val !== 'object' && length < 2) return val

    const index = seen.indexOf(val)
    if (index !== -1)
      return `^${index}`

    seen.push(val)
    return val
  }

  static replaceTypes(str: string, map: Record<string, string>) {
    return Object.entries(map).reduce((s, [from, to]) => s.replaceAll(from, to), str)
  }

  static reverseMap(map: Record<string, string>): Record<string, string> {
    return Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]))
  }
}
