import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export default function jsonImport<T = any>(filePath: string, defaultValue: T = {} as T): T {
  const __dirname = dirname(new URL(import.meta.url).pathname)

  try {
    const fullPath = join(__dirname, filePath)
    const fileContent = readFileSync(fullPath, 'utf-8')
    return JSON.parse(fileContent) as T
  } catch (error) {
    return defaultValue
  }
}
