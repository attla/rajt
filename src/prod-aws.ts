import { handle } from 'hono/aws-lambda'
import { app } from './prod'

export const handler = handle(app)
