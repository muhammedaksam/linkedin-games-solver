export async function sendToBackground<
  TReq = unknown,
  TRes = unknown
>(message: { name: string; body?: TReq }): Promise<TRes> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
      } else {
        resolve(response)
      }
    })
  })
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace PlasmoMessaging {
  export type MessageHandler<TReq = unknown, TRes = unknown> = (
    req: { body?: TReq; sender?: chrome.runtime.MessageSender },
    res: { send: (response: TRes) => void }
  ) => void | Promise<void>
}
