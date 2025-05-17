export default function getLength(item: any): number {
  const type = typeof item

  if (type === 'string')
    return item.length
  if (Array.isArray(item))
    return item.length
  if (type === 'object' && item !== null)
    return Object.keys(item).length
  if (type === 'number')
    return item.toString().length

  return 0
}
