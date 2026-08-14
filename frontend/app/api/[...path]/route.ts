import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function proxy(req: NextRequest) {
  // Strip /api prefix to get the actual backend path, preserving trailing slash
  const backendPath = req.nextUrl.pathname.replace(/^\/api/, "");
  const url = `${BACKEND}${backendPath}${req.nextUrl.search}`;

  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    if (key !== "host" && key !== "content-length") {
      headers[key] = value;
    }
  });

  try {
    const init: RequestInit = {
      method: req.method,
      headers,
      cache: "no-store",
      // Never auto-follow: undici crashes replaying an ArrayBuffer body
      // across a redirect, and a followed redirect would otherwise leak
      // the backend's internal URL straight to the browser.
      redirect: "manual",
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      init.body = await req.arrayBuffer();
    }

    const upstream = await fetch(url, init);

    if (upstream.type === "opaqueredirect" || (upstream.status >= 300 && upstream.status < 400)) {
      console.error("PROXY_UNEXPECTED_REDIRECT", url);
      return NextResponse.json(
        { detail: "Server is warming up. Please try again in a few seconds." },
        { status: 503 }
      );
    }

    const body = await upstream.arrayBuffer();

    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (e) {
    console.error("PROXY_ERROR", e);
    return NextResponse.json(
      { detail: "Server is warming up. Please try again in a few seconds." },
      { status: 503 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
