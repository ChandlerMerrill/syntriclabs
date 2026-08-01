import type { ChannelAdapter, SendResult } from './types'

/**
 * Meta ads — Phase 5, deliberately not built.
 *
 * Publishing an ad needs a Meta app that has passed review plus a funded ad
 * account, and it spends money on every run rather than an API quota. The plan
 * defers both until there is a reason to spend. The adapter exists so the
 * channel is a value in one enum rather than a branch to add later.
 */
export const metaAdsAdapter: ChannelAdapter = {
  channel: 'meta_ads',
  automated: false,
  manualReason: 'Meta ads are deferred to Phase 5 — app review and an ad budget are prerequisites.',

  async send(): Promise<SendResult> {
    return {
      ok: false,
      error: 'Meta ads publishing is not built. Deferred to Phase 5.',
      retryable: false,
    }
  },
}
