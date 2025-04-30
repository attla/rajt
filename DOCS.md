This framework is fully geared towards the serverless world, specifically AWS Lambda / Cloudflare Workers.

> It works with bun and LLRT runtimes ;)

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

Creating a  middleware class:

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
