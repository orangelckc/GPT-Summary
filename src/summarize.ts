import axios from 'axios'
import { OpenAIResult } from './OpenAIResult'
import { getChunckedTranscripts, getSummaryPrompt } from './prompt'

const getBaseInfo = async (bvId: string) => {
  // 可以获取到cid，和title
  const requestUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvId}`
  const { data } = await axios.get(requestUrl)
  return data
}

const getSubtitle = async (cid: string, bvId: string) => {
  // 可以获取到字幕文件的链接
  const requestUrl = `https://api.bilibili.com/x/player/v2?cid=${cid}&bvid=${bvId}`
  const { data } = await axios.get(requestUrl)
  return data
}

export async function summarize(req: { bvId: string; apiKey: string }) {
  const { bvId, apiKey } = req

  const res = await getBaseInfo(bvId)
  if (!res)
    return

  const title = res.data?.title
  const cid = res.data?.cid

  const res2 = await getSubtitle(cid, bvId)
  const subtitleList = res2.data?.subtitle?.subtitles

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
  // console.log('transcripts', transcripts.length)
  const text = getChunckedTranscripts(transcripts, transcripts)
  // console.log('text', text)
  const prompt = getSummaryPrompt(title, text, true)
  // console.log('prompt', prompt)
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
