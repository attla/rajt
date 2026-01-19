export const isAsyncFn = (fn: any) => {
  return fn?.constructor?.name == 'AsyncFunction'
    || fn.toString().toLowerCase().trim().startsWith('async')
}

export const isAnonFn = (fn: any) => {
    return fn?.name === '' || fn?.name == 'anonymous'
}
