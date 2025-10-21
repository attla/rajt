import {
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Head,
  Options,
  Connect,
  Trace,
  // Middleware,
  // Middlewares,
  // Auth
} from '@/http'

describe('HTTP', () => {

  describe('Method Decorators', () => {
    const methods = [
      { decorator: Get, method: 'get', path: '/list' },
      { decorator: Post, method: 'post', path: '/create' },
      { decorator: Put, method: 'put', path: '/update' },
      { decorator: Patch, method: 'patch', path: '/partial-update' },
      { decorator: Delete, method: 'delete', path: '/remove' },
      { decorator: Head, method: 'head', path: '/head' },
      { decorator: Options, method: 'options', path: '/options' },
      { decorator: Connect, method: 'connect', path: '/connect' },
      { decorator: Trace, method: 'trace', path: '/trace' },
    ]

    methods.forEach(({ decorator, method, path }) => {
      it(method.toUpperCase(), () => {
        @decorator(path)
        class Controller {handle(){}}

        // @ts-ignore
        expect(Controller?.m).toBe(method)
        // @ts-ignore
        expect(Controller?.p).toBe(path)
        // @ts-ignore
        expect(Controller?.mw).toEqual([])

        @decorator()
        class Controller2 {handle(){}}

        // @ts-ignore
        expect(Controller2?.p).toBe('/')

        @decorator
        class Controller3 {handle(){}}

        // @ts-ignore
        expect(Controller3?.p).toBe('/')
      })
    })
  })

})
