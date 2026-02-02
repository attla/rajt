import response from './response'
import validator from './validator'
import { GET_REQUEST } from './request'
import type {
  Context,
  IRequest, IResponse, IValidator, Rules
} from './types'

export default class Action {
  static run() {
    const rules = this.rules(validator)
    const h = async (c: Context) => await this.handle(c.get(GET_REQUEST as unknown as string), response)
    if (!rules) return [h]

    const pipe = validator.parse(rules)
    pipe.push(h)
    return pipe
  }

  static rules(v: IValidator): Rules {
    return null
  }

  static async handle(req: IRequest, res: IResponse): Promise<Response> {
    return Promise.resolve(res.raw(200, 'Action handle not implemented'))
  }
}
