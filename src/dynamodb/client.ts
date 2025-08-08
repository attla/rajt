import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,

  BatchGetCommand,
  BatchWriteCommand,

  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,

  ScanCommandInput,
  QueryCommandInput,
  UpdateCommandInput,

  BatchGetCommandInput,
  BatchWriteCommandInput,
} from '@aws-sdk/lib-dynamodb'
import type { NativeAttributeValue } from '@aws-sdk/util-dynamodb'
import AbstractModel from './model'
import { Keys } from './types'

const client = new DynamoDBClient(process.env?.AWS_SAM_LOCAL ? {
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.AWS_ENDPOINT_URL || undefined,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "DUMMYIDEXAMPLE",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "DUMMYEXAMPLEKEY",
  },
} : {})

export const DocumentClient = DynamoDBDocumentClient.from(client)

export class Dynamodb {
  static model<T extends object>(cls: new (...args: any[]) => T) {
    return new AbstractModel<T>(cls)
  }

  static raw() {
    return RawClient
  }
}

export class RawClient {
  static async get(TableName: string, key: Keys | Record<string, string>, sk?: string) {
    return DocumentClient.send(new GetCommand({
      TableName,
      Key: this.#key(key, sk),
    }))
  }

  static async scan(TableName: string, filters: Omit<ScanCommandInput, 'TableName'>) {
    return DocumentClient.send(new ScanCommand({ ...filters, TableName }))
  }

  static async query(TableName: string, filters: Omit<QueryCommandInput, 'TableName'>) {
    return DocumentClient.send(new QueryCommand({ ...filters, TableName }))
  }

  static async put(TableName: string, Item: Record<string, NativeAttributeValue>) {
    return DocumentClient.send(new PutCommand({ TableName, Item }))
  }

  static async update(
    TableName: string,
    filters: Omit<UpdateCommandInput, 'TableName' | 'Key'>,
    key: Keys | Record<string, string>,
    sk?: string
  ) {
    return DocumentClient.send(new UpdateCommand({
      ...filters, TableName, Key: this.#key(key, sk),
    }))
  }

  static async delete(TableName: string, key: Keys | Record<string, string>, sk?: string) {
    return DocumentClient.send(new DeleteCommand({ TableName, Key: this.#key(key, sk) }))
  }

  static async batchGet(batch: BatchGetCommandInput) {
    return DocumentClient.send(new BatchGetCommand(batch))
  }

  static async batchWrite(batch: BatchWriteCommandInput) {
    return DocumentClient.send(new BatchWriteCommand(batch))
  }

  static #key(key: Keys | Record<string, string>, sk?: string) {
    if (typeof key == 'object' && key != null) return key

    let pk: string
    let skValue: string | undefined

    if (Array.isArray(key)) {
      pk = key[0]
      skValue = key[1] ?? sk
    } else {
      pk = key
      skValue = sk
    }

    const keys = {PK: pk}
    // @ts-ignore
    if (skValue) keys.SK = skValue

    return keys
  }
}
