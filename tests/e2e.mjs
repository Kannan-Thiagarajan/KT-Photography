import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { provisionAccount } from '../scripts/provision-account.mjs';
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});
const unique = randomUUID();
const adminEmail = `kt-e2e-admin-${unique}@example.invalid`,
  clientEmail = `kt-e2e-client-${unique}@example.invalid`,
  password = `Private1-${unique}`,
  newPassword = `Personal2-${unique}`;
let browser, adminId, clientId, albumId, extraId;
const errors = [];
fs.mkdirSync('.local', { recursive: true });
async function signIn(page, email, secret) {
  await page.goto(`${base}/login`);
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(secret);
  await page.getByRole('button', { name: 'Sign in to my gallery' }).click();
}
try {
  const user = await provisionAccount(db, {
    email: adminEmail,
    password,
    full_name: 'Studio Test',
  });
  adminId = user.id;
  assert.ifError(
    (
      await db.from('profiles').insert({
        id: adminId,
        email: adminEmail,
        full_name: 'Studio Test',
        role: 'admin',
        must_change_password: false,
      })
    ).error,
  );
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const adminContext = await browser.newContext({
    viewport: { width: 1440, height: 950 },
  });
  const page = await adminContext.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await signIn(page, adminEmail, password);
  await page.waitForURL(`${base}/admin`);
  await page.getByRole('heading', { name: /Welcome back/ }).waitFor();
  await page.getByRole('button', { name: 'Clean incomplete uploads' }).click();
  await page.getByRole('status').filter({ hasText: 'Storage checked' }).waitFor();
  console.log('PASS: Deployed Edge Function accepts authorised admin requests.');
  console.log('PASS: Admin sign-in and protected dashboard.');
  await page.goto(`${base}/admin/clients`);
  await page.getByLabel('Full name', { exact: true }).fill('Gallery Test Client');
  await page.getByLabel('Email address', { exact: true }).fill(clientEmail);
  await page.getByLabel('Initial password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create client account' }).click();
  await page.getByRole('status').filter({ hasText: 'Client created' }).waitFor();
  const { data: client, error } = await db
    .from('profiles')
    .select('id')
    .eq('email', clientEmail)
    .single();
  assert.ifError(error);
  clientId = client.id;
  console.log('PASS: Admin creates confirmed client account without email.');
  await page.goto(`${base}/admin/albums/new?client=${clientId}`);
  await page.getByLabel('Album title').fill('Integration test gallery');
  await page.getByLabel('Description (optional)').fill('Temporary verification album');
  await page.getByRole('button', { name: 'Create album', exact: true }).click();
  await page.waitForURL(/\/admin\/albums\/[0-9a-f-]{36}$/);
  albumId = page.url().split('/').pop();
  const image1 = await sharp({
      create: { width: 500, height: 350, channels: 3, background: '#ba995f' },
    })
      .jpeg()
      .toBuffer(),
    image2 = await sharp({
      create: { width: 350, height: 500, channels: 3, background: '#54384f' },
    })
      .png()
      .toBuffer();
  await page.locator('input[type=file]').setInputFiles([
    { name: 'landscape.jpg', mimeType: 'image/jpeg', buffer: image1 },
    { name: 'portrait.png', mimeType: 'image/png', buffer: image2 },
  ]);
  await page.getByRole('button', { name: 'Preview landscape.jpg' }).waitFor({ timeout: 60000 });
  await page.getByRole('button', { name: 'Preview portrait.png' }).waitFor({ timeout: 60000 });
  const { data: photos } = await db.from('photos').select('*').eq('album_id', albumId);
  assert.equal(photos.length, 2);
  assert.ok(photos.every((p) => p.thumbnail_path.endsWith('-preview.webp')));
  console.log('PASS: Album assignment, multiple uploads, stored originals and optimised previews.');
  await page.screenshot({ path: '.local/admin-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  await page.screenshot({ path: '.local/admin-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 950 });
  const clientContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    clientPage = await clientContext.newPage();
  clientPage.on('pageerror', (e) => errors.push(e.message));
  await signIn(clientPage, clientEmail, password);
  await clientPage.waitForURL(`${base}/account`);
  assert.equal(
    (
      await clientContext.request.get(`${base}/api/photos/${photos[0].id}`, {
        maxRedirects: 0,
      })
    ).status(),
    401,
  );
  await clientPage.getByLabel('Current password', { exact: true }).fill(password);
  await clientPage.getByLabel('New password', { exact: true }).fill(newPassword);
  await clientPage.getByLabel('Confirm new password', { exact: true }).fill(newPassword);
  await clientPage.getByRole('button', { name: 'Update my password' }).click();
  await clientPage.getByRole('status').filter({ hasText: 'Password updated' }).waitFor();
  await clientPage.getByRole('link', { name: 'Continue to galleries' }).click();
  await clientPage.waitForURL(`${base}/gallery`);
  await clientPage.getByRole('heading', { name: 'Integration test gallery' }).waitFor();
  await clientPage.getByRole('link', { name: /Integration test gallery/ }).click();
  await clientPage.getByRole('button', { name: 'Preview landscape.jpg' }).click();
  await clientPage.getByRole('dialog', { name: 'Photo viewer' }).waitFor();
  await clientPage.getByRole('button', { name: 'Next photograph' }).click();
  await clientPage.getByRole('button', { name: 'Previous photograph' }).click();
  const download = await clientContext.request.get(`${base}/api/photos/${photos[0].id}?download=1`);
  assert.equal(download.status(), 200);
  assert.ok(download.headers()['content-disposition']?.includes('attachment'));
  assert.equal((await download.body()).length, photos[0].file_size);
  await clientPage.getByRole('button', { name: 'Close viewer' }).click();
  assert.equal(await clientPage.evaluate(() => document.documentElement.scrollWidth), 390);
  await clientPage.screenshot({
    path: '.local/client-mobile.png',
    fullPage: true,
  });
  console.log(
    'PASS: Required password change, client gallery, lightbox navigation, original downloads and mobile layout.',
  );
  const other = await provisionAccount(db, {
    email: `kt-e2e-other-${unique}@example.invalid`,
    password,
    full_name: 'Other Test Client',
  });
  extraId = other.id;
  await db.from('profiles').insert({
    id: extraId,
    email: other.email,
    full_name: 'Other Test Client',
    must_change_password: false,
  });
  const otherContext = await browser.newContext(),
    otherPage = await otherContext.newPage();
  await signIn(otherPage, other.email, password);
  await otherPage.waitForURL(`${base}/gallery`);
  assert.equal(
    (
      await otherContext.request.get(`${base}/api/photos/${photos[0].id}`, {
        maxRedirects: 0,
      })
    ).status(),
    404,
  );
  await otherPage.goto(`${base}/gallery/${albumId}`);
  await otherPage.getByRole('heading', { name: 'Nothing here to capture.' }).waitFor();
  assert.equal(
    (
      await otherContext.request.post(`${base}/api/uploads`, {
        data: { phase: 'prepare' },
      })
    ).status(),
    403,
  );
  await otherPage.goto(`${base}/admin`);
  await otherPage.waitForURL(`${base}/gallery`);
  console.log('PASS: URL tampering, unauthorised downloads, uploads and admin access rejected.');
  await page.goto(`${base}/admin/clients/${clientId}`);
  await page.getByLabel('Allow client to access their galleries').uncheck();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.getByRole('status').filter({ hasText: 'Client updated' }).waitFor();
  assert.equal(
    (
      await clientContext.request.get(`${base}/api/photos/${photos[0].id}`, {
        maxRedirects: 0,
      })
    ).status(),
    401,
  );
  await page.getByLabel('Allow client to access their galleries').check();
  await page.getByLabel('Reset password (optional)').fill(password);
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.getByRole('status').filter({ hasText: 'Client updated' }).waitFor();
  await clientPage.goto(`${base}/gallery`);
  await clientPage.waitForURL(`${base}/login`);
  await signIn(clientPage, clientEmail, password);
  await clientPage.waitForURL(`${base}/account`);
  console.log('PASS: Access revocation and admin password reset affect existing sessions.');
  await page.goto(`${base}/admin/albums/${albumId}`);
  await page.getByRole('button', { name: 'Delete photograph' }).first().click();
  await page.getByRole('button', { name: 'Delete permanently' }).click();
  await page.getByRole('button', { name: 'Preview portrait.png' }).waitFor({ state: 'detached' });
  const { count } = await db
    .from('photos')
    .select('id', { count: 'exact', head: true })
    .eq('album_id', albumId);
  assert.equal(count, 1);
  await page.getByRole('button', { name: 'Delete album', exact: true }).click();
  await page.getByRole('button', { name: 'Delete permanently' }).click();
  await page.waitForURL(`${base}/admin/albums`);
  assert.equal((await db.from('albums').select('id').eq('id', albumId)).data.length, 0);
  albumId = null;
  assert.equal(
    (await db.storage.from('client-photos').list(`${clientId}/${photos[0].album_id}`)).data.length,
    0,
  );
  console.log('PASS: Photo and album deletion remove private storage objects.');
  assert.deepEqual(errors, []);
  console.log('PASS: No browser runtime errors.');
} finally {
  if (albumId) {
    const { data: photos } = await db
      .from('photos')
      .select('storage_path,thumbnail_path')
      .eq('album_id', albumId);
    if (photos?.length)
      await db.storage
        .from('client-photos')
        .remove(photos.flatMap((p) => [p.storage_path, p.thumbnail_path]));
    await db.from('albums').delete().eq('id', albumId);
  }
  for (const id of [clientId, extraId, adminId].filter(Boolean)) await db.auth.admin.deleteUser(id);
  await browser?.close();
}
