import axios from 'axios'

export type ChatGPTAgent = 'user' | 'system' | 'assistant'

export interface ChatGPTMessage {
  role: ChatGPTAgent
  content: string
}
export interface OpenAIStreamPayload {
  model: string
  messages: ChatGPTMessage[]
  temperature: number
  top_p: number
  frequency_penalty: number
  presence_penalty: number
  max_tokens: number
  n: number
}

function checkApiKey(str: string) {
  const pattern = /^sk-[A-Za-z0-9]{48}$/
  return pattern.test(str)
}

function formatResult(result: any) {
  const answer = result.choices[0].message?.content || ''
  if (answer.startsWith('\n\n'))
    return answer.substring(2)

  return answer
}

export async function OpenAIResult(
  payload: OpenAIStreamPayload,
) {
  const openai_api_key = process.env.APIKEY || ''

  if (!checkApiKey(openai_api_key))
    throw new Error('OpenAI API Key Format Error')

  const res = await axios({
    url: 'https://api.openai.com/v1/chat/completions',
    method: 'POST',
    data: payload,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openai_api_key ?? ''}`,
    },
  })

  if (res.status !== 200)
    throw new Error('OpenAI API Error')

  return formatResult(res.data)
}
