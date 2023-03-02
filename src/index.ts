import { summarize } from './summarize'

const apiKey = ''

const bvId = 'BV19M4y1d77m'

const summary = await summarize({ bvId, apiKey })

console.info('总结的结果是\r\n', summary)
