import esbuild from 'esbuild'
import { dirname, join, relative } from 'path'
import { fileURLToPath } from 'url'
import { readFile, stat, writeFile } from 'fs/promises'

const __dirname = dirname(fileURLToPath(import.meta.url))

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes}b`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}kb`
  return `${(bytes / (1024 * 1024)).toFixed(2)}mb`
}
const formatTime = (ms) => {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

const buildOptions = {
  entryPoints: [join(__dirname, 'prod.ts')],
  bundle: true,
  minify: true,
  outfile: join(__dirname, '../../../dist/index.js'),
  platform: 'node',
  target: 'node20',
  format: 'esm',
  treeShaking: true,
  legalComments: 'none',
  external: ['@aws-sdk', '@smithy'],
  metafile: true,
  write: false,
  plugins: [
    {
      name: 'preserve-class-names',
      setup(build) {
        build.onLoad(
          { filter: /(actions|features)\/.*\.ts$/ },
          async (args) => {
            const contents = await readFile(args.path, 'utf8')
            const result = await esbuild.transform(contents, {
              loader: 'ts',
              minify: true,
              keepNames: true
            })
            return { contents: result.code, loader: 'ts' }
          }
        )
      },
    },
    {
      name: 'remove-use-strict',
      setup(build) {
        build.onEnd(async (result) => {
          if (!result.outputFiles) return

          const files = result.outputFiles.filter(file => file.path.endsWith('.js'))
          await Promise.all(files.map(async file => {
            if (!file.path.endsWith('.js')) return

            await writeFile(
              file.path,
              new TextDecoder()
                .decode(file.contents)
                .replace(/(["'`])\s*use strict\s*\1;?|`use strict`;?/g, '')
            )
          }))
        })
      }
    }
  ]
}

try {
  const startTime = Date.now()
  const result = await esbuild.build(buildOptions)

  const cwd = join(__dirname, '../../..')

  const outputFile = buildOptions.outfile
  const stats = await stat(outputFile)
  const size = formatSize(stats.size)

  console.log(`\n⚡️ Done in ${formatTime(Date.now() - startTime)}`)
  console.log(`    ${relative(join(cwd, 'node_modules/rajt/src'), buildOptions.entryPoints[0])} → ${relative(cwd, outputFile)}`)
  console.log(`    Size: ${size}`)
  console.log(`    Files: ${Object.keys(result.metafile.outputs).length}`)
} catch (error) {
  console.error('❌ Build failed:', error)
  process.exit(1)
}
