export type ModelMetadata = {
  table: string,
  keys: Record<'PK' | 'SK', string>,
}

const modelRegistry = new Map<Function, ModelMetadata>()

export function registerModelMetadata(target: Function, metadata: { table: string }) {
  const data = modelRegistry.get(target)
  if (data)
    data.table = metadata.table
  else
    // @ts-ignore
    modelRegistry.set(target, { table: metadata.table, keys: {} })
}

export function registerKeyMetadata(target: Function, keyType: 'PK' | 'SK', name: string) {
  const data = modelRegistry.get(target)
  if (data)
    data.keys[keyType] = name
  else
    // @ts-ignore
    modelRegistry.set(target, { table: '', keys: { [keyType]: name } })
}

export function getModelMetadata(target: Function) {
  return modelRegistry.get(target)
}
