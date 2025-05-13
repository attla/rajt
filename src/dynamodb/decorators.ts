import plur from 'plur'

export type ModelMetadata = {
  table: string,
  keys?: Record<'PK' | 'SK', string>,
  zip: boolean,
}

export type ModelOpts = string | {
  table?: string,
  partitionKey?: string,
  sortKey?: string,
  zip?: boolean,
}

export function getModelMetadata(target: Function | any): ModelMetadata {
  const typeKeys = typeof target.m[1]
  return {
    table: target.m[0],
    // @ts-ignore
    keys: typeKeys !== 'undefined' ? (typeKeys === 'string' ? { PK: target.m[1] } : { PK: target.m[1][0], SK: target.m[1][1] }) : undefined,
    zip: target.m[2] || false,
    fields: target.m[3] || [],
  }
}

function _table(target: Function | any, opt?: ModelOpts) {
  if (!target?.m) target.m = []
  const table = opt ? (typeof opt === 'string' ? opt : opt?.table) : undefined

  target.m[0] = table || plur(target.name.toLocaleUpperCase())
}

function _zip(target: Function | any) {
  if (!target?.m) target.m = []
  target.m[2] = true
  target.m[3] = Object.keys(new target)
}

function _key(target: Function | any, pk: string, sk?: string) {
  if (!target?.m) target.m = []
  target.m[1] = pk && sk? [pk, sk] : [pk]
}

export function Entity(opt?: ModelOpts) {
  return (target: any) => _table(target, opt)
}

export function Model(opt?: ModelOpts) {
  return (target: any) => {
    _table(target, opt)
    const notStr = typeof opt !== 'string'

    if (!opt || notStr && opt?.zip)
      _zip(target)

    const pk = opt && notStr ? opt?.partitionKey : undefined
    const sk = opt && notStr ? opt?.sortKey : undefined
    _key(target, pk || 'PK', sk || 'SK')
  }
}

export function Zip() {
  return (target: any) => _zip(target)
}

export function Key(pk: string, sk?: string) {
  return (target: any) => {
    _key(target, pk, sk)
  }
}
export function Keys(pk: string, sk?: string) {
  return Key(pk, sk)
}

export function PartitionKey(attrName?: string) {
  return (target: any, prop: string) => {
    if (!target?.m) target.m = []
    if (['string', 'undefined'].includes(typeof target.m[1])) {
      target.m[1] = attrName || prop
    } else {
      target.m[1][0] = attrName || prop
    }
  }
}

export function SortKey(attrName?: string) {
  return (target: any, prop: string) => {
    if (!target?.m) target.m = []
    if (['string', 'undefined'].includes(typeof target.m[1])) {
      target.m[1] = []
      target.m[1][1] = attrName || prop
    } else {
      target.m[1][0] = attrName || prop
    }
  }
}
