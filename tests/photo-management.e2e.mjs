import assert from 'node:assert/strict';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { chromium, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { provisionAccount } from '../scripts/provision-account.mjs';
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);
const signedClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false } },
  );
const password = `Order1-${randomUUID()}`,
  users = [],
  paths = [],
  errors = [];
let albumId, browser;
async function user(role) {
  const email = `kt-order-${randomUUID()}@example.invalid`;
  const value = await provisionAccount(service, {
    email,
    password,
    full_name: `Order test ${role}`,
  });
  users.push(value.id);
  assert.ifError(
    (
      await service.from('profiles').insert({
        id: value.id,
        email,
        full_name: `Order test ${role}`,
        role,
        must_change_password: false,
      })
    ).error,
  );
  return { id: value.id, email };
}
async function signIn(page, email) {
  await page.goto(`${base}/login`);
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in to my gallery' }).click();
  await page.waitForURL(/\/(admin|gallery)$/);
}
async function expectFirst(page, filename) {
  await expect(
    page.locator('.photo-grid article').first().locator('.photo-tile-footer > span'),
  ).toHaveText(filename, { timeout: 15000 });
}
async function options(page, filename) {
  await page.getByRole('button', { name: `Photo options: ${filename}`, exact: true }).click();
}
async function movePosition(page, filename, position) {
  await options(page, filename);
  await page.getByRole('button', { name: 'Move to position…', exact: true }).click();
  await page.getByLabel(`Position for ${filename}`, { exact: true }).fill(String(position));
  await page.getByRole('button', { name: `Move ${filename} to position`, exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Photo order saved' }).waitFor();
}
async function drag(page, filename, target) {
  const handle = page.getByRole('button', { name: `Drag to reorder ${filename}`, exact: true });
  await expect(handle).toBeEnabled();
  await handle.scrollIntoViewIfNeeded();
  const from = await handle.boundingBox();
  const to = await page
    .getByRole('button', { name: `Drag to reorder ${target}`, exact: true })
    .boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2, { steps: 3 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 15 });
  await page.mouse.up();
}
try {
  const admin = await user('admin'),
    client = await user('client');
  const created = await service
    .from('albums')
    .insert({ client_id: client.id, title: 'Photo controls test' })
    .select()
    .single();
  assert.ifError(created.error);
  albumId = created.data.id;
  const bytes = await sharp({
    create: { width: 60, height: 50, channels: 3, background: '#ba995f' },
  })
    .webp()
    .toBuffer();
  const rows = [];
  for (let i = 1; i <= 26; i++) {
    const filename = `photo-${String(i).padStart(2, '0')}.webp`;
    const path = `${client.id}/${albumId}/${filename}`;
    paths.push(path);
    rows.push({
      album_id: albumId,
      filename,
      storage_path: path,
      thumbnail_path: path,
      file_size: bytes.length,
      width: 60,
      height: 50,
    });
  }
  for (let index = 0; index < paths.length; index += 6) {
    await Promise.all(
      paths.slice(index, index + 6).map(async (path) => {
        assert.ifError(
          (
            await service.storage
              .from('client-photos')
              .upload(path, bytes, { contentType: 'image/webp', cacheControl: '0' })
          ).error,
        );
      }),
    );
  }
  const inserted = await service.from('photos').insert(rows).select();
  assert.ifError(inserted.error);
  const photos = inserted.data.sort((a, b) => a.display_order - b.display_order);
  assert.deepEqual(
    photos.map((p) => p.display_order),
    Array.from({ length: 26 }, (_, i) => i),
  );
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const adminPage = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  adminPage.on('pageerror', (e) => errors.push(e.message));
  await signIn(adminPage, admin.email);
  await adminPage.goto(`${base}/admin/albums/${albumId}?page=2`);
  await options(adminPage, 'photo-26.webp');
  await adminPage.getByRole('button', { name: 'Make cover image', exact: true }).click();
  await adminPage.getByRole('status').filter({ hasText: 'Album cover saved' }).waitFor();
  await expect(adminPage.locator('[aria-label="Current cover: photo-26.webp"]')).toBeVisible();
  assert.equal(
    (await service.from('albums').select('cover_image_path').eq('id', albumId).single()).data
      .cover_image_path,
    photos[25].thumbnail_path,
  );
  await adminPage.getByLabel('Title', { exact: true }).fill('Photo controls saved');
  await adminPage.getByRole('button', { name: 'Save changes', exact: true }).click();
  await adminPage.getByRole('status').filter({ hasText: 'Album saved' }).waitFor();
  await adminPage.reload();
  await expect(adminPage.locator('[aria-label="Current cover: photo-26.webp"]')).toBeVisible();
  await adminPage.getByAltText('Current album cover').evaluate((img) => img.decode());
  console.log(
    'PASS: Second-page cover selection saves immediately and survives detail edits/reloads.',
  );
  await movePosition(adminPage, 'photo-26.webp', 1);
  await adminPage.goto(`${base}/admin/albums/${albumId}`);
  await expectFirst(adminPage, 'photo-26.webp');
  const imageRequests = [];
  const recordImage = (request) => {
    if (request.url().includes('/api/photos/')) imageRequests.push(request.url());
  };
  adminPage.on('request', recordImage);
  await adminPage.reload();
  await adminPage.locator('.photo-grid img').evaluateAll(async (images) => {
    await Promise.all(
      images.map((image) => {
        image.loading = 'eager';
        return image.decode();
      }),
    );
  });
  assert.equal(imageRequests.length, 0, 'Preview links are batched; no individual API requests.');
  assert.match(
    await adminPage.locator('.photo-grid img').first().getAttribute('src'),
    /\/storage\/v1\/object\/sign\//,
  );
  adminPage.off('request', recordImage);
  assert.equal(
    await adminPage.getByRole('button', { name: /Move .* earlier|Move .* later/ }).count(),
    0,
  );
  await options(adminPage, 'photo-26.webp');
  await adminPage.keyboard.press('Escape');
  await expect(
    adminPage.getByRole('button', { name: 'Photo options: photo-26.webp', exact: true }),
  ).toHaveAttribute('aria-expanded', 'false');
  await drag(adminPage, 'photo-26.webp', 'photo-01.webp');
  await adminPage.getByRole('status').filter({ hasText: 'Photo order saved' }).waitFor();
  assert.equal(
    (
      await service
        .from('photos')
        .select('filename')
        .eq('album_id', albumId)
        .order('display_order')
        .limit(1)
        .single()
    ).data.filename,
    'photo-01.webp',
  );
  await expectFirst(adminPage, 'photo-01.webp');
  const handle = adminPage.getByRole('button', {
    name: 'Drag to reorder photo-26.webp',
    exact: true,
  });
  await handle.focus();
  await adminPage.keyboard.press('Space');
  await expect(adminPage.locator('.photo-drag-overlay')).toBeVisible();
  await adminPage.keyboard.press('ArrowLeft');
  await expect(adminPage.locator('[id^="DndLiveRegion"]')).toContainText(
    `was moved over droppable area ${photos[0].id}`,
  );
  await adminPage.keyboard.press('Space');
  await adminPage.getByRole('status').filter({ hasText: 'Photo order saved' }).waitFor();
  await expectFirst(adminPage, 'photo-26.webp');
  await adminPage.route(`${base}/admin/albums/${albumId}`, (route) => {
    if (route.request().method() === 'POST')
      return route.fulfill({ status: 500, body: 'Temporary save failure' });
    return route.continue();
  });
  await drag(adminPage, 'photo-26.webp', 'photo-01.webp');
  await expect(adminPage.locator('.photo-management-heading [role="alert"]')).toContainText(
    'Unable to save',
  );
  await expectFirst(adminPage, 'photo-26.webp');
  await adminPage.unroute(`${base}/admin/albums/${albumId}`);
  await drag(adminPage, 'photo-26.webp', 'photo-02.webp');
  await adminPage.getByRole('status').filter({ hasText: 'Photo order saved' }).waitFor();
  await adminPage.reload();
  await expectFirst(adminPage, 'photo-01.webp');
  console.log(
    'PASS: Batched previews, three-dot menu, cross-page moves, mouse/keyboard dragging and persistence.',
  );
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  mobile.on('pageerror', (error) => errors.push(error.message));
  await signIn(mobile, admin.email);
  await mobile.goto(`${base}/admin/albums/${albumId}`);
  await movePosition(mobile, 'photo-26.webp', 1);
  await expectFirst(mobile, 'photo-26.webp');
  const touchHandle = mobile.getByRole('button', {
    name: 'Drag to reorder photo-26.webp',
    exact: true,
  });
  await touchHandle.scrollIntoViewIfNeeded();
  const from = await touchHandle.boundingBox();
  const to = await mobile
    .getByRole('button', { name: 'Drag to reorder photo-01.webp', exact: true })
    .boundingBox();
  const cdp = await mobile.context().newCDPSession(mobile);
  const start = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
  const end = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
  await new Promise((resolve) => setTimeout(resolve, 250));
  for (let step = 1; step <= 12; step++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        {
          x: start.x + ((end.x - start.x) * step) / 12,
          y: start.y + ((end.y - start.y) * step) / 12,
        },
      ],
    });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await mobile.getByRole('status').filter({ hasText: 'Photo order saved' }).waitFor();
  await expectFirst(mobile, 'photo-01.webp');
  await movePosition(mobile, 'photo-26.webp', 1);
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth), 390);
  await options(mobile, 'photo-26.webp');
  const menuBounds = await mobile.locator('.photo-options-menu').boundingBox();
  assert.ok(menuBounds.x >= 0 && menuBounds.x + menuBounds.width <= 390);
  fs.mkdirSync('.local', { recursive: true });
  await mobile.locator('img').evaluateAll(async (images) => {
    await Promise.all(
      images.map((image) => {
        image.loading = 'eager';
        return image.decode();
      }),
    );
  });
  await mobile.evaluate(() => document.activeElement?.blur());
  await mobile.screenshot({
    path: '.local/photo-controls-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  await mobile.close();
  const clientPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  clientPage.on('pageerror', (e) => errors.push(e.message));
  await signIn(clientPage, client.email);
  await clientPage
    .getByRole('link', { name: /Photo controls saved/ })
    .locator('img')
    .evaluate((img) => img.decode());
  await clientPage.getByRole('link', { name: /Photo controls saved/ }).click();
  await expectFirst(clientPage, 'photo-26.webp');
  let expiredPreview = false,
    fallbackRequests = 0;
  const signedPattern = '**/storage/v1/object/sign/client-photos/**';
  await clientPage.route(signedPattern, (route) => {
    if (!expiredPreview && new URL(route.request().url()).pathname.endsWith('/photo-02.webp')) {
      expiredPreview = true;
      return route.fulfill({ status: 403, body: 'Expired preview link' });
    }
    return route.continue();
  });
  const fallbackListener = (request) => {
    if (request.url() === `${base}/api/photos/${photos[1].id}`) fallbackRequests++;
  };
  clientPage.on('request', fallbackListener);
  await clientPage.reload();
  const expiredImage = clientPage.getByAltText('photo-02.webp', { exact: true });
  await expiredImage.scrollIntoViewIfNeeded();
  await expect(expiredImage).toHaveAttribute('src', `/api/photos/${photos[1].id}`);
  await expiredImage.evaluate((image) => image.decode());
  assert.ok(
    expiredPreview && fallbackRequests > 0,
    'Expired signed preview safely falls back to an authorized request.',
  );
  await clientPage.unroute(signedPattern);
  clientPage.off('request', fallbackListener);
  assert.equal(
    await clientPage.getByRole('button', { name: /Use as cover|Move .*earlier/ }).count(),
    0,
  );
  const owner = signedClient();
  assert.ifError((await owner.auth.signInWithPassword({ email: client.email, password })).error);
  assert.ok(
    (await owner.rpc('move_album_photo', { p_photo_id: photos[25].id, p_target_position: 9 }))
      .error,
  );
  await owner.auth.signOut();
  console.log(
    'PASS: Touch dragging, mobile menu layout, assigned-client cover/order, and mutation rejection.',
  );
  // Concurrent moves and an append must never lose a photo or reuse an order position.
  const adminDb = signedClient();
  assert.ifError((await adminDb.auth.signInWithPassword({ email: admin.email, password })).error);
  const moved = await Promise.all([
    adminDb.rpc('move_album_photo', { p_photo_id: photos[0].id, p_target_position: 25 }),
    adminDb.rpc('move_album_photo', { p_photo_id: photos[1].id, p_target_position: 0 }),
    service.from('photos').insert({
      ...rows[0],
      filename: 'append.webp',
      storage_path: `${client.id}/${albumId}/append.webp`,
      thumbnail_path: `${client.id}/${albumId}/append-preview.webp`,
    }),
  ]);
  for (const result of moved) assert.ifError(result.error);
  const result = await service
    .from('photos')
    .select('id,display_order')
    .eq('album_id', albumId)
    .order('display_order');
  assert.ifError(result.error);
  assert.equal(result.data.length, 27);
  assert.deepEqual(
    result.data.map((p) => p.display_order),
    Array.from({ length: 27 }, (_, i) => i),
  );
  await adminDb.auth.signOut({ scope: 'local' });
  assert.deepEqual(errors, []);
  console.log('PASS: Concurrent reorders/uploads retain every photo with unique order positions.');
  await adminPage.reload();
  await options(adminPage, 'photo-26.webp');
  await adminPage
    .locator('article')
    .filter({ has: adminPage.getByRole('button', { name: 'Preview photo-26.webp', exact: true }) })
    .getByRole('button', { name: 'Delete photograph' })
    .click();
  await adminPage.getByRole('button', { name: 'Delete permanently', exact: true }).click();
  await adminPage
    .getByRole('button', { name: 'Preview photo-26.webp', exact: true })
    .waitFor({ state: 'detached' });
  const remainingFirst = await service
    .from('photos')
    .select('thumbnail_path')
    .eq('album_id', albumId)
    .order('display_order')
    .limit(1)
    .single();
  assert.equal(
    (await service.from('albums').select('cover_image_path').eq('id', albumId).single()).data
      .cover_image_path,
    remainingFirst.data.thumbnail_path,
  );
  console.log(
    'PASS: Deleting the selected cover automatically uses the next remaining photograph.',
  );
} finally {
  await browser?.close();
  if (paths.length)
    assert.ifError((await service.storage.from('client-photos').remove(paths)).error);
  if (albumId) assert.ifError((await service.from('albums').delete().eq('id', albumId)).error);
  for (const id of users) assert.ifError((await service.auth.admin.deleteUser(id)).error);
}
