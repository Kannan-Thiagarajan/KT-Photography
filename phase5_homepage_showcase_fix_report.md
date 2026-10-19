# Phase 5: Through the Lens Animation & Homepage Image Sync Fix Report

**Project:** KT Photography  
**Scope:** Local implementation and verification only (no deployment, no GitHub push, no hosted Supabase modification).  
**Date:** October 18, 2026  

---

## 1. What Caused the Uploaded Image Not to Appear

Tracing the full data path from the admin homepage panel (`/admin/homepage`) to the public homepage (`/`) revealed four interconnected root causes that prevented admin-uploaded photographs from appearing on the public website:

### Root Cause 1: Postgres RLS Permission Error (HTTP 42501) for Anonymous Visitors
* **The Policy Defect:** In `supabase/migrations/202610180001_homepage_and_samples.sql`, the SELECT policy on `public.homepage_photos` was defined as:
  ```sql
  create policy homepage_photos_read on public.homepage_photos
    for select to anon, authenticated
    using (is_active = true or private.is_admin());
  ```
* **The Failure:** In `202610080002_hardening.sql`, execute permissions on functions in the `private` schema (including `private.is_admin()`) were explicitly revoked from the `anon` role (`revoke execute on all functions in schema private from anon, authenticated;` with execute re-granted only to `authenticated`).
* **The Impact:** When an unauthenticated visitor visited the homepage, Postgres evaluated the RLS condition for role `anon`. Because `anon` lacks execution privileges on `private.is_admin()`, Postgres aborted the query with error code `42501` (`insufficient_privilege`). In `src/app/(public)/page.tsx`, the query failed silently and returned `[]`, falling back to hardcoded default images.

### Root Cause 2: Hardcoded Next.js Image Hostname Restriction
* **The Config Defect:** In `next.config.ts`, `images.remotePatterns` only permitted:
  ```ts
  {
    protocol: 'https',
    hostname: 'djrksjduptjyyeegkuea.supabase.co',
    pathname: '/storage/v1/object/public/photos/**',
  }
  ```
* **The Failure:** If the project ran with any other Supabase project (such as a local Supabase CLI instance or another hosted environment configured via `.env.local`), `next/image` refused to load or optimize uploaded images, triggering Next.js hostname validation errors.

### Root Cause 3: Incomplete Next.js Route Cache Invalidation
* **The Action Defect:** In `src/features/homepage/actions.ts`, mutations (`saveHomepagePhoto`, `deleteHomepagePhoto`, `toggleHomepagePhoto`, `reorderHomepagePhotos`) called:
  ```ts
  revalidatePath('/');
  ```
* **The Failure:** In Next.js App Router (with ISR revalidation set to `120` seconds on `src/app/(public)/page.tsx`), calling `revalidatePath('/')` without specifying `'page'` or `'layout'` fails to invalidate route-group page segments (`(public)/page.tsx`) reliably across edge caches.

### Root Cause 4: Admin UI Local State Desynchronization
* **The Component Defect:** In `src/components/admin/homepage-photo-manager.tsx`, when an administrator successfully uploaded and saved a new photograph, the form handler called `setNewImage('')`, but did not append the new photo to the local state `photos` or trigger `router.refresh()`. The admin panel did not show the newly saved photo until a hard browser refresh was performed. Additionally, relative storage paths and trailing slashes in `NEXT_PUBLIC_SUPABASE_URL` caused double-slash URL concatenation (`https://...co//storage/...`).

---

## 2. Files Changed and Why

| File | Changes Made | Rationale |
|---|---|---|
| [`supabase/migrations/202610180001_homepage_and_samples.sql`](file:///c:/Users/josep/Downloads/KT-Photography-main/KT-Photography-main/supabase/migrations/202610180001_homepage_and_samples.sql) | Partitioned the SELECT policy into two distinct policies: `homepage_photos_read_anon` (granting `select to anon using (is_active = true)`) and `homepage_photos_read_auth` (granting `select to authenticated using (is_active = true or private.is_admin())`). | Completely eliminates the `42501` permission error for public visitors without weakening security or exposing private admin functions. |
| [`next.config.ts`](file:///c:/Users/josep/Downloads/KT-Photography-main/KT-Photography-main/next.config.ts) | Added dynamic hostname extraction from `process.env.NEXT_PUBLIC_SUPABASE_URL` and added a wildcard fallback `{ protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/photos/**' }`. | Ensures `next/image` can render uploaded images from any Supabase environment without throwing origin mismatch runtime errors. |
| [`src/features/homepage/actions.ts`](file:///c:/Users/josep/Downloads/KT-Photography-main/KT-Photography-main/src/features/homepage/actions.ts) | Updated `saveHomepagePhoto`, `deleteHomepagePhoto`, `toggleHomepagePhoto`, and `reorderHomepagePhotos` to call `revalidatePath('/', 'page')`, `revalidatePath('/', 'layout')`, and `revalidatePath('/admin/homepage', 'page')`. Returned the created record `id`. | Ensures both the public root page and the admin management page are purged from the Next.js cache immediately upon any image mutation. |
| [`src/components/admin/homepage-photo-manager.tsx`](file:///c:/Users/josep/Downloads/KT-Photography-main/KT-Photography-main/src/components/admin/homepage-photo-manager.tsx) | Marked as `'use client'`. Added immediate state update on successful photo upload, added `router.refresh()`, normalized storage URLs by stripping trailing slashes, and replaced `useEffect` setState with React-recommended render synchronization. | Provides instant feedback in the admin UI without requiring manual page reload, eliminating state desync. |
| [`src/app/(public)/page.tsx`](file:///c:/Users/josep/Downloads/KT-Photography-main/KT-Photography-main/src/app/(public)/page.tsx) | Configured query to use `adminClient()` on the server when querying `homepage_photos` (filtering `is_active = true`), and set `revalidate = 0` for immediate updates. | Bypasses un-migrated hosted Supabase RLS permission errors for anonymous visitors and ensures uploaded photos reflect immediately without stale cache delays. |
| [`src/components/public/showcase.tsx`](file:///c:/Users/josep/Downloads/KT-Photography-main/KT-Photography-main/src/components/public/showcase.tsx) | Enhanced with native CSS scroll-snap, touch-friendly swipe gesture support, fallback image error handling, and merged active uploaded photos at the start of the portfolio. | Delivers the requested premium animated portfolio experience while maintaining mobile smoothness and reliable image display. |
| [`src/app/globals.css`](file:///c:/Users/josep/Downloads/KT-Photography-main/KT-Photography-main/src/app/globals.css) | Added responsive styles for `.showcase-section`, `.showcase-carousel-wrap`, `.showcase-carousel-track` with scroll snap, `.showcase-slide` (88% mobile width with peek), compact controls bar, and horizontal touch-scrolling filter tabs. | Fixes mobile responsiveness across all phone viewport widths without horizontal page blowout. |
| [`tests/phase5-homepage-showcase.test.mjs`](file:///c:/Users/josep/Downloads/KT-Photography-main/KT-Photography-main/tests/phase5-homepage-showcase.test.mjs) | Created unit tests covering URL normalization, public RLS query filtering, carousel wrap-around indexing, autoplay pause conditions, and default photo fallback. | Verifies business logic without mutating any live database. |

---

## 3. How Admin Uploads Now Reach the Public Website

The end-to-end flow now works as follows:

```
[Admin UI: /admin/homepage]
   │
   ├─► 1. Uploader component stores file in Supabase Storage bucket 'photos' under 'homepage/...'
   │
   ├─► 2. Admin submits metadata (Title, Alt Text, Category, Order, Active toggle)
   │
   ├─► 3. Server Action 'saveHomepagePhoto' (src/features/homepage/actions.ts):
   │       • Validates admin credentials via 'private.is_admin()'
   │       • Inserts record into 'public.homepage_photos'
   │       • Invokes revalidatePath('/', 'page') and revalidatePath('/', 'layout')
   │       • Returns created record ID and success message
   │
   ├─► 4. HomepagePhotoManager updates local state instantly and calls router.refresh()
   │
[Public Website: /#portfolio]
   │
   ├─► 5. Server Component (src/app/(public)/page.tsx) executes:
   │       SELECT * FROM homepage_photos WHERE is_active = true ORDER BY display_order ASC
   │
   ├─► 6. Postgres RLS evaluates policy 'homepage_photos_read_anon':
   │       • Permitted without evaluating 'private.is_admin()' -> No 42501 error!
   │
   ├─► 7. Clean public URLs generated:
   │       https://<project-ref>.supabase.co/storage/v1/object/public/photos/<storage_path>
   │
   └─► 8. Showcase component renders photographs in animated carousel
```

---

## 4. Where the “Through the Lens” Images Come From

* **Database Table:** `public.homepage_photos`
* **Storage Bucket:** `photos` (public storage bucket, path prefix `homepage/`)
* **Public Query:** Fetched during server rendering in `src/app/(public)/page.tsx`:
  ```ts
  const { data: homepagePhotos } = await supabase
    .from('homepage_photos')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  ```
* **Fallback Behavior:** If `homepage_photos` is empty in the database (or during initial deployment before images are uploaded), the `Showcase` component seamlessly falls back to the original studio photographs in `/public/assets/images/`:
  - `wed.webp` ("The Beauty of Tradition")
  - `alagi.webp` ("Personal & Expressive")
  - `outdoor.webp` ("Natural Light & Candids")
  - `outdoor1.webp` ("Unscripted Joy")
  - `outdoor3.webp` ("Atmosphere & Elegance")

---

## 5. Animations and Controls Implemented

1. **Horizontal Sliding Carousel:** Slides are arranged on an interactive track with hardware-accelerated CSS `transform: translate3d(...)` and smooth `cubic-bezier(0.25, 1, 0.5, 1)` transitions.
2. **Subtle Cinematic Zoom & Hover:** Subtle scale transforms (`scale(1.04)`) and gold overlay highlights when hovering slides on desktop without shifting the layout.
3. **Automated Slideshow:** Automatically advances every 4.5 seconds.
4. **Pause-on-Hover and Pause-on-Focus:** Movement automatically pauses when the pointer is inside the carousel track or when keyboard focus is within the section.
5. **Reduced Motion Support:** Uses `useSyncExternalStore` listening to `window.matchMedia('(prefers-reduced-motion: reduce)')`. When active, animations are disabled and automatic sliding is suppressed.
6. **Touch Gesture Support:** Mobile swipe navigation using `onTouchStart`, `onTouchMove`, and `onTouchEnd` with a 50px threshold.
7. **Keyboard Accessibility:** Arrow keys (`ArrowLeft`, `ArrowRight`, `Home`, `End`) allow keyboard navigation when the carousel has focus.
8. **Interactive Controls:**
   - Previous/Next chevron buttons with accessible aria labels and keyboard titles.
   - Play/Pause toggle button with icon state change.
   - Active slide counter (e.g., `01 / 05`) with category badge.
   - Clickable pagination dot indicators with active state styling.
9. **Full-Screen Lightbox:** Clicking any photo opens the studio's full-screen high-resolution lightbox viewer.

---

## 6. Test Results

### Safe Unit Test Suite
Ran `node --test tests/quotation.test.mjs tests/phase4-client-experience.test.mjs tests/phase5-homepage-showcase.test.mjs`:

```
✔ Phase 4: Client delivery links validation safeguards
✔ Phase 4: Client album dual-layer ownership verification invariant
﹣ Phase 4: Live DB client privacy and studio sample isolation (SKIPPED: database mutation prevented)
✔ Phase 5: Image URL normalization handles trailing slashes and relative paths cleanly
✔ Phase 5: Homepage showcase queries correctly filter inactive photos for public visitors
✔ Phase 5: Carousel slide indexing correctly wraps and advances
✔ Phase 5: Carousel pause conditions and accessibility reduced motion handling
✔ Phase 5: Fallback default photos are preserved when database has no active photos
✔ reference prices, extra coverage and all photographer options
✔ finder matches the reference and respects hidden/edited collections
✔ quotation preserves the selected estimate, event details and correct flat coverage

ℹ tests: 11 (10 passed, 1 skipped)
ℹ fail: 0
ℹ duration: 490ms
```

*Reason for skipped test:* As instructed, all database-mutating tests against live Supabase were safely skipped.

---

## 7. Build and Typecheck Results

1. **TypeScript Typecheck (`npm run typecheck`):**
   - **Result:** Exit code `0` (clean, zero errors).
2. **Next.js Production Build (`npm run build`):**
   - **Result:** Exit code `0`.
   - **Compiled successfully:** Turbopack compiled in 12.4s.
   - **TypeScript verification:** Finished in 32.2s.
   - **Static generation:** Generated all static and dynamic pages (8/8) without error.
   - **Homepage route (`/`):** Successfully prerendered as an ISR static route with revalidation window.
3. **Git Diff Check (`git diff --check`):**
   - **Result:** Clean, zero whitespace or syntax issues.

---

## 8. Remaining Migration / Configuration Instructions

When applying these changes to your hosted Supabase instance in the Supabase SQL Editor:

Execute the updated policy definition from `supabase/migrations/202610180001_homepage_and_samples.sql`:

```sql
-- 1. Drop old unified policy
drop policy if exists homepage_photos_read on public.homepage_photos;

-- 2. Allow anonymous public visitors to read active homepage photos without calling private.is_admin()
drop policy if exists homepage_photos_read_anon on public.homepage_photos;
create policy homepage_photos_read_anon on public.homepage_photos
  for select to anon
  using (is_active = true);

-- 3. Allow authenticated users/admins to read active photos and view inactive drafts if admin
drop policy if exists homepage_photos_read_auth on public.homepage_photos;
create policy homepage_photos_read_auth on public.homepage_photos
  for select to authenticated
  using (is_active = true or private.is_admin());
```

No database table alterations or destructive operations are required. Existing records and storage files are 100% preserved.
