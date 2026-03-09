import WebSocket from "ws"
import { createUuid } from "@/lib/uuid"

function extractText(result: any): string {
  if (result == null) return ""
  if (typeof result === "string") return result
  if (typeof result.text === "string") return result.text
  if (typeof result.message === "string") return result.message
  if (typeof result.answer === "string") return result.answer

  if (Array.isArray(result.content)) {
    const text = result.content
      .map((item: any) => (typeof item?.text === "string" ? item.text : ""))
      .filter(Boolean)
      .join("\n")
    if (text) return text
  }

  return JSON.stringify(result, null, 2)
}

export async function askOpenClaw(question: string, sessionKey: string) {
  const url = process.env.OPENCLAW_WS_URL || "ws://43.156.236.194:18789"
  const token = process.env.OPENCLAW_TOKEN

  if (!token) {
    throw new Error("Missing OPENCLAW_TOKEN in env")
  }

  const ws = new WebSocket(url)
  const connectId = createUuid()
  const chatId = createUuid()

  return await new Promise<{ raw: any; text: string }>((resolve, reject) => {
    const timeout = setTimeout(() => {
      try {
        ws.close()
      } catch {}
      reject(new Error("Timeout: OpenClaw did not respond in time"))
    }, 600000)

    const send = (obj: any) => ws.send(JSON.stringify(obj))
    let collectedText = ""

    ws.on("error", (error) => {
      clearTimeout(timeout)
      reject(error)
    })

    ws.on("message", (msg) => {
      let data: any
      try {
        data = JSON.parse(Buffer.isBuffer(msg) ? msg.toString("utf8") : String(msg))
      } catch {
        return
      }

      if (data?.type === "event" && data?.event === "connect.challenge") {
        send({
          type: "req",
          id: connectId,
          method: "connect",
          params: {
            minProtocol: 3,
            maxProtocol: 3,
            client: {
              id: "clawdbot-control-ui",
              version: "1.0.0",
              platform: "nodejs",
              mode: "ui",
              instanceId: createUuid(),
            },
            role: "operator",
            scopes: ["operator.admin", "operator.write"],
            caps: [],
            auth: { token },
          },
        })
        return
      }

      if (data?.type === "res" && data?.id === connectId) {
        if (!data?.ok || data?.error) {
          clearTimeout(timeout)
          try {
            ws.close()
          } catch {}
          reject(new Error(`Auth failed: ${JSON.stringify(data.error)}`))
          return
        }

        send({
          type: "req",
          id: chatId,
          method: "chat.send",
          params: {
            message: question,
            sessionKey,
            idempotencyKey: createUuid(),
          },
        })
        return
      }

      if (data?.type === "res" && data?.id === chatId) {
        if (!data?.ok || data?.error) {
          clearTimeout(timeout)
          try {
            ws.close()
          } catch {}
          reject(new Error(`chat.send failed: ${JSON.stringify(data.error)}`))
        }
        return
      }

      if (data?.type === "event" && data?.event === "chat") {
        const payload = data?.payload

        if (payload?.state === "delta" && payload?.message) {
          const content = payload.message?.content
          if (Array.isArray(content)) {
            const texts = content
              .filter((item: any) => item?.type === "text" && typeof item?.text === "string")
              .map((item: any) => item.text)
            if (texts.length > 0) {
              collectedText = texts.join("\n")
            }
          }
        }

        if (payload?.state === "final") {
          clearTimeout(timeout)
          try {
            ws.close()
          } catch {}
          resolve({ raw: payload, text: extractText(payload?.message) || collectedText })
          return
        }

        if (payload?.state === "aborted") {
          clearTimeout(timeout)
          try {
            ws.close()
          } catch {}
          resolve({ raw: payload, text: collectedText || "(chat aborted)" })
          return
        }

        if (payload?.state === "error") {
          clearTimeout(timeout)
          try {
            ws.close()
          } catch {}
          reject(new Error(`Chat error: ${payload?.errorMessage || JSON.stringify(payload)}`))
        }
      }
    })
  })
}
