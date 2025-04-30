import net from 'node:net'

export async function isPortInUse(port: number) {
  return new Promise(resolve => {
    const server = net.createServer()
      .once('error', () => resolve(true))
      .once('listening', () => {
        server.close(() => resolve(false))
      })
      .listen(port)
  })
}

export async function getAvailablePort(startPort: number, maxAttempts = 100) {
  let port = startPort
  let attempts = 0

  while (attempts < maxAttempts) {
    const inUse = await isPortInUse(port)

    if (!inUse) {
      return port
    }

    port++
    attempts++
  }

  throw new Error(`No available ports found after ${maxAttempts} attempts`)
}
