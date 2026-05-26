# Public Stable Link

The `192.168.0.102:4305` link is only for the same office/Wi-Fi network. Phones or PCs outside that network cannot open it reliably.

For a public stable link, deploy this folder to Vercel and connect Upstash Redis. After that, staff can open the Vercel URL from any PC or phone.

## What Is Ready

- Next.js project tracker app
- No login screen
- Shared data API at `/api/programme`
- Redis storage support for public hosting
- Local PC storage fallback for office LAN testing
- Excel, PDF, and Print export buttons

## What Vercel Needs

Add these environment variables in the Vercel project:

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

The app also accepts Vercel KV style names if the integration provides them:

```text
KV_REST_API_URL
KV_REST_API_TOKEN
```

## Deployment Steps

1. Put this `work-programme-web-app` folder into a GitHub repository.
2. In Vercel, create a new project from that GitHub repository.
3. Keep the framework as `Next.js`.
4. Add the Upstash Redis integration from Vercel Marketplace.
5. Confirm the Redis environment variables are present.
6. Deploy.
7. Use the production Vercel URL as the stable staff link.

## Important

Because login has been removed, anyone with the public link can edit the tracker. If the public link should be private, add login or password protection before sharing it widely.
