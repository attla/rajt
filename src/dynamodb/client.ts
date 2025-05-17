import awsLite from '@aws-lite/client'
import dynamodbLite from '@aws-lite/dynamodb'
import AbstractModel from './model'

export const aws = await awsLite({
  plugins: [dynamodbLite],
  // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/#configuration
  // @ts-ignore
  awsjsonMarshall: {convertClassInstanceToMap: true},
  // @ts-ignore
  awsjsonUnmarshall: {convertClassInstanceToMap: true}
})

export class Dynamodb {
  static model<T extends object>(cls: new (...args: any[]) => T) {
    return new AbstractModel<T>(cls, aws.DynamoDB)
  }
}
