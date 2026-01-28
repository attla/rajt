export default async function importUncached(path: string) {
  return import(path +'?v='+ Date.now())
}
