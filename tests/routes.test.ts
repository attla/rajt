import { Route, Routes } from '@/types'
import {
  sortRoutes
} from '@/routes'

describe('Routes', () => {
  const routes = [
    '/*',
    '/api/users/list',
    '/orgs/:oid/members',
    '/orgs/configs/teams',
    '/orgs/*',
    '/*/:id',
  ].map(route => ({ path: route } as Route))

  it('Prioritize the order of importance', () => {
    expect(sortRoutes(routes)).toEqual([
      '/api/users/list',
      '/orgs/configs/teams',
      '/orgs/:oid/members',
      '/orgs/*',
      '/*/:id',
      '/*',
    ].map(route => ({path: route} as Route)))
  })

})
