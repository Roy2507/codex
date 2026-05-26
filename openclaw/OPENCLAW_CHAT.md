# OpenClaw PHP Chat

This feature is intentionally separate from the existing `createTextEditor()` demo.

## Files

- `openclaw-chat.html`: standalone chat page
- `openclaw-chat.css`: standalone chat styles
- `openclaw-chat.js`: standalone chat browser logic
- `chat.php`: PHP proxy that calls OpenClaw Gateway

## Configure

Set these environment variables in the PHP runtime:

```bash
OPENCLAW_BASE_URL=http://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=your_gateway_token
OPENCLAW_AGENT_ID=main
OPENCLAW_MODEL=openclaw
OPENCLAW_SESSION_KEY=optional_fixed_session_key
```

`OPENCLAW_GATEWAY_TOKEN` is the shared Gateway token from OpenClaw's Gateway config, usually `gateway.auth.token` when `gateway.auth.mode` is `token`. `OPENCLAW_API_KEY` is also accepted by `chat.php` as a fallback name.

`OPENCLAW_SESSION_KEY` is optional. When omitted, `chat.php` sends the browser session id as the OpenResponses `user` value, and OpenClaw derives a stable session from it. When set, `chat.php` also sends `x-openclaw-session-key` for explicit session routing.

OpenClaw must have the OpenResponses-compatible HTTP endpoint enabled:

```js
{
  gateway: {
    http: {
      endpoints: {
        responses: {
          enabled: true
        }
      }
    }
  }
}
```

## Open the page

If your existing web server already serves this folder on port 80, open:

```text
http://127.0.0.1/openclaw/openclaw-chat.html
```

If you are using PHP's built-in development server, use a non-privileged port such as `8080`:

```bash
php -S 127.0.0.1:8080 -t C:\Web\www\codex
```

Then open:

```text
http://127.0.0.1:8080/openclaw/openclaw-chat.html
```
