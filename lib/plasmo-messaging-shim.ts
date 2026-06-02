/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-namespace */
export async function sendToBackground<TReq = any, TRes = any>(message: {
  name: string
  body?: TReq
}): Promise<TRes> {
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

export namespace PlasmoMessaging {
  export type MessageHandler<TReq = any, TRes = any> = (
    req: { body?: TReq; sender?: chrome.runtime.MessageSender },
    res: { send: (response: TRes) => void }
  ) => void | Promise<void>
}
