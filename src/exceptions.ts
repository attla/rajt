export class Unauthorized extends Error {
  status = 401
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class BadRequest extends Error {
  status = 400
  constructor(message = 'Bad Request') {
    super(message)
    this.name = 'BadRequestError'
  }
}
