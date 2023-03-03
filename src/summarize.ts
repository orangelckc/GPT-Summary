import axios from 'axios'
import pRetry from 'p-retry'
import { OpenAIResult } from './OpenAIResult'
import type { CosplayType } from './prompt'
import { getChunckedTranscripts, getCosplay, getSummaryPrompt } from './prompt'

const getBaseInfo = async (bvId: string) => {
  // 可以获取到cid，和title
  const requestUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvId}`
  const { data } = await axios.get(requestUrl)
  return data
}

const getSubtitle = async (cid: string, bvId: string) => {
  // 可以获取到字幕文件的链接
  const requestUrl = `https://api.bilibili.com/x/player/v2?cid=${cid}&bvid=${bvId}`
  const { data: res } = await axios.get(requestUrl, {
    headers: {
      cookie: process.env.COOKIE,
    },
  })
  const subtitleList = res.data?.subtitle?.subtitles
  if (!subtitleList || subtitleList?.length < 1)
    throw new Error(`No subtitle in the video: ${bvId}`)
  return subtitleList
}

export async function summarize(bvId: string, type?: CosplayType, limit?: number) {
  const res = await getBaseInfo(bvId)
  if (!res)
    return

  const title = res.data?.title
  const cid = res.data?.cid

  const subtitleList = await pRetry(() => getSubtitle(cid, bvId), {
    onFailedAttempt: async (error) => {
      console.warn(
        `尝试第 ${error.attemptNumber} 次失败. 还有 ${error.retriesLeft} 次`,
      )
    },
    retries: 2,
  })

  const betterSubtitle
    = subtitleList.find(({ lan }: { lan: string }) => lan === 'zh-CN' || lan === 'ai-zh')
    || subtitleList[0]

  const subtitleUrl = betterSubtitle?.subtitle_url
  // console.log('字幕文件的链接', subtitleUrl)

  const { data: subtitles } = await axios.get(`https:${subtitleUrl}`)

  const transcripts = subtitles.body.map((item: { from: any; content: any }, index: number) => {
    return {
      text: `${item.from}: ${item.content}`,
      index,
    }
  })
  // console.log('transcripts', transcripts.length)
  const text = getChunckedTranscripts(transcripts, transcripts)
  // console.log('text', text)
  const prompt = getSummaryPrompt(title, text)
  // console.log('prompt', prompt)
  const cosplay = getCosplay(type, limit)

  try {
    const payload = {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system' as const, content: cosplay },
        { role: 'user' as const, content: prompt },
      ],
      temperature: 0.5,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      max_tokens: 400,
      n: 1,
    }

    const result = await OpenAIResult(payload)

    return result
  }
  catch (error: any) {
    console.error(error)
  }
}
