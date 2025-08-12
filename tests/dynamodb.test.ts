import { array, boolean, number, object, string } from 'zod'
import { extractZodKeys, isArraySchema, arraySchema } from '@/dynamodb/schema'
import Compact from '@/dynamodb/compact'

describe('DynamoDB', () => {
  // zod schema
  const subSchema = object({ id: string(), name: string(), desc: string() })
  const objSchema = subSchema.merge(object({
    array: array(subSchema),
    emptyArray: array(string()),
    a0: array(string()),
    a1: array(string()),
    a2: array(string()),
    a3: array(string()),
    obj: object({}),
    emptyStr: string(),
    s0: string(),
    s1: string(),
    s2: string(),
    s3: string(),
    number: number(),
    true: boolean(),
    false: boolean(),
    null: string().nullable(),
  }))

  const arrayObjSchema = array(objSchema)

  // compiled schema
  const _subSchema = ['id', 'name', 'desc']
  const _objSchema = [
    ..._subSchema, { array: _subSchema },
    'emptyArray', 'a0', 'a1', 'a2', 'a3',
    'obj',
    'emptyStr', 's0', 's1', 's2', 's3',
    'number', 'true', 'false', 'null',
  ]
  // removing reference from _objSchema not impact other tests
  const _arrayObjSchema = arraySchema(JSON.parse(JSON.stringify(_objSchema)))

  // examples
  const subExample = {id: '123', name: 'HUB', desc: 'full-cycle web platform'}
  const objExample = {
    ...subExample,
    array: [subExample, subExample],
    emptyArray: [],
    a0: ['0'],
    a1: ['1'],
    a2: ['false'],
    a3: ['true'],
    obj: {},
    emptyStr: '',
    s0: '0',
    s1: '1',
    s2: 'false',
    s3: 'true',
    number: 321,
    true: true,
    false: false,
    null: null,
  }
  const arrayObjExample = [objExample, objExample]

  const objPacked = `['123','HUB','full-cycle web platform',[[^0,^1,^2],[^0,^1,^2]],A,A0,A1,A2,A3,O,S,S0,S1,S2,S3,321,T,F,N]`
  const arrayObjPacked = `[['123','HUB','full-cycle web platform',[[^0,^1,^2],[^0,^1,^2]],A,A0,A1,A2,A3,O,S,S0,S1,S2,S3,321,T,F,N],[^0,^1,^2,[[^0,^1,^2],[^0,^1,^2]],A,A0,A1,A2,A3,O,S,S0,S1,S2,S3,^3,T,F,N]]`

  describe('Schema', () => {
    // it('Array', () => {
    //   // TODO
    // })

    it('Object', () => {
      expect(extractZodKeys(objSchema)).toEqual(_objSchema)
    })

    it('Array<Object>', () => {
      const schema = extractZodKeys(arrayObjSchema)

      // using json for ignore symbols
      expect(JSON.stringify(schema)).toEqual(JSON.stringify(_objSchema))
      expect(isArraySchema(schema)).toBe(true)
    })
  })

  describe('Compact', () => {
    it('Object', () => {
      const packed = Compact.encode(objExample, _objSchema)
      const unpacked = Compact.decode(packed, _objSchema)

      expect(packed).toBe(objPacked)
      expect(unpacked).toEqual(objExample)
    })

    it('Array<Object>', () => {
      const packed = Compact.encode(arrayObjExample, _objSchema)
      const unpacked = Compact.decode(packed, _arrayObjSchema)

      expect(packed).toBe(arrayObjPacked)
      expect(unpacked).toEqual(arrayObjExample)
    })
  })

})
