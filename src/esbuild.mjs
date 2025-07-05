import esbuild from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
  entryPoints: [path.join(__dirname, 'prod.ts')],
  bundle: true,
  minify: true,
  outfile: path.join(__dirname, '../../../dist/index.js'),
  platform: 'node',
  target: 'node20',
  format: 'esm',
  treeShaking: true,
  legalComments: 'none',
  external: ['@aws-sdk', '@smithy'],
  metafile: true,
  plugins: [{
    name: 'preserve-class-names',
    setup(build) {
      build.onLoad(
        { filter: /(actions|features)\/.*\.ts$/ },
        async (args) => {
          const contents = await fs.readFile(args.path, 'utf8')
          const result = await esbuild.transform(contents, {
            loader: 'ts',
            minify: true,
            keepNames: true
          })
          return { contents: result.code, loader: 'ts' }
        }
      )
    },
  }]
}

try {
  const startTime = Date.now()
  const result = await esbuild.build(buildOptions)

  const cwd = path.join(__dirname, '../../..')

  const outputFile = buildOptions.outfile
  const stats = await fs.stat(outputFile)
  const size = formatSize(stats.size)

  console.log(`\n⚡️ Done in ${formatTime(Date.now() - startTime)}`)
  console.log(`    ${path.relative(path.join(cwd, 'node_modules/rajt/src'), buildOptions.entryPoints[0])} → ${path.relative(cwd, outputFile)}`)
  console.log(`    Size: ${size}`)
  console.log(`    Files: ${Object.keys(result.metafile.outputs).length}`)
} catch (error) {
  console.error('❌ Build failed:', error)
  process.exit(1)
}
