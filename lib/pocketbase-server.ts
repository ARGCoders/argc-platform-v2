import 'server-only'
import { cache } from 'react'
import PocketBase from 'pocketbase'
import { env } from './env'

declare global {
  // `var` is required here — globalThis augmentation does not work with let/const.
  var __pbAdminClient: PocketBase | undefined
}

/**
 * PocketBase client authenticated as the superuser admin.
 *
 * Two layers of reuse, because they solve different problems:
 *  - `React.cache()` deduplicates across generateMetadata, layout and page
 *    within a single render pass.
 *  - `globalThis` survives Next.js HMR. Without it, every hot reload in dev
 *    creates and authenticates a fresh client, leaking a connection per edit.
 *
 * Re-authenticates automatically once the cached token expires (PocketBase
 * admin tokens last one hour).
 */
export const getAdminClient = cache(async (): Promise<PocketBase> => {
  const cached = globalThis.__pbAdminClient
  if (cached?.authStore.isValid) return cached

  const pb = new PocketBase(env.POCKETBASE_URL)
  pb.autoCancellation(false)
  await pb.admins.authWithPassword(
    env.POCKETBASE_ADMIN_EMAIL,
    env.POCKETBASE_ADMIN_PASSWORD,
  )

  globalThis.__pbAdminClient = pb
  return pb
})

/**
 * Fresh, unauthenticated PocketBase client. Used to act as a specific user
 * (e.g. authWithPassword, authRefresh) without touching the admin authStore.
 */
export function getPocketBaseClient(): PocketBase {
  return new PocketBase(env.POCKETBASE_URL)
}
