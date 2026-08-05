import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Tara POS",
        short_name: "Tara",
        description: "Point of Sale for your shop",
        start_url: "/",
        id: '/',
        display: "standalone",
        background_color: "#fdf6ec",
        theme_color: "#16a34a",
        icons: [
            { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
            {
                src: "/icon-maskable-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
            },
        ],

    }
}