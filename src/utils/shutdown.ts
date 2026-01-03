export default function shutdown(cb: (signal: string, e: unknown) => void | Promise<void>) {
  if (!process) return
  const down = (signal: string) => (e?: unknown) => {
    try {
      cb(signal, e)
      setTimeout(() => process.exit(0), 100)
    } catch (e) {
      process.exit(1)
    }
  }

  process.on('SIGINT', down('SIGINT'))
  process.on('SIGTERM', down('SIGTERM'))
  process.on('SIGHUP', down('SIGHUP'))
  process.on('unhandledRejection', down('UNCAUGHT_REJECTION'))
  process.on('uncaughtException', down('UNCAUGHT_EXCEPTION'))
  // process.on('beforeExit', down('BEFORE_EXIT'))
  // process.on('exit', down('EXIT'))
}
