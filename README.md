# Recovery Assistant

A secure, free account-recovery and password-hygiene web app built on Next.js.

It helps people **get back into their own accounts the safe way** — by
re-proving ownership and setting a new password — and keep their passwords in
an encrypted vault. It deliberately does **not** retrieve, reveal, or "recover"
anyone's existing password, because that cannot be done safely: real services
store passwords as one-way hashes precisely so they can't be read back.

## What it does

- **Breach exposure check** — check whether a password appears in known
  breaches using Have I Been Pwned's [k-anonymity range API](https://haveibeenpwned.com/API/v3#PwnedPasswords).
  The password is SHA-1 hashed in the browser and only the first 5 hex
  characters of the hash are sent to the server, which forwards only that
  prefix. The password never leaves the device.
- **Email exposure check** — see which breaches *your own* account email showed
  up in (optional; needs a HIBP API key). You can only check the email on your
  own signed-in account — it is not a lookup tool for arbitrary addresses.
- **Password reset by email** — request a one-time, expiring link sent to the
  address on your account, then set a new password. The old one is never shown.
- **Encrypted password vault** — store your own passwords, encrypted in the
  browser (PBKDF2 → AES-GCM) with a master key that never leaves your device.
  The server stores only ciphertext it cannot read.
- **Show / hide toggle** on every password field.
- **Local email history** — remembers *your own* emails in your browser so you
  don't retype them. Never sent to the server.
- **Recovery wizard** — links straight to each major provider's official
  recovery flow, plus a recovery-readiness checklist.
- **Owner monitoring panel** — security telemetry (sign-ins, failed logins,
  resets, rate-limit hits) for abuse monitoring. By design it **cannot** show
  users' saved passwords (they're encrypted on the user's device) or let anyone
  sign in as a user.
- **Free** — no plans, no paywalls.

## Security model (what we can and cannot see)

| Data | Where it lives | Can the server/owner read it? |
|------|----------------|-------------------------------|
| Account login password | scrypt hash, salted | No — one-way hash |
| Saved vault passwords | AES-GCM ciphertext | No — decrypted only in your browser |
| Reset tokens | SHA-256 hash, single-use, 1h expiry | No — only the hash is stored |
| Security events | plain telemetry | Yes — type, time, email, IP (no secrets) |

The owner panel monitors for violations; it does not grant access to users'
secrets. That separation is enforced by the encryption, not by policy.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. The **first account created becomes the owner**
(admin) so you can reach `/admin`.

### Configuration (environment variables)

All optional for local development; set them in production.

| Variable | Purpose |
|----------|---------|
| `SESSION_SECRET` | HMAC secret for session cookies. **Required in production.** |
| `APP_URL` | Base URL used in reset links (e.g. `https://example.com`). |
| `DATA_DIR` | Where the JSON datastore lives (default `./.data`). |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE` | Real email delivery via SMTP. Without these, reset links are logged to the server console (dev mode). Requires `npm i nodemailer`. |
| `HIBP_API_KEY` | Enables the email-exposure check. Without it, only the free password check works. |

### Network allowlist (production)

The breach features call out to Have I Been Pwned. If your host restricts
outbound traffic, allow:

- `api.pwnedpasswords.com` (free password check)
- `haveibeenpwned.com` (email check, only if `HIBP_API_KEY` is set)

## Data storage

Out of the box this uses a simple JSON file store (`src/lib/server/store.ts`)
so it runs with zero external services. For production, swap that module for a
real database — the function surface is intentionally small. User records hold
only a password **hash**, a role, and an opaque encrypted vault blob.

## Scripts

- `npm run dev` — development server
- `npm run build` / `npm start` — production
- `npm run lint`, `npm run typecheck`, `npm run check`

## Tech

Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · base-ui · lucide-react.
Scaffolded from the
[ai-website-cloner-template](https://github.com/JCodesMore/ai-website-cloner-template).

## License

MIT.
