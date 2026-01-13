const getFullYear = Date.prototype.getFullYear
const getMonth = Date.prototype.getMonth
const getDate = Date.prototype.getDate
const getHours = Date.prototype.getHours
const getMinutes = Date.prototype.getMinutes
const getSeconds = Date.prototype.getSeconds
const pad = (n: number) => n > 9 ? n : '0' + n

export const getLocalDateTime = (date = new Date()) =>
  getFullYear.call(date) + '-' + pad(getMonth.call(date) + 1) + '-' + pad(getDate.call(date))
   + ' ' + pad(getHours.call(date)) + ':' + pad(getMinutes.call(date)) + ':' + pad(getSeconds.call(date))

export default getLocalDateTime
