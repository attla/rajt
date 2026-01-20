import type { ModelMetadata, Keys, Model, Filter } from './types'
import { getModelMetadata } from './decorators'
import QueryBuilder from './query-builder'
import Compact from './compact'
import { RawClient } from './client'
import { isArraySchema } from './schema'
import { getLength } from 't0n'

export default class AbstractModel<T extends object> {
  #meta: ModelMetadata
  cls?: Model<T>
  lastKey?: Record<string, any>
  #queryBuilder?: QueryBuilder
  #model?: AbstractModel<T>

  constructor(
    cls: Model<T> | ModelMetadata,
    queryBuilder?: QueryBuilder,
    model?: AbstractModel<T>
  ) {
    this.#queryBuilder = queryBuilder
    this.#model = model

    if (typeof (cls as ModelMetadata).table == 'string') {
      this.#meta = cls as ModelMetadata
      this.cls = model?.cls
      return
    }

    const meta = getModelMetadata(cls)
    if (!meta)
      throw new Error('Missing model metadata')

    this.#meta = meta
    this.cls = cls as Model<T>
  }

  get table(): string {
    return this.#meta.table
  }

  get keySchema() {
    return this.#meta.keys
  }

  set lastEvaluatedKey(val: Record<string, any> | undefined) {
    if (this.#model) {
      this.#model.lastKey = val
    } else {
      this.lastKey = val
    }
  }
  get lastEvaluatedKey() {
    return this.lastKey
  }

  where(builderFn: (q: QueryBuilder) => void) {
    const qb = new QueryBuilder()
    builderFn(qb)
    return new AbstractModel<T>(this.#meta, qb, this)
  }

  async scan(filterFn?: Filter<T>) {
    const result = await RawClient.scan(this.table, this.#queryBuilder?.filters)

    this.lastEvaluatedKey = result.LastEvaluatedKey
    return this.#processItems(result.Items, filterFn)
  }

  async query(filterFn?: Filter<T>) {
    const result = await RawClient.query(this.table, this.#queryBuilder?.conditions)

    this.lastEvaluatedKey = result.LastEvaluatedKey
    return this.#processItems(result.Items, filterFn)
  }

  async get(key: Keys, sk?: string) {
    const result = await RawClient.get(this.table, this.#key(key, sk))
    return result.Item ? this.#processItem(result.Item) : undefined
  }

  async put(item: Partial<T>, key: Keys) {
    let keys
    if (this.#meta.zip) {
      keys = this.#getItemKey(item, key)
      this.#validateKeys(keys)
      // @ts-ignore
      item = { ...keys, V: Compact.encode(this.#getItemWithoutKeys(item), this.#meta.fields) }
    } else {
      this.#validateKeys(item)
    }

    await RawClient.put(this.table, item)
    return this.#processItem(item, keys)
  }

  async update(attrs: Partial<T>, key: Keys) {
    let keys
    if (this.#meta.zip) {
      keys = this.#getItemKey(attrs, key)
      this.#validateKeys(keys)
      // @ts-ignore
      attrs = { V: Compact.encode(this.#getItemWithoutKeys(attrs), this.#meta.fields) }
    } else {
      this.#validateKeys(attrs)
    }

    const UpdateExpressionParts: string[] = []
    const ExpressionAttributeValues: any = {}
    for (const [k, v] of Object.entries(attrs)) {
      UpdateExpressionParts.push(`#${k} = :${k}`)
      ExpressionAttributeValues[`:${k}`] = v
    }
    const UpdateExpression = 'SET ' + UpdateExpressionParts.join(', ')
    const ExpressionAttributeNames = Object.fromEntries(Object.keys(attrs).map(k => [`#${k}`, k]))

    await RawClient.update(this.table, {
      UpdateExpression,
      ExpressionAttributeValues,
      ExpressionAttributeNames,
    }, this.#key(key))

    return this.#processItem(attrs, keys)
  }

  async delete(key: Keys, sk?: string) {
    return RawClient.delete(this.table, this.#key(key, sk))
  }

  async batchGet(keys: Array<Keys>) {
    const result = await RawClient.batchGet({
      RequestItems: { [this.table]: { Keys: keys.map(key => this.#key(key)) } },
    })
    return (result.Responses?.[this.table] as T[] || []).map(item => this.#processItem(item))
  }

  async batchWrite(items: Array<{ put?: Partial<T>, delete?: Keys }>) {
    const WriteRequests = items.map(i => {
      if (i.put) {
        return { PutRequest: { Item: i.put } }
      } else if (i.delete) {
        return { DeleteRequest: { Key: this.#key(i.delete) } }
      }
      return null
    }).filter(Boolean) as any[]

    return RawClient.batchWrite({ RequestItems: { [this.table]: WriteRequests } })
  }

  async deleteMany(keys: Array<Keys>) {
    return this.batchWrite(keys.map(k => ({ delete: k })))
  }

  async putMany(items: Array<Partial<T>>) {
    return this.batchWrite(items.map(item => ({ put: item })))
  }

  #key(key: Keys, sk?: string) {
    if (!this.#meta.keys) return {}
    return RawClient.key(key, sk, this.#meta.keys, this.#meta.defaultSK)
  }

  #getItemKey(item: Partial<T>, key?: Keys): Record<string, string> {
    if (!this.#meta.keys) return {}

    const keys: Record<string, string> = {}
    if (key)
      this.#processExplicitKey(keys, key)
    else if (getLength(item) > 0)
      this.#processItemKeys(keys, item)

    return keys
  }

  #processExplicitKey(keys: Record<string, string>, key: Keys): void {
    if (!this.#meta.keys) return
    if (Array.isArray(key)) {
      keys[this.#meta.keys.PK] = key[0]

      if (this.#meta.keys?.SK) {
        if (key.length > 1)
          // @ts-ignore
          keys[this.#meta.keys.SK] = key[1]
        else if (this.#meta.defaultSK)
          keys[this.#meta.keys.SK] = this.#meta.defaultSK
      }
    } else {
      keys[this.#meta.keys.PK] = String(key)
    }
  }

  #processItemKeys(keys: Record<string, string>, item: Partial<T>): void {
    if (!this.#meta.keys) return

    const pkValue = item[this.#meta.keys.PK as keyof Partial<T>]
    if (pkValue !== undefined)
      keys[this.#meta.keys.PK] = String(pkValue)

    if (this.#meta.keys?.SK) {
      const skValue = item[this.#meta.keys.SK as keyof Partial<T>]
      if (skValue !== undefined)
        keys[this.#meta.keys.SK] = String(skValue)
      else if (this.#meta.defaultSK)
        keys[this.#meta.keys.SK] = this.#meta.defaultSK
    }
  }

  #validateKeys(keys: Record<string, any>) {
    if (!this.#meta.keys)
      throw new Error(`Missing keys of table "${this.table}"`)

    if (!(this.#meta.keys.PK in keys))
      throw new Error(`Missing partition key of table "${this.table}" `)

    if (this.#meta.keys?.SK && !(this.#meta.keys.SK in keys))
      throw new Error(`Missing sort key of table "${this.table}"`)
  }

  #getItemWithoutKeys(item: Partial<T>): Partial<T> {
    if (Array.isArray(item))
      return item?.length ? item.map(i => this.#getItemWithoutKeys(i)) as T : [] as T

    if (!this.#meta.keys || !item) return { ...item }

    const { PK, SK } = this.#meta.keys
    const { [PK as keyof T]: _, [SK as keyof T]: __, ...rest } = item

    return rest as Partial<T>
  }

  #processItems(items: any[] | undefined, filterFn?: Filter<T>): T[] {
    if (!items || !items.length) return []
    items = items.map(item => this.#processItem(item))
    return filterFn ? items.filter(filterFn) : items
  }

  #processItem(item: any, keys?: Record<string, string>): T {
    if (this.#meta.zip && item?.V) {
      const value = Compact.decode<T>(item.V, this.#meta.fields)
      const model = isArraySchema(this.#meta.fields) && Array.isArray(value)
        ? value.map(v => new this.cls!(v))
        : new this.cls!(value)

      if (!keys) keys = this.#getItemKey(item)

      return this.#withKey(model as T, keys)
    }

    return new this.cls!(item)
  }

  #withKey(model: T, keys: Record<string, string>): T {
    // @ts-ignore
    if (Array.isArray(model)) return model.map(m => this.#withKey(m, keys))
    // @ts-ignore
    return model.withKey(keys[this.#meta.keys.PK], keys[this.#meta.keys.SK] || undefined)
  }
}
