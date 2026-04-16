"use client"

import { SWRConfig } from "swr"

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" })
  if (!res.ok) {
    const err = new Error(`Request failed: ${res.status}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return res.json()
}

export function AdminSWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        keepPreviousData: true,
        dedupingInterval: 2000,
        errorRetryCount: 2,
        shouldRetryOnError: (err) => {
          const status = (err as { status?: number })?.status
          return status !== 401 && status !== 403 && status !== 404
        },
      }}
    >
      {children}
    </SWRConfig>
  )
}
