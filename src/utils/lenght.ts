export default function getLength(item: any, type?: string): number {
  if (!type) type = typeof item

  switch (type) {
    case 'string':
      return item.length

    case 'number':
    case 'bigint':
    // case 'function':
      return item.toString().length

    // case 'boolean':
    //   return item ? 1 : 0

    // case 'symbol':
    //   return item.toString().length - 8

    case 'object':
      if (item === null)
        return 0

      if (Array.isArray(item))
        return item.length

      return Object.keys(item).length

    case 'undefined':
    default:
      return 0
  }
}
