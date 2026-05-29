declare module "data-base64:~assets/*.svg" {
  const content: string
  export default content
}

declare module "*.css" {
  const content: string
  export default content
}

declare namespace NodeJS {
  interface ProcessEnv {
    PLASMO_PUBLIC_GTAG_ID?: string
    PLASMO_PUBLIC_SECRET_API_KEY?: string
  }
}
