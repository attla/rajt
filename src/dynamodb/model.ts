import type { AwsLiteDynamoDB } from '@aws-lite/dynamodb-types'
import { getModelMetadata } from './decorators'
import type { ModelMetadata } from './decorators'
import QueryBuilder from './query-builder'

export default class AbstractModel<T extends object> {
  private meta: ModelMetadata
  private lastKey?: Record<string, any>

  constructor(
    cls: (new (...args: any[]) => T) | ModelMetadata,
    private db: AwsLiteDynamoDB,
    private queryBuilder?: QueryBuilder,
    private model?: AbstractModel<T>
  ) {
    if (typeof (cls as ModelMetadata).table === 'string') {
      this.meta = cls as ModelMetadata
      return
    }

    // @ts-ignore
    const meta = getModelMetadata(cls)
    if (!meta)
      throw new Error('Missing model metadata')

    this.meta = meta
  }

  get table(): string {
    return this.meta.table
  }

  get keys() {
    return this.meta.keys
  }

  set lastEvaluatedKey(val: Record<string, any> | undefined) {
    if (this.model) {
      this.model.lastKey = val
    } else {
      this.lastKey = val
    }
  }
  get lastEvaluatedKey() {
    return this.lastKey
  }

  schema(pk: string, sk?: string) {
    if (!this.meta.keys) return {}

    const keys = { [this.meta.keys.PK]: pk }
    if (sk && this.meta.keys.SK)
      keys[this.meta.keys.SK] = sk

    return keys
  }

  where(builderFn: (q: QueryBuilder) => void) {
    const qb = new QueryBuilder()
    builderFn(qb)
    const model = new AbstractModel<T>(this.meta, this.db, qb, this)
    return model
  }

  async scan(filterFn?: (item: T) => boolean) {
    const result = await this.db.Scan({ TableName: this.table, ...this.queryBuilder?.filters })
    this.lastEvaluatedKey = result.LastEvaluatedKey
    const items = result.Items as T[]
    return filterFn ? items.filter(filterFn) : items
  }

  async query(filterFn?: (item: T) => boolean) {
    const result = await this.db.Query({ TableName: this.table, ...this.queryBuilder?.conditions })
    this.lastEvaluatedKey = result.LastEvaluatedKey
    const items = result.Items as T[]
    return filterFn ? items.filter(filterFn) : items
  }

  async get(pk: string, sk?: string) {
    const result = await this.db.GetItem({ TableName: this.table, Key: this.schema(pk, sk) })
    return result.Item as T
  }

  async put(item: Partial<T>) {
    await this.db.PutItem({ TableName: this.table, Item: item })
    return item
  }

  async update(key: string | [string, string], attrs: Partial<T>) {
    const UpdateExpressionParts: string[] = []
    const ExpressionAttributeValues: any = {}
    for (const [k, v] of Object.entries(attrs)) {
      UpdateExpressionParts.push(`#${k} = :${k}`)
      ExpressionAttributeValues[`:${k}`] = v
    }
    const UpdateExpression = 'SET ' + UpdateExpressionParts.join(', ')
    const ExpressionAttributeNames = Object.fromEntries(Object.keys(attrs).map(k => [`#${k}`, k]))

    return this.db.UpdateItem({
      TableName: this.table,
      Key: Array.isArray(key) ? this.schema(key[0], key[1]) : this.schema(key),
      UpdateExpression,
      ExpressionAttributeValues,
      ExpressionAttributeNames
    })
  }

  async delete(pk: string, sk?: string) {
    return this.db.DeleteItem({ TableName: this.table, Key: this.schema(pk, sk) })
  }

  async batchGet(keys: Array<{ pk: string, sk?: string }>) {
    const result = await this.db.BatchGetItem({ RequestItems: {
      [this.table]: { Keys: keys.map(({ pk, sk }) => this.schema(pk, sk)) }
    } })
    return result.Responses?.[this.table] as T[]
  }

  async batchWrite(items: Array<{ put?: Partial<T>, delete?: { pk: string, sk?: string } }>) {
    const WriteRequests = items.map(i => {
      if (i.put) {
        return { PutRequest: { Item: i.put } }
      } else if (i.delete) {
        return { DeleteRequest: { Key: this.schema(i.delete.pk, i.delete.sk) } }
      }
      return null
    }).filter(Boolean)

    return this.db.BatchWriteItem({ RequestItems: {[this.table]: WriteRequests} })
  }

  async deleteMany(keys: Array<{ pk: string, sk?: string }>) {
    return this.batchWrite(keys.map(k => ({ delete: k })))
  }

  async putMany(items: Array<Partial<T>>) {
    return this.batchWrite(items.map(i => ({ put: i })))
  }
}
