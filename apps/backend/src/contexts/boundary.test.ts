import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

const contextsRoot = dirname(fileURLToPath(import.meta.url))

/** Adapters the deployment owns; contexts must stay platform-agnostic. */
const importsAdapter =
  /(?:\bfrom\s+|\bimport\s*\(?\s*)['"](?:alchemy(?:\/|['"])|cloudflare:|@cloudflare\/|wrangler)/

/**
 * `@cloudflare/workers-types` is ambient in this package, so a context can name
 * a host type without importing anything. Keep those names at the edge.
 */
const namesHostType =
  /\b(?:D1Database|R2Bucket|KVNamespace|DurableObjectState|DurableObjectStorage|DurableObjectNamespace|ExecutionContext|Fetcher|SqlStorage|AnalyticsEngineDataset|Ai)\b/

const listSources = async (directory: string): Promise<Array<string>> => {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) return listSources(path)
      return entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') ? [path] : []
    }),
  )
  return nested.flat()
}

test('backend contexts do not depend on the host platform', async () => {
  const sources = await listSources(contextsRoot)
  const violations: Array<string> = []

  for (const source of sources) {
    const text = await readFile(source, 'utf8')
    const file = relative(contextsRoot, source)

    if (importsAdapter.test(text))
      violations.push(`${file}: imports an Alchemy or Cloudflare adapter`)
    if (namesHostType.test(text)) violations.push(`${file}: names a Cloudflare global type`)
  }

  expect(sources.length).toBeGreaterThan(0)
  expect(violations).toEqual([])
})
