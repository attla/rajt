This framework is fully geared towards the serverless world, specifically AWS Lambda / Cloudflare Workers.

> It works with bun and LLRT runtimes ;)

- [Installation](#install)
- [Endpoints](#actionsfeatures)
- [Validations](#validations)
- [Enums](#enums)
- [Middlewares](#middlewares)
- [DynamoDB](#dynamodb)
  - [Model](#model)
  - [Basic Usage](#basic-usage)
    - [Get](#get)
    - [Put](#put)
    - [Update](#update)
    - [Delete](#delete)
  - [Advanced Queries](#advanced-queries)
    - [Scan](#scan)
    - [Filters](#filter)
    - [Queries](#queries)
    - [Post query filters](#post-query-filters)
    - [Pagination](#post-query-filters)

## Install

```bash
# bun
bun create rajt@latest

# pnpm
pnpm create rajt@latest

# npm
npm create rajt@latest

# yarn
yarn create rajt

# deno
deno run -A npm:create-rajt@latest
```

## Actions/Features
The organization of the application's endpoints is done through a folder structure.

All endpoints must be encapsulated in files inside the `./actions/` folder; `./features/` is also accepted.

#### File/folder names must use urlBase64Safe:
* Allowed characters: `a-z`, `A-Z`, `0-9`, `-`, `_`;
* Valid examples: `create-user.ts`, `getPosts_v2.ts`;

#### The folder structure defines the route hierarchy:

```bash
.
└── actions/
    ├── users/
    │   ├── members/
    │   │   └── create.ts   → /users/members/create
    │   └── index.ts        → /users
    ├── posts.ts            → /posts
    └── index.ts            → /
```

#### Index Files:

`index.ts` files represent the base route directory

They can contain settings that affect all child routes

Example: `./actions/users/index.ts` configures the `/users` route

#### Configuration Scope:

Settings in specific files affect only that route

Settings in `index.ts` files affect all child routes

#### HTTP Verbs:

Files must explicitly export the HTTP verb (`GET`, `POST`, `PUT`, `PATCH` or `DELETE`)

Files without a declared HTTP verb are ignored in route matching

#### Examples:

```ts
// file: ./actions/index.ts
import { JsonResponse } from 'rajt'
import { Get } from 'rajt/http'
import type { Context } from 'rajt/types'

@Get('/')
export default class Index {
  async handle(c: Context) {
    return JsonResponse.ok({ message: 'Hello world! ;)' })
  }
}
```

## Validations
Request validations are defined per endpoint, more precisely with the `rules()` method

These examples show how you can implement these validations:

Validations are performed using `zod`

Valid validation targets:
 * `param` - Endpoint parameters;
 * `query` - URL query parameters;
 * `form` - Request body in form-data;
 * `json` - Request body in JSON;
 * `header` - Request header;
 * `cookie` - Request cookies;

```ts
// file: ./actions/users/new
import { Action } from 'rajt'
import { Post } from 'rajt/http'
import type { Context } from 'rajt/types'
import { z } from 'zod'

@Post('/users/new')
export default class UsersNew extends Action {
  rules() {
    return this.rule('json', z.object({
      name: z.string(),
      age: z.number(),
    }))
  }

  async handle(c: Context) {
    const user = await this.body<{name: string, age: number}>()
    console.log(user)
    return this.response.ok({ message: 'User created', data: user })
  }
}
```

Using multiple validations:

```ts
// file: ./actions/users/list
import { Action } from 'rajt'
import { Get } from 'rajt/http'
import type { Context } from 'rajt/types'
import { z } from 'zod'

@Get('/users/:org')
export default class UsersNew extends Action {
  rules() {
    return [
      this.rule('query').schema(
        z.object({
          page: z.string().regex(/^\d+$/).transform(Number),
        })
      ),
      this.rule('param', z.object({
        org: z.string().regex(/^\d+$/).transform(Number),
      }))
    ]
  }

  async handle(c: Context) {
    const query = await this.query<>()
    console.log(query)
    const org = await this.param('org')
    console.log(org)
    return this.response.ok({ message: 'Listing users...' })
  }
}
```

## Enums

This module provides a flexible implementation of enums in TypeScript/JavaScript that supports:

 - Simple string enums (array)
 - Numeric enums (key-value object)
 - Aliased enums (custom values)
 - Utility methods for validation/retrieve a value or key

##### Enum import

```ts
import { Enum } from 'rajt'
```

##### Simple String Enum (Array<`string`>)

```ts
const Colors = Enum(['RED', 'GREEN', 'BLUE'] as const)

// Direct access
console.log(Colors.RED) // 'RED'

// Validation
console.log(Colors.has('RED')) // true
console.log(Colors.has('YELLOW')) // false

// Retrieve key/value
console.log(Colors.key('RED')) // 'RED'
console.log(Colors.value('RED')) // 'RED'

// Listing keys/values
console.log(Colors.keys) // ['RED', 'GREEN', 'BLUE']
console.log(Colors.values) // ['RED', 'GREEN', 'BLUE']
```

#### Numeric Enum (Record<`string`, `number`>)

```ts
const Status = Enum({
  ACTIVE: 1,
  INACTIVE: 0,
  PENDING: 2
} as const)

// Direct access
console.log(Status.ACTIVE) // 1

// Validation (works with string or number)
console.log(Status.has('ACTIVE')) // true
console.log(Status.has(1)) // true
console.log(Status.has('1')) // true

// Retrieve key/value
console.log(Status.key(1)) // 'ACTIVE'
console.log(Status.value('ACTIVE')) // 1

// Listing keys/values
console.log(Status.keys) // ['ACTIVE', 'INACTIVE', 'PENDING']
console.log(Status.values) // [1, 0, 2]
```

## Middlewares

For use middleware on ur action add the decorator `@Middleware` or alias `@Middlewares`

```ts
import { Middleware } from 'rajt/http'

@Middleware(async (c, next) => {
  console.log('Middleware 1 of ListUsers')
  await next()
})
export default class ListUsers extends Action {}
```

Creating a middleware class:

```ts
import { Middleware as BaseMiddleware } from 'rajt'
import { Middleware } from 'rajt/http'

class AuthMiddleware extends BaseMiddleware {
  async handle(c, next) {
    console.log('Auth middleware')
    await next()
  }
}

// option 1
@Middleware(AuthMiddleware)
// option 2
@Middleware(new AuthMiddleware)
export default class ListUsers extends Action {}
```

Using multiple middlewares:

```ts
import { Middleware as BaseMiddleware } from 'rajt'
import { Middleware } from 'rajt/http'

class AuthMiddleware extends BaseMiddleware {
  async handle(c, next) {
    console.log('Auth middleware')
    await next()
  }
}

// option 1
@Middleware(
  AuthMiddleware,
  new AuthMiddleware,
  async (c, next) => {
    console.log('Middleware 2 of ListUsers')
    await next()
  }
)
// using decorator alias @Middlewares
@Middlewares(AuthMiddleware, new AuthMiddleware)
export default class ListUsers extends Action {}
```

## DynamoDB

#### Model:

The `@Model` decorator transforms a class into a DynamoDB entity, mapping it to a specific table. Use `@PartitionKey` and `@SortKey` to define your primary key structure.

Model Example with Common Patterns

```ts
import { Model, PartitionKey, SortKey } from 'rajt/dynamodb'

@Model('USER_TABLE') // Represents the DynamoDB table name
class User {
  @PartitionKey('uuid') // Custom mapping: stores as 'uuid' in DynamoDB
  id: string;

  @SortKey // Uses the property name 'sk' as stored
  sk: string;

  // Common pattern for time-based sorting
  createdAt: Date;

  constructor(id: string, sk: string) {
    this.id = id
    this.sk = sk
    this.createdAt = new Date()
  }
}
```

#### Basic Usage:

##### Get

Retrieves a single item by its primary key

```ts
import { Dynamodb } from 'rajt/dynamodb'
import User from './models/user'

const model = Dynamodb.model(User)

const item = await model.get(
  'USER#123',
  'PROFILE' // Optional
)
```

##### Put

Creates or replaces an entire item

```ts
await model.put({
  id: 'USER#456',
  sk: 'PROFILE',
  name: 'John Doe',
  email: 'john@example.com'
})
```

##### Update

Partially updates an existing item

```ts
await model.update(
  'Partition_Key_123',
  'USER#123',
  // key pair
  // ['USER#123', 'PROFILE'],
  {
    email: 'new.email@example.com',
    lastLogin: new Date().toISOString()
  }
)
```

##### Delete

Removes an item from the table

```ts
await model.delete(
  'USER#789',
  'PROFILE' // Optional
)
```

#### Advanced Queries:

##### Scan

Scan with filters

```ts
await model.scan() // scan all table

// Aplyng filters
await model.where(q => {
  q.filter('status', '=', 'ACTIVE')
   .filter('createdAt', '>', '2023-01-01')
}).scan()
```

##### Filters

All DynamoDB operators are avaliabe with `where()`

##### Queries

Basic query with Key conditions

```ts
await model.where(q => {
  q.keyCondition('id', 'USER#123')
   .keyCondition('sk', 'begins_with', 'ORDER#')
   .limit(10)
}).query()
```

##### Post query filters

Filter results after retrieval (client-side)

```ts
await model.scan(item => item.sk.startWith('Books#'))

await model.where(q => {
  q.keyCondition('id', 'begins_with', 'USER#')
   .filter('createdAt', '>', '2023-01-01')
   .limit(10)
}).query(user => user.sk.includes('ADMIN'))
```

##### Pagination

```ts
const model = Dynamodb.model(User)

let lastEvaluatedKey

do {
  const users = await model.where(q => {
    q.keyCondition('id', 'begins_with', 'USER#')
     .limit(100)

     if (lastEvaluatedKey)
      q.exclusiveStartKey(lastEvaluatedKey)
  }).query()

  console.log(users)

  lastEvaluatedKey = model.lastEvaluatedKey
  // Process batch of 100 items
} while (lastEvaluatedKey)
```
