import type { z } from 'zod'
import { agentCtxStore, type AgentCtx } from './context'
import { register as registerSearch } from './handlers/search'
import { register as registerEmail } from './handlers/email'
import { register as registerDocuments } from './handlers/documents'
import { register as registerCrmWrite } from './handlers/crm-write'
import { register as registerHardDelete } from './handlers/hard-delete'

export type Ctx = AgentCtx

type Handler = (input: unknown) => Promise<unknown>
const handlers: Record<string, Handler> = {}

export async function runCustomTool(
  name: string,
  input: unknown,
  ctx: Ctx,
): Promise<unknown> {
  return agentCtxStore.run(ctx, async () => {
    const fn = handlers[name]
    if (!fn) return { error: `Unknown tool: ${name}` }
    try {
      return await fn(input)
    } catch (err) {
      console.error(`[runCustomTool:${name}] uncaught`, err)
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })
}

// Zod-validate input, then run handler. Validation failures return
// {error: ...} so the webhook flips is_error:true and the model retries with a
// corrected shape.
export function registerTool<S extends z.ZodTypeAny>(
  name: string,
  schema: S,
  fn: (input: z.infer<S>) => Promise<unknown>,
): void {
  handlers[name] = async (rawInput) => {
    const parsed = schema.safeParse(rawInput)
    if (!parsed.success) {
      return {
        error: `Invalid input for ${name}: ${parsed.error.issues
          .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
          .join('; ')}`,
      }
    }
    return fn(parsed.data)
  }
}

// Side-effect-on-import registration. Safe because custom-tools.ts is only
// imported from the Telegram webhook and registerTool is idempotent
// (object-key assignment, not push).
registerSearch()
registerEmail()
registerDocuments()
registerCrmWrite()
registerHardDelete()
