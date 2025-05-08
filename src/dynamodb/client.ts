import awsLite from '@aws-lite/client'
import dynamodbLite from '@aws-lite/dynamodb'
import AbstractModel from './model'

export const aws = await awsLite({
  plugins: [dynamodbLite]
})

export class Dynamodb {
  static model<T extends object>(cls: new (...args: any[]) => T) {
    return new AbstractModel<T>(cls, aws.DynamoDB)
  }
}
