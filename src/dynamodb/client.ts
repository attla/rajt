import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import AbstractModel from './model'

const client = new DynamoDBClient(process.env?.AWS_SAM_LOCAL ? {
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.AWS_ENDPOINT_URL || undefined,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "DUMMYIDEXAMPLE",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "DUMMYEXAMPLEKEY",
  },
} : {})

export const ddb = DynamoDBDocumentClient.from(client)

export class Dynamodb {
  static model<T extends object>(cls: new (...args: any[]) => T) {
    return new AbstractModel<T>(cls, ddb)
  }
}
