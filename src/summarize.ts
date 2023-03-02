import axios from 'axios'
import { OpenAIResult } from './OpenAIResult'
import { getChunckedTranscripts, getSummaryPrompt } from './prompt'

const run = async (bvId: string) => {
  const requestUrl = `https://api.bilibili.com/x/player/v2?cid=281031471&bvid=${bvId}`
  const { data } = await axios.get(requestUrl)

  return data
}

export async function summarize(req: { bvId: string; apiKey: string }) {
  const { bvId, apiKey } = req

  const res = await run(bvId)
  if (!res)
    return

  const subtitleList = res.data?.subtitle?.subtitles

  if (!subtitleList || subtitleList?.length < 1) {
    console.error('No subtitle in the video: ', bvId)
    return
  }

  const betterSubtitle
    = subtitleList.find(({ lan }: { lan: string }) => lan === 'zh-CN')
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
  // console.log('========transcripts========', transcripts)

  const text = getChunckedTranscripts(transcripts, transcripts)

  const prompt = getSummaryPrompt('ChatGPT对中国用户开放了，以后再也不用科学上网了', text, true)

  try {
    const payload = {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user' as const, content: prompt }],
      temperature: 0.5,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      max_tokens: apiKey ? 400 : 300,
      stream: false,
      n: 1,
    }

    const result = await OpenAIResult(payload, apiKey)

    return result
  }
  catch (error: any) {
    console.error(error)
  }
}
