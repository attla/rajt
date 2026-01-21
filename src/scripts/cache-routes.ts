import { cacheRoutes } from '../routes'

cacheRoutes()
  .then(() => {
    console.log('✅ Routes cached!')
    process.exit(0)
  }).catch(e => {
    console.error('❌ Error: ', e)
    process.exit(1)
  })
