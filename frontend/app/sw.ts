/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { BackgroundSyncPlugin, NetworkOnly, Serwist } from "serwist";


declare global {
    interface WorkerGlobalScope extends SerwistGlobalConfig {
            __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
}
declare const self: ServiceWorkerGlobalScope;

const writeQueue = new BackgroundSyncPlugin("tara-writes-queue", {
    async onSync({ queue }) {
        await queue.replayRequests();
        const clients = await self.clients.matchAll();
        for (const client of clients) client.postMessage({type: "tara-queue-synced"})
    }
});

const apiOverrides = [
    {
        matcher: ({ sameOrigin, url }: { sameOrigin: boolean; url: URL }) =>

            sameOrigin && 
            (url.pathname === "/api/dashboard/" || url.pathname === "/api/day-close/today"),
        method: "GET" as const,
        handler: new NetworkOnly(),
    },
    {
        matcher: ({ sameOrigin, url }: {sameOrigin: boolean; url: URL}) =>
            sameOrigin && 
            (url.pathname === "/api/sales/" || /^\/api\/products\/\d+\/adjust-stock$/.test(url.pathname)),
        method: "POST" as const,
        handler: new NetworkOnly({ plugins: [writeQueue]})
    }
]

const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    clientsClaim: true,
    navigationPreload: true,
    runtimeCaching: [...apiOverrides, ...defaultCache],
    fallbacks: {
        entries: [
            {
                url: "/~offline",
                matcher({request}) {
                    return request.destination === "document"
                },
            },
        ],
    },
});

serwist.addEventListeners()