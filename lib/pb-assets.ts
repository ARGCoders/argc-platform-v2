import 'server-only'
import { env } from './env'

/**
 * Builds the public URL for a file stored on a PocketBase record.
 *
 * PocketBase file fields store only the bare filename; the serving path is
 * `/api/files/{collectionId}/{recordId}/{filename}`. Used for post banners
 * today, and by events and avatars later.
 */
export function pocketBaseFileUrl(
  collectionId: string,
  recordId: string,
  filename: string,
): string {
  return `${env.POCKETBASE_URL}/api/files/${collectionId}/${recordId}/${encodeURIComponent(filename)}`
}
