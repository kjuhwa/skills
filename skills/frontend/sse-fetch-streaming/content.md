## Implementation

```typescript
// shared/apis/requestSSE.ts

interface SSEStream {
  onmessage: (event: { event: string; data: any }) => void
  oncomplete: () => void
  onerror: (error: any) => void
  pause: () => void
  resume: () => void
  close: () => void
}

export const requestSSE = (
  url: string,
  params?: Record<string, any>,
  formData?: FormData
): SSEStream => {
  let paused = false
  let isClosed = false
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null

  const stream: SSEStream = {
    onmessage: () => {},
    oncomplete: () => {},
    onerror: () => {},
    pause() { paused = true },
    resume() { paused = false; read() },
    close() { isClosed = true; reader?.cancel() },
  }

  const body = formData || (params ? JSON.stringify(params) : undefined)
  const headers: Record<string, string> = {
    'Accept-Language': getCurrentLocale(),
  }
  if (!formData) {
    headers['Content-Type'] = 'application/json'
  }

  const token = getAccessToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  fetch(url, {
    method: 'POST',
    headers,
    body,
    credentials: 'include',
  })
    .then((response) => {
      if (!response.ok) throw new Error(`SSE failed: ${response.status}`)
      reader = response.body!.getReader()
      read()
    })
    .catch((error) => stream.onerror(error))

  const decoder = new TextDecoder()
  let buffer = ''

  function read() {
    if (isClosed || paused || !reader) return

    reader.read().then(({ done, value }) => {
      if (done) {
        stream.oncomplete()
        return
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        const jsonStr = line.slice(5).trim()
        if (!jsonStr || jsonStr === '[DONE]') continue

        try {
          const data = JSON.parse(jsonStr)
          const event = data.event || (data.answer ? 'message' : 'unknown')
          stream.onmessage({ event, data })
        } catch {
          // Non-JSON data line, skip
        }
      }

      read() // Continue reading
    }).catch((error) => {
      if (!isClosed) stream.onerror(error)
    })
  }

  return stream
}
```

## Usage: Chat Hook

```typescript
// shared/hooks/useChatBot.tsx
const useChatBot = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const streamRef = useRef<SSEStream | null>(null)

  const sendMessage = (text: string) => {
    setIsStreaming(true)
    const stream = requestSSE('/api/ai/chat', { message: text })

    stream.onmessage = ({ event, data }) => {
      if (event === 'message') {
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last?.role === 'assistant' && last.streaming) {
            return [
              ...prev.slice(0, -1),
              { ...last, content: last.content + data.answer },
            ]
          }
          return [...prev, { role: 'assistant', content: data.answer, streaming: true }]
        })
      }
    }

    stream.oncomplete = () => {
      setIsStreaming(false)
      setMessages((prev) => prev.map((m) => ({ ...m, streaming: false })))
    }

    stream.onerror = (error) => {
      setIsStreaming(false)
      console.error('SSE error:', error)
    }

    streamRef.current = stream
  }

  const stopStreaming = () => streamRef.current?.close()

  useEffect(() => {
    return () => streamRef.current?.close()
  }, [])

  return { messages, isStreaming, sendMessage, stopStreaming }
}
```

## Key Design Decisions

1. **Fetch over EventSource** — EventSource only supports GET; Fetch enables POST with JSON body
2. **Pause/resume** — boolean flag stops `read()` loop without cancelling the stream
3. **Line buffering** — incomplete lines kept in buffer across chunks for correct SSE parsing
4. **`[DONE]` sentinel** — standard SSE completion signal (compatible with OpenAI-style APIs)
5. **Locale + auth headers** — injected automatically, unlike EventSource which has no header support
6. **Ref-based cleanup** — stream closed on component unmount via useEffect cleanup
