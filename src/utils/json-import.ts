import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export default function jsonImport<T = any>(filePath: string, defaultValue: T = {} as T): T {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)

  try {
    const fullPath = join(__dirname, filePath)
    const fileContent = readFileSync(fullPath, 'utf-8')
    return JSON.parse(fileContent) as T
  } catch (error) {
    return defaultValue
  }
}
