import { summarize } from './summarize'

const apiKey = ''

const bvId = ''

const summary = await summarize({ bvId, apiKey })

console.info('总结的结果是\r\n', summary)
