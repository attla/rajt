This framework is fully geared towards the serverless world, specifically AWS Lambda (Node.js, bun and LLRT runtime) / Cloudflare Workers.

- [Installation](#install)
- [Endpoints](#actionsfeatures)
- [Validations](#validations)
- [Enums](#enums)
  - [Basic use](#enum-import)
  - [String Enums](#simple-string-enum-arraystring)
  - [Numeric Enums](#numeric-enum-recordstring-number)
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
    - [Pagination](#pagination)
  - [Schema](#schema)
  - [Repository](#repository)
- [Commands](#commands)
- [Environments](#environments)s
- [Deploy](#deploy)
  - [AWS Lambda Deployment](#aws-lambda-deployment)
  - [Cloudflare Workers Deployment](#cloudflare-workers-deployment)

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

#### File/folder names must use urlBase64Safe ([RFC4648](https://datatracker.ietf.org/doc/html/rfc4648#section-5)):
* Allowed characters: `a-z`, `A-Z`, `0-9`, `-`, `_`;
* Recommended examples inside `./actions` folder:

```bash
.
└── actions/
    ├── orgs/
    │   ├── list.ts            → [GET]    /orgs
    │   ├── create.ts          → [POST]   /orgs
    │   ├── get.ts             → [GET]    /orgs/$ORG_ID
    │   └── members/
    │       ├── list.ts        → [GET]    /orgs/$ORG_ID/members
    │       ├── add.ts         → [POST]   /orgs/$ORG_ID/members/$USER_ID
    │       ├── get.ts         → [GET]    /orgs/$ORG_ID/members/$USER_ID
    │       ├── edit.ts        → [PUT]    /orgs/$ORG_ID/members/$USER_ID
    │       ├── inactive.ts    → [PATCH]  /orgs/$ORG_ID/members/$USER_ID/inactive
    │       └── remove.ts      → [DELETE] /orgs/$ORG_ID/members/$USER_ID
    ├── users/
    │   ├── user_new.ts        → [POST]   /users/new
    │   ├── user-get.ts        → [GET]    /users/$ID
    │   ├── UserEdit.ts        → [PATCH]  /users/$ID
    │   ├── Userdelete.ts      → [DELETE] /users/$ID/delete
    │   ├── userblock.ts       → [PATCH]  /users/$ID/block
    │   ├── userSearch.ts      → [GET]    /users/search
    │   └── index.ts           → [GET]    /users
    ├── posts.ts               → [GET]    /posts
    └── index.ts               → [GET]    /
```

#### Index Files:

`index.ts` files represent the base route directory

They can contain settings that affect all child routes

Example: `./actions/users/index.ts` configures the `/users` route

#### Configuration Scope:

Settings in specific files affect only that route

Settings in `index.ts` files affect all child routes

#### HTTP Verbs:

Files must explicitly export the HTTP verb (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`, `HEAD`, `CONNECT`, `TRACE`)

Files without a declared HTTP verb are ignored in route matching

#### Examples:

```ts
// file: ./actions/index.ts
import { Action, Response } from 'rajt'
import { Get } from 'rajt/http'
import type { Context } from 'rajt/types'

@Get('/')
export default class Index extends Action {
  static async handle(c: Context) {
    return Response.ok({ message: 'Hello world! ;)' })
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
import { Action, Request, Response } from 'rajt'
import { Post } from 'rajt/http'
import type { Context } from 'rajt/types'
import { z } from 'zod'

const RequestSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().optional().nullable(),
})

type IRequestSchema = z.infer<typeof RequestSchema>

@Post('/users/new')
export default class UsersNew extends Action {
  static rules() {
    return this.rule('json', RequestSchema)
  }

  static async handle(c: Context) {
    const user = await Request.body<IRequestSchema>()
    console.log(user)
    return Request.created({ message: 'User created', data: user })
  }
}
```

Using multiple validations:

```ts
// file: ./actions/users/list
import { Action, Request, Response } from 'rajt'
import { Get } from 'rajt/http'
import type { Context } from 'rajt/types'
import { z } from 'zod'

@Get('/users/:org')
export default class UsersNew extends Action {
  static rules() {
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

  static async handle(c: Context) {
    const query = await Request.query()
    console.log(query)
    const org = await Request.param('org')
    console.log(org)
    return Response.ok({ message: 'Listing orgs...' })
  }
}
```

## Enums

This module provides a flexible implementation of enums in TypeScript/JavaScript that supports:

 - Simple string enums (array)
 - Numeric enums (key-value object)
 - Aliased enums (custom values)
 - Utility methods for validation/retrieve a value or key

#### Enum import

```ts
import { Enum } from 'rajt'
```

#### Simple String Enum (Array<`string`>)

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

#### Schema:

Define the typed data structure of your entity using Zod:

```ts
import { z } from 'zod'

const UserSchema = z.object({
  uid: z.string(),
  name: z.string(),
  email: z.string(),
  createdAt: z.number(),
})
```

Create a typed model:

```ts
import { Model, Schema } from 'rajt/dynamodb'

@Model('USER_DATABASE') // optional when using with repositories
export default class UserModel extends Schema(UserSchema) {
  static defaultSortKey = 'PROFILE' // optional

  #PK?: 'PK' // default, define partition key name
  #SK?: 'SK' // default, define sort key name

  // custom acessor
  get id() {
    this.uuid
  }
}

// alternative
@Model('USER_DATABASE') // optional when using with repositories
const UserModel = Schema(UserSchema)
```

#### Repository

The repository pattern provides an abstract layer for typed entities, helps encapsulate data access logic, making your code more organized and easier to maintain

```ts
import { Repository } from 'rajt/dynamodb'
import type { Keys } from 'rajt/dynamodb/types'

export default class UserRepository extends Repository(UserSchema, UserModel, 'USER_DATABASE') {
  static key(pk: string, sk?: string) {
    const _pk = 'USER#'+ pk
    return sk ? [_pk, sk || this.model.defaultSortKey] as Keys : _pk
  }

  static async get(id: string) {
    return this.model.get(this.key(id))
  }

  static async list(): Promise<UserModel[]> {
    return await this.model.scan()
  }
}
```

## Commands

List of available commands:

| Command | Description |
| -: | :- |
| `dev` | Start the localhost server |
| `cf:build` | Performs build for Cloudflare Workers |
| `cf:build:watch` | Performs the build for Cloudflare Workers, and when any file is changed, another build is automatically executed |
| `cf:local` | Build and start the local Cloudflare Workers environment server |
| `cf:deploy` | Perform the build and execute wrangler deploy |
| `aws:build` | Performs build for AWS Lambda |
| `aws:build:watch` | Performs the build for AWS Lambda, and when any file is changed, another build is automatically executed |
| `aws:local` | Build and start the local AWS Lambda environment server |
| `aws:package` | Perform the build and execute sam:package |
| `aws:deploy` | Perform the build and execute sam:package and sam:deploy |
| `aws:update` | Perform the build, package the build file into a zip file and execute sam:update |
| `clean` | Remove all auto-generated files: build, cache, etc.. |
| `clean:build` | Remove files generated with build |
| `clean:temp` | Remove cache files |
| `zip` | Package the build file into a zip file |
| `ensure-dirs` | Deletes the automatically generated file directories and recreates them with the appropriate permissions |
| `cache:routes` | Create cache file of routes, middlewares, and configurations |

## Environments

Define the development env vars in `.env.dev` file, and the production in `.env.prod` file.

## Deploy

#### AWS Lambda Deployment

```bash
bun run aws:deploy
```

#### Cloudflare Workers Deployment

```bash
bun run cf:deploy
```

