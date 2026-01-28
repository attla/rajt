import esbuild from 'esbuild'
import { basename, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync, existsSync, readdirSync, rmSync, copyFileSync } from 'node:fs'
import { readFile, stat, writeFile } from 'node:fs/promises'

const fail = (e) => {
  console.error('❌ Build failed' + (e ? ':' : ''), e || '')
  process.exit(1)
}

const args = process.argv.slice(2)
const platform = args[0] || ''

const platforms = ['aws', 'cf']
if (!platform || !platforms.includes(platform))
  fail()

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

const isCF = platform == 'cf'
const buildOptions = {
  entryPoints: [join(__dirname, `prod-${platform}.ts`)],
  bundle: true,
  minify: true,
  outfile: join(__dirname, '../../../dist/index.js'),
  platform: isCF ? 'browser' : 'node',
  target: isCF ? 'es2022' : 'node20',
  conditions: isCF ? ['worker', 'browser'] : [],
  format: 'esm',
  treeShaking: true,
  legalComments: 'none',
  external: [
    '@aws-sdk', '@smithy',
    ...(isCF ? [
      'cloudflare:workers',
      'node:crypto', 'crypto',
      'node:buffer', 'buffer',
    ] : []),
  ],
  metafile: true,
  write: false,
  plugins: [
    {
      name: 'preserve-class-names',
      setup(build) {
        build.onLoad(
          { filter: /(actions|features|routes)\/.*\.ts$/ },
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

const startTime = Date.now()
const cwd = join(__dirname, '../../..')

const distDir = join(cwd, 'dist')
existsSync(distDir)
  ? readdirSync(distDir).forEach(file => rmSync(join(distDir, file), { recursive: true, force: true }))
  : mkdirSync(distDir, { recursive: true })

for (const file of await readdirSync(distDir))
  await rmSync(join(distDir, file))

if (isCF) {
  for (let file of [
    'wrangler.toml',
  ]) {
    file = join(cwd, file)
    if (existsSync(file))
      copyFileSync(file, join(cwd, 'dist', basename(file)))
  }
}

esbuild.build(buildOptions)
  .then(async result => {
    const outputFile = buildOptions.outfile
    const stats = await stat(outputFile)
    const size = formatSize(stats.size)

    console.log(`\n⚡️ Done in ${formatTime(Date.now() - startTime)}`)
    console.log(`    ${relative(join(cwd, 'node_modules/rajt/src'), buildOptions.entryPoints[0])} → ${relative(cwd, outputFile)}`)
    console.log(`    Size: ${size}`)
    console.log(`    Files: ${Object.keys(result.metafile.outputs).length}`)
  }).catch(fail)
