import type { Condition, Operator } from './types'

export default class QueryBuilder {
  #conditions: Condition[] = []
  #limit?: number
  #startKey?: Record<string, any>
  #index?: string

  filter(field: string, operator: Operator, value: any = null) {
    this.#conditions.push({ type: 'filter', field, operator, value })
    return this
  }

  keyCondition(field: string, operator: Operator | any, value?: any) {
    const noVal = value === undefined
    this.#conditions.push({ type: 'keyCondition', field, operator: noVal ? '=' : operator, value: noVal ? operator : value })
    return this
  }

  limit(n: number) {
    this.#limit = n
    return this
  }

  exclusiveStartKey(key: Record<string, any>) {
    this.#startKey = key
    return this
  }

  index(name: string) {
    this.#index = name
    return this
  }

  buildExpression(type: 'filter' | 'keyCondition') {
    const exprParts: string[] = []
    const values: Record<string, any> = {}
    const names: Record<string, string> = {}

    let i = 0
    for (const cond of this.#conditions.filter(c => c.type === type)) {
      const attr = `#attr${i}`
      const val = `:val${i}`
      names[attr] = cond.field

      switch (cond.operator) {
        case 'between': {
          exprParts.push(`${attr} BETWEEN ${val}a AND ${val}b`)
          values[`${val}a`] = cond.value[0]
          values[`${val}b`] = cond.value[1]
          break
        }
        case 'begins_with': {
          exprParts.push(`begins_with(${attr}, ${val})`)
          values[val] = cond.value
          break
        }
        case 'in': {
          const inVals = cond.value.map((v: any, j: number) => {
            const vKey = `${val}_${j}`
            values[vKey] = v
            return vKey
          })
          exprParts.push(`${attr} IN (${inVals.join(', ')})`)
          break
        }
        case 'attribute_exists': {
          exprParts.push(`attribute_exists(${attr})`)
          break
        }
        case 'attribute_not_exists': {
          exprParts.push(`attribute_not_exists(${attr})`)
          break
        }
        case 'attribute_type': {
          exprParts.push(`attribute_type(${attr}, ${val})`)
          values[val] = cond.value
          break
        }
        case 'contains': {
          exprParts.push(`contains(${attr}, ${val})`)
          values[val] = cond.value
          break
        }
        case 'size': {
          exprParts.push(`size(${attr}) = ${val}`)
          values[val] = cond.value
          break
        }
        default: {
          exprParts.push(`${attr} ${cond.operator} ${val}`)
          values[val] = cond.value
        }
      }

      i++
    }

    return {
      expression: exprParts.length ? exprParts.join(' AND ') : undefined,
      names: Object.keys(names).length ? names : undefined,
      values: Object.keys(values).length ? values : undefined,
    }
  }

  get filters() {
    const filter = this.buildExpression('filter')
    const params: any = {}

    if (this.#limit)
      params.Limit = this.#limit

    if (this.#startKey)
      params.ExclusiveStartKey = this.#startKey

    if (filter.expression)
      params.FilterExpression = filter.expression

    if (filter.names)
      params.ExpressionAttributeNames = filter.names

    if (filter.values)
      params.ExpressionAttributeValues = filter.values

    return params
  }

  get conditions() {
    const keys = this.buildExpression('keyCondition')
    const filters = this.filters

    const params: any = { ...filters }

    if (this.#index)
      params.IndexName = this.#index

    if (keys.expression)
      params.KeyConditionExpression = keys.expression

    if (keys.names || filters?.ExpressionAttributeNames)
      params.ExpressionAttributeNames = { ...(keys?.names || {}), ...(filters?.ExpressionAttributeNames || {}) }

    if (keys.values || filters?.ExpressionAttributeValues)
      params.ExpressionAttributeValues = { ...(keys?.values || {}), ...(filters?.ExpressionAttributeValues || {}) }

    return params
  }
}
