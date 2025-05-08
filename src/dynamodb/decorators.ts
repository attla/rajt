import { registerModelMetadata, registerKeyMetadata } from './metadata-registry'

export function Model(opt: string | { table: string }) {
  return function (target: Function) {
    const table = typeof opt === 'string' ? opt : opt.table
    registerModelMetadata(target, { table })
  }
}

export function PartitionKey(attrName?: string) {
  return function (target: any, propertyKey: string) {
    registerKeyMetadata(target.constructor, 'PK', attrName || propertyKey)
  }
}

export function SortKey(attrName?: string) {
  return function (target: any, propertyKey: string) {
    registerKeyMetadata(target.constructor, 'SK', attrName || propertyKey)
  }
}
