import pluralize from 'pluralize'
import type { ModelMetadata, ModelOpts } from './types'

export function getModelMetadata(target: Function | any): ModelMetadata {
  if (!target?.m)
    throw Error(`Entity "${target?.name}" not registred, Use @Entity or @Model.`)

  const typeKeys = typeof target.m[1]
  return {
    table: target.m[0],
    // @ts-ignore
    keys: typeKeys !== 'undefined' ? (typeKeys === 'string' ? { PK: target.m[1] } : { PK: target.m[1][0], SK: target.m[1][1] }) : undefined,
    defaultSK: target?.defaultSK || undefined,
    zip: target.m[2] || false,
    fields: target.m[3] || [],
  }
}

function _table(target: Function | any, opt?: ModelOpts) {
  if (!target?.m) target.m = []
  const table = opt ? (typeof opt === 'string' ? opt : opt?.table) : undefined

  target.m[0] = table || pluralize(target.name.toLocaleUpperCase())
}

function _zip(target: Function | any) {
  if (!target?.m) target.m = []
  target.m[2] = true
  target.m[3] = target?.schema || Object.keys(new target)
}

function _key(target: Function | any, pk: string, sk?: string) {
  if (!target?.m) target.m = []
  target.m[1] = pk && sk ? [pk, sk] : [pk]
}

export function _model(target: any, opt?: ModelOpts) {
  _table(target, opt)
  const notStr = typeof opt !== 'string'

  if (!opt || !notStr || (typeof opt?.zip === undefined || opt?.zip))
    _zip(target)

  const pk = opt && notStr ? opt?.partitionKey : undefined
  const sk = opt && notStr ? opt?.sortKey : undefined
  _key(target, pk || 'PK', sk || 'SK')
}

function _pk(target: any, prop: string) {
  if (!target?.m) target.m = []
  if (['string', 'undefined'].includes(typeof target.m[1])) {
    target.m[1] = prop
  } else {
    target.m[1][0] = prop
  }
}

function _sk(target: any, prop: string) {
  if (!target?.m) target.m = []
  if (['string', 'undefined'].includes(typeof target.m[1])) {
    target.m[1] = []
    target.m[1][1] = prop
  } else {
    target.m[1][0] = prop
  }
}

export function Entity(target: Function): void
export function Entity(opt?: ModelOpts): ClassDecorator
export function Entity(...args: any[]): void | ClassDecorator {
  if (args.length === 1 && typeof args[0] === 'function')
    return _table(args[0])

  return (target: any) => _table(target, ...args)
}

export function Model(target: Function): void
export function Model(opt?: ModelOpts): ClassDecorator
export function Model(...args: any[]): void | ClassDecorator {
  if (args.length === 1 && typeof args[0] === 'function')
    return _model(args[0])

  return (target: any) => _model(target, ...args)
}

export function Zip(target: Function): void
export function Zip(): ClassDecorator
export function Zip(...args: any[]): void | ClassDecorator {
  if (args.length === 1 && typeof args[0] === 'function')
    return _zip(args[0])

  return (target: any) => _zip(target)
}

export function Key(pk: string, sk?: string) {
  return (target: any) => {
    _key(target, pk, sk)
  }
}
export const Keys = Key

export function PartitionKey(attrName: string): PropertyDecorator
export function PartitionKey(target: any, propertyKey: string): void
export function PartitionKey(target: any, propertyKey: string | undefined, parameterIndex: number): void
export function PartitionKey(...args: any[]): void | PropertyDecorator {
  if (!args.length) return

  if (typeof args[0] === 'function' && typeof args[1] === 'string' && args[1])
    return _pk(args[0], args[1])

  if (args.length === 1 && args[0])
    return (target: any) => _pk(target, args[0])
}

export function SortKey(attrName: string): PropertyDecorator
export function SortKey(target: any, propertyKey: string): void
export function SortKey(target: any, propertyKey: string | undefined, parameterIndex: number): void
export function SortKey(...args: any[]): void | PropertyDecorator {
  if (!args.length) return

  if (typeof args[0] === 'function' && typeof args[1] === 'string' && args[1])
    return _sk(args[0], args[1])

  if (args.length === 1 && args[0])
    return (target: any) => _sk(target, args[0])
}
