# KT Photography

A responsive photography website, photographer workspace and private client galleries. Built with Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Supabase Auth/PostgreSQL/Storage, and Lucide.

## Run locally

Use Node.js 24 LTS (Node 22.13+ also supports the setup scripts).

```bash
npm ci
cp .env.example .env.local
# Fill in the values in .env.local.
npm run dev
```

Open http://localhost:3000. `/login` serves both the photographer and clients; the verified database role determines the destination. The development server also prints a local-network address for phone testing on the same Wi-Fi.

The supplied project is already configured locally and its migrations have been applied. Configuration, MCP credentials, passwords, test screenshots and local working files are excluded from Git. Nothing is pushed by the application or setup scripts.

## Environment

| Variable                               | Purpose                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase project API URL                                                        |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public publishable key or legacy anon key                                       |
| `SUPABASE_SECRET_KEY`                  | **Server only:** working secret key or legacy service-role key                  |
| `NEXT_PUBLIC_SITE_URL`                 | Canonical origin; localhost during development, your HTTPS domain in production |

Never add `NEXT_PUBLIC_` to the privileged key. The current project's retrieved modern secret key did not authenticate successfully, so the verified legacy service-role key is used locally. Neither key is committed. Rotate keys only if actually exposed; `.mcp.json` was untracked when this implementation began and is now ignored.

## Project layout

```text
src/
  app/
    (public)/                    Public landing page
    (auth)/                      Login and password management
    (admin)/admin/               Photographer workspace
    (client)/gallery/            Assigned client galleries
    api/                        Authorised photo endpoints and upload lifecycle
  components/
    admin/ gallery/ layout/ public/ ui/
  features/
    auth/ clients/ albums/ photos/ packages/
  lib/
    auth/ supabase/ utils/       Central session checks, provision gate, typed clients
  config/                       Business identity and formatting
  types/                        Generated database types and UI models
public/assets/                  Local brand assets, optimised images, fonts, optional music
supabase/migrations/             Versioned SQL schema and RLS
supabase/functions/              Authenticated storage maintenance
scripts/                        Secure admin bootstrap
tests/                          Live RLS/storage tests and browser integration flow
```

Server Actions verify the current user and database role on every mutation. Proxy refreshes cookies; it is not the authorisation boundary. Server-only modules protect privileged credentials from client bundles.

## Supabase setup on another project

1. Create a Supabase project. Apply the SQL migrations in `supabase/migrations` in filename order using the SQL Editor, or link the project with the Supabase CLI and run `supabase db push`.
2. Set the four environment values. Update the hostname in `next.config.ts` to the new project's Storage host for public package images.
3. In Authentication settings, turn **Allow new users to sign up** off, set the minimum password length to **12**, and use your production site URL. Keep email/password login enabled.
4. Deploy the function: `supabase functions deploy kt-storage-maintenance`. Its JWT verification stays enabled, and its implementation additionally verifies the live session, active admin role and completed initial password change.
5. Bootstrap the first admin with the script below.

The supplied MCP token lacks `auth_config_write` / `project_admin_write`, so the dashboard Auth toggles could not be changed automatically. **Public signup is nevertheless blocked:** a database trigger rejects every new Auth user without an expiring, one-use provisioning token created by the privileged server. The token is consumed transactionally and stripped from user metadata. No public API can read or create provisioning tokens. The dashboard toggle is recommended as an additional layer and avoids presenting an Auth error if somebody calls the signup API directly.

This gate applies to all account creation in this Supabase project. Use the application or bootstrap script rather than creating users directly in the Supabase Auth dashboard. Existing accounts are unaffected.

Supabase's managed leaked-password protection is disabled in this project; the supplied token cannot change Auth settings. The application enforces strong password rules. Check plan eligibility before enabling the optional managed feature in the dashboard; see [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## First admin

```bash
npm run bootstrap:admin
```

The terminal asks for the admin's email, name and an initial password without echoing it. The password must contain at least 12 characters, uppercase, lowercase and a number. Existing accounts are never overwritten or promoted automatically. For controlled noninteractive setup, set `KT_ADMIN_EMAIL`, `KT_ADMIN_NAME` and `KT_ADMIN_PASSWORD` in the process environment; avoid shell history containing real credentials.

Sign in at `/login`. Each new admin must change the initial password before accessing the studio. Local admin access notes are stored in the Git-ignored `.local/` directory. Delete each access note after setting a personal password; never commit credentials.

## Client workflow

1. Admin signs in and opens **Clients**.
2. Enter the client's name, email and initial password. The protected server operation creates an email-confirmed Auth account, then its client profile. Only Supabase Auth stores the password hash; no application table stores passwords.
3. Share `/login`, the email and initial password privately, for example on WhatsApp. No message or email is sent by the application.
4. Create an album assigned to that client. Album ownership is fixed after creation, avoiding accidental sharing with a different client.
5. Upload JPG, PNG or WebP photographs. Uploads are sequential with per-file progress and errors, up to 100 files per batch and 25 MB per photo.
6. The client changes the initial password, then sees their own paginated albums. They can preview, navigate and download individual originals.
7. Use a client's profile to update their name/email, disable access, or manually reset their password. Resetting forces another password change and may invalidate their session. Share the new password manually.

Inside an album, open a photograph's **three-dot menu → Make cover image** to choose the thumbnail shown on the client's gallery home. It saves immediately; a **Cover** badge identifies the selected photo, and Album details keeps a preview. Saving the title or description preserves the cover. If the selected photograph is deleted, the first remaining photo becomes the cover.

Drag a photo's handle to rearrange it on desktop. On mobile, hold the handle briefly, then drag; the rest of the photo remains available for normal scrolling. Keyboard users can focus the handle, press Space, use arrow keys, then Space to save or Escape to cancel. Moves update immediately and save automatically; failed saves restore the previous order. The client's gallery uses the same saved order. For a move across album pages, use **three-dot menu → Move to position…**; numbers apply across the whole album. New uploads append after existing photos. Album photos stay private; choosing a cover does not publish one on the public landing page.

Public packages can be added, edited or hidden in **Collections**, including their images. The original five collections and exact prices/inclusions are seeded from the supplied Google Sites reference. Public pages refresh every two minutes and immediately when saved through the studio.

The public collection planner includes the reference's three-step finder, selectable package cards, coverage calculator, second-photographer options, client/event details and official quotation estimate. Clients can print/save the estimate as a PDF, copy it, or open a prefilled WhatsApp message to Kannan. Quotes stay in browser memory and do not create a booking or send anything automatically. Full/mobile planner previews, package guidance, all reference pricing FAQs and the original KT hero artwork are included. See [the reference audit](docs/reference-parity.md).

## Image storage and access

- `client-photos` is private. Originals and optimised 1200-pixel WebP previews live under `<client UUID>/<album UUID>/`.
- `public-assets` holds optional public package images and has an 8 MB upload limit.
- Original bytes are retained. The server checks decoded image formats, sizes and pixel limits before adding database metadata; images masquerading as supported formats are rejected.
- Admin-only upload preparation generates a signed upload URL and a separate HMAC-protected completion ticket. Database upload jobs claim completion once, preventing concurrent/repeated completion from deleting an existing photo.
- Gallery pages generate 60-second preview links in one batch using the caller's RLS-protected Supabase client. Images load directly from private Storage without an app-server request per photo. An expired preview falls back to its authenticated endpoint to recheck current access. Download endpoints check the caller and RLS, then generate 60-second signed URLs for originals. Private files use zero-second object cache TTL; private application routes send `no-store`.
- RLS checks client ownership, active access and completed password change for albums, photographs and Storage. Clients cannot edit ownership, roles or profile security flags.
- Disabling access rejects new requests immediately. Previously issued signed URLs can remain usable until their expiry; already downloaded files cannot be recalled.
- Deleting photos/albums removes storage objects first and metadata afterward. Deletion is confirmed in the UI.
- **Clean incomplete uploads** calls the deployed `kt-storage-maintenance` Edge Function. It inspects at most 100 jobs per invocation, waits three hours (beyond the signed upload URL lifetime), and removes only files with no live photo/package references. It also clears expired provisioning tickets. No scheduler or paid service is required.

## Validation

```bash
npm run typecheck
npm run lint
npm run build
npm test
# Run a local server before this command; Chrome must be installed.
npm run test:e2e
npm run test:photos
# Optional: TEST_BASE_URL=http://localhost:3001 for a production server.
npm audit --omit=dev
```

`npm test` creates isolated temporary users, albums and images in the configured project, verifies cross-client isolation, self-promotion rejection, initial-password gates, access revocation, anonymous package visibility and blocked signup, then removes test data. `test:e2e` additionally runs the real browser/server-action flow: admin login, account creation, upload, password change, previews, downloads, tampered URLs, revocation, password reset and storage deletion. Test artifacts are stored under ignored `.local/`.

Production dependencies currently audit clean. The current Next ESLint toolchain inherits the unpatched `braces <=3.0.3` advisory through `fast-glob`/`micromatch`; it affects development tooling and is not shipped in the app's production runtime. Do not accept npm's proposed downgrade to an incompatible old Next ESLint config. Recheck when a patched upstream version is available.

## Vercel deployment

The code is ready to import into Vercel. Production hosting requires the environment values below.

1. Create a Vercel project using this directory with the Vercel CLI (`vercel`), or import this GitHub repository. Select the Next.js framework.
2. Set all four environment variables for the intended environments. Use the actual HTTPS origin as `NEXT_PUBLIC_SITE_URL` and the secret only in `SUPABASE_SECRET_KEY`.
3. Use the linked Supabase project with the migrations and Edge Function already installed. Set its site URL to the production origin, disable public signup and set password minimum length to 12 in the Supabase dashboard.
4. Run `npm run build`, then deploy with `vercel --prod` when ready. Test admin/client login and private downloads on the deployed domain.

Upload bytes go directly to Supabase, avoiding Vercel request-body limits. The completion route downloads the original server-side to validate it and produce a preview and allows up to 60 seconds; for much larger files or sustained bulk work, move that processing into a queue/background worker. Keep the first version's 25 MB limit.

`vercel.json` runs functions in Sydney (`syd1`), matching the supplied Supabase project's `ap-southeast-2` region. When moving to another database region, update this setting to the nearest Vercel region. Public pages retain their two-minute cache; private pages and live account checks remain uncached. Server Actions return revalidated page data without a redundant client refresh.

## Scope

No email notifications, OTP/magic links, public registration, payment gateway or booking system. WhatsApp enquiry links are user-initiated. Optional reference music plays only after user interaction. Individual downloads are supported; zip downloads, selections and photo editing are future enhancements.

The supplied repositories contain a small image collection. The website reuses those available assets; replace or expand the public showcase with approved full client shoots when available. See `ASSETS.md` for provenance.
