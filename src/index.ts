import path from 'path'
import dotenv from 'dotenv'
import { summarize } from './summarize'

let envFound
const envPath = path.resolve(process.cwd(), '.env')
// 优先使用本地环境变量.env.local
envFound = dotenv.config({ path: `${envPath}.local` })
envFound = dotenv.config({ path: envPath })

if (envFound.error)
  throw new Error('⚠️ 未发现.env文件 ⚠️')

const bvId = 'BV1AL41117vp'

const summary = await summarize(bvId)

console.info('总结的结果是\r\n', summary)
