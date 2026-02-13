export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return corsResponse();
    }

    const url = new URL(request.url);
    let path = url.pathname.replace(/^\/+/, "");

    if (!path) {
      return new Response(
        "Usage:\n" +
        "/raw/owner/repo/branch[/filepath] → raw files\n" +
        "/pages/owner/repo[/subpath] → Project Pages (owner.github.io/repo)\n" +
        "/gh-pages/owner/repo[/subpath] → همان Project Pages\n" +
        "/io/username[/subpath] → User/Organization Pages (username.github.io)\n",
        { 
          status: 400,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        }
      );
    }

    let targetUrl;

    if (path.startsWith("pages/") || path.startsWith("gh-pages/")) {
      const parts = path.split("/").slice(1); 
      if (parts.length < 2) {
        return new Response("Invalid Project Pages path. Need owner and repo.", { status: 400 });
      }
      const owner = parts[0];
      const repo = parts[1];
      let subPath = parts.slice(2).join("/");
      
      targetUrl = `https://${owner}.github.io/${repo}/${subPath}`;
      
      if (!subPath) {
        targetUrl += "/";
      }
    }
    else if (path.startsWith("io/")) {
      const parts = path.split("/").slice(1); 
      if (parts.length < 1) {
        return new Response("Invalid User Pages path. Need username.", { status: 400 });
      }
      const owner = parts[0];
      let subPath = parts.slice(1).join("/");
      
      targetUrl = `https://${owner}.github.io/${subPath}`;
      
      if (!subPath) {
        targetUrl += "/";
      }
    }
    else if (path.startsWith("raw/")) {
      const parts = path.split("/").slice(1);
      if (parts.length < 3) {
        return new Response("Invalid raw path. Need owner/repo/branch[/file].", { status: 400 });
      }
      
      const [owner, repo, branch, ...filePathParts] = parts;
      const filePath = filePathParts.join("/");

      const validPattern = /^[a-zA-Z0-9._-]+$/;
      if (!validPattern.test(owner) || !validPattern.test(repo) || !validPattern.test(branch)) {
        return new Response("Invalid characters in owner/repo/branch.", { status: 400 });
      }

      targetUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
    }
    else {
      return new Response("Unknown prefix or invalid path.", { status: 400 });
    }

    const cache = caches.default;
    let response = await cache.match(targetUrl);

    if (!response) {
      try {
        response = await fetch(targetUrl, {
          headers: { "User-Agent": "Cloudflare-Worker-GitHub-Proxy" }
        });

        if (response.status === 200 || response.status === 404) {
          const cloned = response.clone();
          const headers = new Headers(cloned.headers);

          if (targetUrl.endsWith(".html") || targetUrl.endsWith(".htm")) {
            headers.set("Content-Type", "text/html; charset=utf-8");
          }

          headers.set("Cache-Control", "public, max-age=3600");

          ctx.waitUntil(
            cache.put(targetUrl, new Response(cloned.body, {
              status: cloned.status,
              statusText: cloned.statusText,
              headers
            }))
          );
        }
      } catch (err) {
        return new Response("Fetch failed from GitHub", { status: 502 });
      }
    }

    const finalHeaders = new Headers(response.headers);
    finalHeaders.set("Access-Control-Allow-Origin", "*");
    finalHeaders.set("Access-Control-Expose-Headers", "*");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: finalHeaders
    });
  }
};

function corsResponse() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Max-Age": "86400",
      "Access-Control-Allow-Headers": "*",
    }
  });
}
