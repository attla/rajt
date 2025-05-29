type EnumType<T> = T extends string[]
  ? { [K in T[number]]: K }
  : T extends Record<string, string | number>
  ? T
  : never

type EnumValue<T> = T extends string[]
  ? T[number]
  : T extends Record<string, infer V>
    ? V
    : never

type EnumStatic<T> = {
  has(search: string | number): boolean
  key(search: string | number): string | null
  value(search: string | number): EnumValue<T> | null
  readonly keys: string[]
  readonly values: Array<EnumValue<T>>
  toObject(): EnumType<T>
} & EnumType<T>

export default function Enum<T extends string[] | Record<string, string | number>>(definition: T): EnumStatic<T> {
  const enumObj = Array.isArray(definition)
    ? Object.fromEntries(definition.map(key => [key, key])) as EnumType<T>
    : definition as EnumType<T>

  const keyToValueMap = new Map<string | number, string | number>()
  const valueToKeyMap = new Map<string | number, string>()

  Object.entries(enumObj).forEach(([key, value]) => {
    keyToValueMap.set(key, value)
    valueToKeyMap.set(String(value), key)
    if (typeof value === 'number') valueToKeyMap.set(value.toString(), key)
  })

  const GeneratedEnum = class {
    static has(search: string | number): boolean {
      return keyToValueMap.has(search as string) || valueToKeyMap.has(String(search))
    }

    static key(search: string | number): string | null {
      if (keyToValueMap.has(search as string))
        return search as string

      return valueToKeyMap.get(String(search)) || null
    }

    static value(search: string | number): EnumValue<T> | null {
      if (keyToValueMap.has(search as string))
        return keyToValueMap.get(search as string) as EnumValue<T>

      return valueToKeyMap.has(String(search))
        ? keyToValueMap.get(valueToKeyMap.get(String(search))!) as EnumValue<T>
        : null
    }

    static get keys(): string[] {
      return Object.keys(enumObj)
    }

    static get values(): Array<EnumValue<T>> {
      return Object.values(enumObj) as Array<EnumValue<T>>
    }

    static toObject(): EnumType<T> {
      return { ...enumObj }
    }
  }

  Object.entries(enumObj).forEach(([key, value]) => {
    (GeneratedEnum as any)[key] = value
  })

  return GeneratedEnum as unknown as EnumStatic<T>
}
