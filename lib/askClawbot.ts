import WebSocket from "ws"

export async function askClawbot(question: string) {

  const ws = new WebSocket("ws://43.156.236.194:18789")

  const token = process.env.OPENCLAW_TOKEN!

  return new Promise<string>((resolve, reject) => {

    ws.on("message", (raw) => {

      const data = JSON.parse(raw.toString())

      // challenge
      if (data.event === "connect.challenge") {

        ws.send(JSON.stringify({
          type: "request",
          id: "1",
          method: "connect.authenticate",
          params: {
            token,
            nonce: data.payload.nonce
          }
        }))

      }

      // authenticated
      if (data.type === "response" && data.id === "1") {

        ws.send(JSON.stringify({
          type: "request",
          id: "2",
          method: "agent.turn",
          params: {
            message: question
          }
        }))

      }

      // response
      if (data.type === "response" && data.id === "2") {

        const answer =
          data.result?.message?.content ??
          data.result?.content ??
          "Clawbot 没有返回内容"

        resolve(answer)

        ws.close()

      }

    })

    ws.on("error", reject)

  })
}