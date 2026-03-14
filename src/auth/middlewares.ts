import { Ability } from './ability'
import response from '../response'
import { GET_REQUEST } from '../request'
import type { Context, Next, IRequest } from '../types'

export async function Autorized(c: Context, next: Next) {
  const req = c.get(GET_REQUEST as unknown as string) as IRequest
  const ability = Ability.fromRequest(req)

  if (!req?.user || !ability || req.cant(ability))
    return response.unauthorized()

  await next()
}

// export function Unautorized() {

// }
