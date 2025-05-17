export type Operator = '=' | '<>' | '<' | '<=' | '>' | '>=' | 'begins_with' | 'between' | 'in' | 'attribute_exists' | 'attribute_not_exists' | 'attribute_type' | 'contains' | 'size'

export type Condition = {
  type: 'filter' | 'keyCondition',
  field: string,
  operator: Operator,
  value: any
}

// export type SchemaStructure = string | Record<string, SchemaStructure> | SchemaStructure[]
// export type SchemaStructure = string | { [key: string]: SchemaStructure[] }
export type ISchemaStructure = string | Record<string, ISchemaStructure[]>
export type SchemaStructure = ISchemaStructure[]

export type KeySchema = Record<'PK' | 'SK', string>
export type ModelMetadata = {
  table: string,
  keys?: KeySchema,
  defaultSK?: string,
  zip: boolean,
  fields: SchemaStructure,
}

export type ModelOpts = string | {
  table?: string,
  partitionKey?: string,
  sortKey?: string,
  defaultSK?: string,
  zip?: boolean,
}

export type Keys = string | [string] | [string, string]
export type Model<T extends object> = new (...args: any[]) => T
export type Filter<T> = (item: T) => boolean
