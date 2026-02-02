// ISC License

// Copyright (c) 2021 Alexey Raspopov, Kostiantyn Denysov, Anton Verinov

// Permission to use, copy, modify, and/or distribute this software for any
// purpose with or without fee is hereby granted, provided that the above
// copyright notice and this permission notice appear in all copies.

// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
// WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
// ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
// WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
// ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
// OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
//
// https://github.com/alexeyraspopov/picocolors/commit/6f0a4638348ed20633d623ee973f9c9a96f65104

import { getColorEnabledAsync } from 'hono/utils/color'

export const enabled = await getColorEnabledAsync()
export const isColorSupported = enabled

// const { env, stdout } = globalThis?.process ?? {}
// const enabled =
//   env &&
//   !env.NO_COLOR &&
//   (env.FORCE_COLOR || (stdout?.isTTY && !env.CI && env.TERM !== 'dumb'))

const replaceClose = (
  str: string,
  close: string,
  replace: string,
  index: number
): string => {
  const start = str.substring(0, index) + replace
  const end = str.substring(index + close.length)
  const nextIndex = end.indexOf(close)
  return ~nextIndex
    ? start + replaceClose(end, close, replace, nextIndex)
    : start + end
}

const formatter = (open: string, close: string, replace = open) => {
  if (!enabled) return String
  return (input: string) => {
    const string = '' + input
    const index = string.indexOf(close, open.length)
    return ~index
      ? open + replaceClose(string, close, replace, index) + close
      : open + string + close
  }
}

export const reset = enabled ? (s: string) => `\x1b[0m${s}\x1b[0m` : String
export const bold = formatter('\x1b[1m', '\x1b[22m', '\x1b[22m\x1b[1m')
export const dim = formatter('\x1b[2m', '\x1b[22m', '\x1b[22m\x1b[2m')
export const italic = formatter('\x1b[3m', '\x1b[23m')
export const underline = formatter('\x1b[4m', '\x1b[24m')
export const inverse = formatter('\x1b[7m', '\x1b[27m')
export const hidden = formatter('\x1b[8m', '\x1b[28m')
export const strikethrough = formatter('\x1b[9m', '\x1b[29m')

const endText = '\x1b[39m'
export const black = formatter('\x1b[30m', endText)
export const red = formatter('\x1b[31m', endText)
export const green = formatter('\x1b[32m', endText)
export const yellow = formatter('\x1b[33m', endText)
export const blue = formatter('\x1b[34m', endText)
export const magenta = formatter('\x1b[35m', endText)
export const purple = formatter('\x1b[38;2;173;127;168m', endText)
export const cyan = formatter('\x1b[36m', endText)
export const white = formatter('\x1b[37m', endText)
export const gray = formatter('\x1b[90m', endText)

const endBg = '\x1b[49m'
export const bgBlack = formatter('\x1b[40m', endBg)
export const bgRed = formatter('\x1b[41m', endBg)
export const bgGreen = formatter('\x1b[42m', endBg)
export const bgYellow = formatter('\x1b[43m', endBg)
export const bgBlue = formatter('\x1b[44m', endBg)
export const bgMagenta = formatter('\x1b[45m', endBg)
export const bgCyan = formatter('\x1b[46m', endBg)
export const bgWhite = formatter('\x1b[47m', endBg)

export const blackBright = formatter("\x1b[90m", endText)
export const redBright = formatter("\x1b[91m", endText)
export const greenBright = formatter("\x1b[92m", endText)
export const yellowBright = formatter("\x1b[93m", endText)
export const blueBright = formatter("\x1b[94m", endText)
export const magentaBright = formatter("\x1b[95m", endText)
export const cyanBright = formatter("\x1b[96m", endText)
export const whiteBright = formatter("\x1b[97m", endText)

export const bgBlackBright = formatter("\x1b[100m", endBg)
export const bgRedBright = formatter("\x1b[101m", endBg)
export const bgGreenBright = formatter("\x1b[102m", endBg)
export const bgYellowBright = formatter("\x1b[103m", endBg)
export const bgBlueBright = formatter("\x1b[104m", endBg)
export const bgMagentaBright = formatter("\x1b[105m", endBg)
export const bgCyanBright = formatter("\x1b[106m", endBg)
export const bgWhiteBright = formatter("\x1b[107m", endBg)
