export function getSummaryPrompt(title: string, transcript: any) {
  return `标题: "${title
    .replace(/\n+/g, ' ')
    .trim()}"\n视频字幕: "${truncateTranscript(transcript)
      .replace(/\n+/g, ' ')
      .trim()}`
}

export type CosplayType = 'summary' | 'robot' | 'editor'

export function getCosplay(type: CosplayType = 'summary', limit = 5) {
  const summaryPrompt = `我希望你是一名专业的视频内容编辑，帮我总结视频的内容精华。请先用一句简短的话总结视频梗概。然后再请你将视频字幕文本进行总结，在每句话的最前面加上开始的时间戳，然后以无序列表的方式返回。请注意不要超过${limit}}条，确保所有的句子都足够精简，清晰完整，祝你好运！`

  const robotPrompt = `我希望你是一个问答机器人，能够回答我提出的问题，请注意不要超过${limit}个字，确保所有的句子都足够精简，清晰完整，祝你好运！`

  const editorPropmt = `我希望你是精彩集锦剪辑师，帮助我找到精彩片段，我会给你带有时间戳的语音识别的字幕。请先用一句简短的话总结视频梗概。然后找出${limit}个最有趣的或高潮的时间点，针对每个时间点，介绍内容，如果这时的字幕有趣，可以附上字幕。注意不要超过${limit}个时间点，不要重复，用无序列表方式返回。注意我给你的字幕是语音识别的，可能有误，你可以自己修正一下。`

  switch (type) {
    case 'summary':
      return summaryPrompt
    case 'robot':
      return robotPrompt
    case 'editor':
      return editorPropmt
    default:
      return ''
  }
}

// Seems like 15,000 bytes is the limit for the prompt
const limit = 7000 // 1000 is a buffer

export function getChunckedTranscripts(textData: { text: any; index: any }[], textDataOriginal: any[]) {
  // [Thought Process]
  // (1) If text is longer than limit, then split it into chunks (even numbered chunks)
  // (2) Repeat until it's under limit
  // (3) Then, try to fill the remaining space with some text
  // (eg. 15,000 => 7,500 is too much chuncked, so fill the rest with some text)

  let result = ''
  const text = textData.sort((a, b) => a.index - b.index).map(t => t.text).join(' ')
  const bytes = textToBinaryString(text).length

  if (bytes > limit) {
    // Get only even numbered chunks from textArr
    const evenTextData = textData.filter((t, i) => i % 2 === 0)
    result = getChunckedTranscripts(evenTextData, textDataOriginal)
  }
  else {
    // Check if any array items can be added to result to make it under limit but really close to it
    if (textDataOriginal.length !== textData.length) {
      textDataOriginal.forEach((obj, i) => {
        if (textData.some(t => t.text === obj.text))
          return

        textData.push(obj)

        const newText = textData.sort((a, b) => a.index - b.index).map(t => t.text).join(' ')
        const newBytes = textToBinaryString(newText).length

        if (newBytes < limit) {
          const nextText = textDataOriginal[i + 1]
          const nextTextBytes = textToBinaryString(nextText.text).length

          if (newBytes + nextTextBytes > limit) {
            const overRate = ((newBytes + nextTextBytes) - limit) / nextTextBytes
            const chunkedText = nextText.text.substring(0, Math.floor(nextText.text.length * overRate))
            textData.push({ text: chunkedText, index: nextText.index })
            result = textData.sort((a, b) => a.index - b.index).map(t => t.text).join(' ')
          }
          else {
            result = newText
          }
        }
        else {
          result = text
        }
      })
    }
    else {
      result = text
    }
  }

  const originalText = textDataOriginal.sort((a, b) => a.index - b.index).map(t => t.text).join(' ')
  return (result === '') ? originalText : result // Just in case the result is empty
}

function truncateTranscript(str: string) {
  const bytes = textToBinaryString(str).length
  if (bytes > limit) {
    const ratio = limit / bytes
    const newStr = str.substring(0, str.length * ratio)
    return newStr
  }
  return str
}

function textToBinaryString(str: string) {
  const escstr = decodeURIComponent(encodeURIComponent(escape(str)))
  const binstr = escstr.replace(/%([0-9A-F]{2})/gi, (match, hex) => {
    const i = parseInt(hex, 16)
    return String.fromCharCode(i)
  })
  return binstr
}
