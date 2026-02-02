import net from 'node:net'
import { exec } from 'node:child_process'
import { error, warn } from './log'

export function withPort(desiredPort: number, cb: (port: number) => void, maxAttempts = 10) {
  getAvailablePort(desiredPort)
    .then(([port, pid]) => {
      if (port != desiredPort)
        warn(
          `Port ${desiredPort} is in use by ${pid ? 'process '+ pid : 'an unknown process'}, using available port ${port} instead`
        )

      cb(Number(port))
    }).catch(e => error('Error finding available port:', e))
}

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

export async function getAvailablePort(startPort: number, maxAttempts = 10) {
  let port = startPort
  let attempts = 0

  while (attempts < maxAttempts) {
    const inUse = await isPortInUse(port)

    if (!inUse && attempts) {
      const pid = await getProcessIdUsingPort(startPort)
      return [port, pid]
    }

    if (!inUse)
      return [port, null]

    port++
    attempts++
  }

  throw new Error(`No available ports found after ${maxAttempts} attempts`)
}

export async function getProcessIdUsingPort(port: number): Promise<string | null> {
  const timeoutMs = 250
  const processLookupController = new AbortController()

  const pidPromise = new Promise<string | null>((resolve) => {
    const handleError = (e: Error) => {
      error('Failed to get process ID for port', port, e)
      resolve(null)
    }

    try { // Use lsof on Unix-like systems (macOS, Linux)
      if (process.platform !== 'win32') {
        exec(
          `lsof -ti:${port} -sTCP:LISTEN`,
          { signal: processLookupController.signal },
          (error, stdout) => {
            if (error) {
              handleError(error)
              return
            }
            // `-sTCP` will ensure there's only one port, clean up output
            const pid = stdout.trim()
            resolve(pid || null)
          }
        )
      } else { // Use netstat on Windows
        exec(
          `netstat -ano | findstr /C:":${port} " | findstr LISTENING`,
          { signal: processLookupController.signal },
          (error, stdout) => {
            if (error) {
              handleError(error)
              return
            }
            // Clean up output and extract PID
            const cleanOutput = stdout.replace(/\s+/g, ' ').trim()
            if (cleanOutput) {
              const lines = cleanOutput.split('\n')
              const firstLine = lines[0].trim()
              if (firstLine) {
                const parts = firstLine.split(' ')
                const pid = parts[parts.length - 1]
                resolve(pid || null)
              } else {
                resolve(null)
              }
            } else {
              resolve(null)
            }
          }
        )
      }
    } catch (cause) {
      handleError(
        new Error('Unexpected error during process lookup', { cause })
      )
    }
  })

  const timeoutId = setTimeout(() => {
    processLookupController.abort(
      `PID detection timed out after ${timeoutMs}ms for port ${port}.`
    )
  }, timeoutMs)

  pidPromise.finally(() => clearTimeout(timeoutId))

  return pidPromise
}
