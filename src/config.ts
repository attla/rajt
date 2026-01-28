import { DataBag } from 't0n'

export default class Config {
  static #c: DataBag

  static {
    this.#c = new DataBag()
  }

  static all<T = any>(): Record<string, T> {
    return this.#c.all()
  }

  static has(key: string): boolean {
    return this.#c.has(key)
  }

  static add<T = any>(data: Record<string, T> = {}) {
    this.#c.add(data)
  }

  static replace<T = any>(data: Record<string, T> = {}) {
    this.#c.replace(data)
  }

  static get<T = any>(key: string, defaultValue?: T): T {
    return this.#c.get(key, defaultValue)
  }

  static set<T = any>(key: string, value: T) {
    this.#c.set(key, value)
  }

  static remove(key: string) {
    this.#c.remove(key)
  }

  static clear() {
    this.#c.clear()
  }

  static get length(): number {
    return this.#c.length
  }
  static get size(): number {
    return this.#c.length
  }

  static keys(): string[] {
    return this.#c.keys()
  }

  static values<T = any>(): T[] {
    return this.#c.values()
  }

  static entries<T = any>(): [string, T][] {
    return this.#c.entries()
  }

  static toArray<T = any>(): [string, T][] {
    return this.#c.entries()
  }

  static jsonSerialize<T = any>(): Record<string, T> {
    return this.#c.all()
  }

  static toJson(options: number = 0): string {
    return this.#c.toJson(options)
  }

  static [Symbol.iterator](): IterableIterator<[string, any]> {
    return this.#c[Symbol.iterator]()
  }
}
