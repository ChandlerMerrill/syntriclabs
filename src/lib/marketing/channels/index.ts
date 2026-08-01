import type { MarketingChannel } from '../types'
import type { ChannelAdapter } from './types'
import { emailAdapter } from './email'
import { linkedinAdapter } from './linkedin'
import { metaAdsAdapter } from './meta-ads'

const ADAPTERS: Record<MarketingChannel, ChannelAdapter> = {
  email: emailAdapter,
  linkedin: linkedinAdapter,
  meta_ads: metaAdsAdapter,
}

export function channelAdapter(channel: MarketingChannel): ChannelAdapter {
  return ADAPTERS[channel]
}

/** Channels the dispatcher is allowed to claim and send on its own. */
export function automatedChannels(): MarketingChannel[] {
  return (Object.keys(ADAPTERS) as MarketingChannel[]).filter((c) => ADAPTERS[c].automated)
}

export type { ChannelAdapter, SendRequest, SendResult } from './types'
