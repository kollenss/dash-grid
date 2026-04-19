import path from 'path'
import { pathToFileURL } from 'url'

export interface PluginRoute {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  handler: (req: any, reply: any) => Promise<any>
}

export interface ServerPlugin {
  routes: PluginRoute[]
}

const registry = new Map<string, PluginRoute[]>()

export async function loadPluginServer(pluginId: string, serverJsPath: string): Promise<void> {
  try {
    // Append timestamp to bust Node's ESM module cache on reinstall
    const url = pathToFileURL(serverJsPath).href + `?v=${Date.now()}`
    const mod = await import(url)
    const plugin: ServerPlugin = mod.default ?? mod
    registry.set(pluginId, plugin.routes ?? [])
    console.log(`[plugins] Loaded server plugin: ${pluginId} (${plugin.routes?.length ?? 0} routes)`)
  } catch (e) {
    console.error(`[plugins] Failed to load server plugin ${pluginId}:`, e)
  }
}

export function unloadPluginServer(pluginId: string): void {
  registry.delete(pluginId)
  console.log(`[plugins] Unloaded server plugin: ${pluginId}`)
}

export async function dispatchPluginRequest(
  pluginId: string,
  subPath: string,
  req: any,
  reply: any
): Promise<boolean> {
  const routes = registry.get(pluginId)
  if (!routes) return false

  const route = routes.find(
    r => r.path === subPath && r.method.toUpperCase() === req.method.toUpperCase()
  )
  if (!route) return false

  const result = await route.handler(req, reply)
  if (!reply.sent) reply.send(result)
  return true
}

export function getLoadedPlugins(): string[] {
  return Array.from(registry.keys())
}
