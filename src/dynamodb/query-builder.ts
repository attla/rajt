import type { Condition, Operator } from './types'

export default class QueryBuilder {
  #filters: Condition[] = []
  #keyConditions: Condition[] = []
  #limit?: number
  #startKey?: Record<string, any>
  #index?: string
  #attrCounter = 1
  #valCounter = 1
  #fieldAttrMap: Record<string, string> = {}
  #fieldValMap: Record<string, string> = {}

  filter(field: string, operator: Operator, value: any = null) {
    this.#filters.push({ type: 'filter', field, operator, value })
    return this
  }

  keyCondition(field: string, operator: Operator | any, value?: any) {
    const noVal = value === undefined
    this.#keyConditions.push({ type: 'keyCondition', field, operator: noVal ? '=' : operator, value: noVal ? operator : value })
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

  private attrName(field: string) {
    if (!this.#fieldAttrMap[field])
      this.#fieldAttrMap[field] = '#a'+ this.#attrCounter++

    return this.#fieldAttrMap[field]
  }

  private valName(val: any) {
    val = String(val)
    if (!this.#fieldValMap[val])
      this.#fieldValMap[val] = ':v'+ this.#valCounter++

    return this.#fieldValMap[val]
  }

  #resetCounters() {
    this.#attrCounter = 0
    this.#valCounter = 0
    this.#fieldAttrMap = {}
    this.#fieldValMap = {}
  }

  buildExpression(conditions: Condition[]) {
    const exprParts: string[] = []
    const values: Record<string, any> = {}
    const names: Record<string, string> = {}

    for (const cond of conditions) {
      const attr = this.attrName(cond.field)
      const val = Array.isArray(cond.value) ? '' : this.valName(cond.value)
      names[attr] = cond.field

      switch (cond.operator) {
        case 'between': {
          const val0 = this.valName(cond.value[0])
          const val1 = this.valName(cond.value[1])
          exprParts.push(`${attr} BETWEEN ${val0} AND ${val1}`)
          values[val0] = cond.value[0]
          values[val1] = cond.value[1]
          break
        }
        case 'begins_with': {
          exprParts.push(`begins_with(${attr}, ${val})`)
          values[val] = cond.value
          break
        }
        case 'in': {
          const inVals = cond.value.map((v: any) => {
            const key = this.valName(v)
            values[key] = v
            return key
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
    }

    return {
      expression: exprParts.length ? exprParts.join(' AND ') : undefined,
      names: Object.keys(names).length ? names : undefined,
      values: Object.keys(values).length ? values : undefined,
    }
  }

  get filters() {
    const filter = this.buildExpression(this.#filters)
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
    const keys = this.buildExpression(this.#keyConditions)
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
