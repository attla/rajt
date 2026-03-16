#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ERR_NODE_VERSION = '18.0.0';
const MIN_NODE_VERSION = '18.0.0';

function runRajt() {
  if (process?.versions?.node && semiver(process.versions.node, ERR_NODE_VERSION) < 0) {
    console.error(
      `Rajt requires at least Node.js v${MIN_NODE_VERSION}. You are using v${process.versions.node}. Please update your version of Node.js.

Consider using a Node.js version manager such as https://volta.sh or https://github.com/nvm-sh/nvm.`
    );
    process.exitCode = 1;
    return;
  }

  const isBun = process?.isBun || typeof Bun !== 'undefined';
  const targetScript = resolve(__dirname, '../src/cli/index.ts');

  let executor = process.execPath;
  let args = [];

  if (isBun) {
    args = [targetScript, ...process.argv.slice(2)];
  } else {
    const tsxBin = findTsx();

    if (!tsxBin) {
      console.error('Error: "tsx" is not available. Please install tsx:');
      console.error('  npm i -D tsx');
      console.error('  or');
      console.error('  bun i -D tsx');
      process.exit(1);
    }

    args = [
      '--no-warnings',
      tsxBin,
      targetScript,
      ...process.argv.slice(2)
    ].filter(arg => !arg.includes('experimental-vm-modules') && !arg.includes('loader'));
  }

  return execute(executor, args)
}

function findTsx() {
  const exts = ['', '.exe', '.cmd'];
  const paths = [
    [_root, '../node_modules/tsx/dist/cli.mjs'],
    [process.cwd(), 'node_modules/tsx/dist/cli.mjs'],
    [_root, '../node_modules/.bin/tsx'],
    [process.cwd(), 'node_modules/.bin/tsx'],
  ];

  for (const _path of paths) {
    const path = join(..._path);
    for (const ext of exts) {
      const entry = path + ext;
      if (existsSync(entry)) return entry;
    }
  }

  return ''
}

function execute(command, args) {
  const child = spawn(command, args, {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'development',
      TSX_DISABLE_CACHE: '1',
    }
  });

  process.on('SIGINT', () => child.kill('SIGINT'))
    .on('SIGTERM', () => child.kill('SIGTERM'));

  return child
    .on('exit', code => process.exit(code ?? 0))
    .on('message', msg => process.send?.(msg))
    .on('disconnect', () => process.disconnect?.())
}

var fn = new Intl.Collator(0, { numeric: 1 }).compare;

function semiver(a, b, bool) {
  a = a.split('.');
  b = b.split('.');

  return (
    fn(a[0], b[0]) ||
    fn(a[1], b[1]) ||
    ((b[2] = b.slice(2).join('.')),
      (bool = /[.-]/.test((a[2] = a.slice(2).join('.')))),
      bool == /[.-]/.test(b[2]) ? fn(a[2], b[2]) : bool ? -1 : 1)
  );
}

function directly() {
  try {
    const arg = (process.argv[1] || '')?.replace(/\\/g, '/');
    return arg?.endsWith('.bin/rajt')
      || arg?.endsWith('rajt/bin/rajt.js')
  } catch {
    return false
  }
}

if (directly()) {
  runRajt()
}
