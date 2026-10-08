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
      await service
        .from('profiles')
        .insert({
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
    assert.ifError(
      (
        await service.storage
          .from('client-photos')
          .upload(path, bytes, { contentType: 'image/webp', cacheControl: '0' })
      ).error,
    );
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
  await adminPage.getByRole('button', { name: 'Use as cover: photo-26.webp', exact: true }).click();
  await adminPage
    .getByRole('button', { name: 'Current cover: photo-26.webp', exact: true })
    .waitFor();
  assert.equal(
    (await service.from('albums').select('cover_image_path').eq('id', albumId).single()).data
      .cover_image_path,
    photos[25].thumbnail_path,
  );
  await adminPage.getByLabel('Title', { exact: true }).fill('Photo controls saved');
  await adminPage.getByRole('button', { name: 'Save changes', exact: true }).click();
  await adminPage.getByRole('status').filter({ hasText: 'Album saved' }).waitFor();
  await adminPage.reload();
  await adminPage
    .getByRole('button', { name: 'Current cover: photo-26.webp', exact: true })
    .waitFor();
  await adminPage.getByAltText('Current album cover').evaluate((img) => img.decode());
  console.log(
    'PASS: Second-page cover selection saves immediately and survives detail edits/reloads.',
  );
  await adminPage.getByLabel('Position for photo-26.webp', { exact: true }).fill('1');
  await adminPage
    .getByRole('button', { name: 'Move photo-26.webp to position', exact: true })
    .click();
  await adminPage.getByRole('status').filter({ hasText: 'Photo order saved' }).waitFor();
  await adminPage.goto(`${base}/admin/albums/${albumId}`);
  await expectFirst(adminPage, 'photo-26.webp');
  await adminPage.getByRole('button', { name: 'Move photo-26.webp later', exact: true }).click();
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
  await adminPage.getByRole('button', { name: 'Move photo-26.webp earlier', exact: true }).click();
  await adminPage.getByRole('status').filter({ hasText: 'Photo order saved' }).waitFor();
  await expectFirst(adminPage, 'photo-26.webp');
  await adminPage
    .getByRole('button', { name: 'Drag to reorder photo-26.webp', exact: true })
    .dragTo(
      adminPage
        .locator('article')
        .filter({
          has: adminPage.getByRole('button', { name: 'Preview photo-02.webp', exact: true }),
        }),
    );
  await adminPage.getByRole('status').filter({ hasText: 'Photo order saved' }).waitFor();
  await adminPage.reload();
  await expectFirst(adminPage, 'photo-01.webp');
  console.log(
    'PASS: Cross-page position moves, earlier/later arrows, desktop drag and persistence.',
  );
  await adminPage.setViewportSize({ width: 390, height: 844 });
  await adminPage.getByLabel('Position for photo-26.webp', { exact: true }).fill('1');
  await adminPage
    .getByRole('button', { name: 'Move photo-26.webp to position', exact: true })
    .click();
  await adminPage.getByRole('status').filter({ hasText: 'Photo order saved' }).waitFor();
  await expectFirst(adminPage, 'photo-26.webp');
  assert.equal(await adminPage.evaluate(() => document.documentElement.scrollWidth), 390);
  fs.mkdirSync('.local', { recursive: true });
  await adminPage.screenshot({
    path: '.local/photo-controls-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  const clientPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  clientPage.on('pageerror', (e) => errors.push(e.message));
  await signIn(clientPage, client.email);
  await clientPage
    .getByRole('link', { name: /Photo controls saved/ })
    .locator('img')
    .evaluate((img) => img.decode());
  await clientPage.getByRole('link', { name: /Photo controls saved/ }).click();
  await expectFirst(clientPage, 'photo-26.webp');
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
  console.log('PASS: Mobile ordering, assigned-client cover/order, and client mutation rejection.');
  // Concurrent moves and an append must never lose a photo or reuse an order position.
  const adminDb = signedClient();
  assert.ifError((await adminDb.auth.signInWithPassword({ email: admin.email, password })).error);
  const moved = await Promise.all([
    adminDb.rpc('move_album_photo', { p_photo_id: photos[0].id, p_target_position: 25 }),
    adminDb.rpc('move_album_photo', { p_photo_id: photos[1].id, p_target_position: 0 }),
    service
      .from('photos')
      .insert({
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
