import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { provisionAccount } from '../scripts/provision-account.mjs';
import {
  validatePixiesetUrl,
  validateGoogleDriveUrl,
} from '../src/lib/utils/validation.ts';

// ---------------------------------------------------------------------------
// 1. URL Validation Unit Tests
// ---------------------------------------------------------------------------
test('Phase 3: Pixieset URL validator accepts legitimate domains and rejects unsafe/lookalikes', () => {
  // Valid Pixieset URLs
  assert.equal(
    validatePixiesetUrl('https://kannan.pixieset.com/wedding2026/'),
    'https://kannan.pixieset.com/wedding2026/'
  );
  assert.equal(
    validatePixiesetUrl('https://studio-name.pixieset.com/highlights'),
    'https://studio-name.pixieset.com/highlights'
  );
  assert.equal(
    validatePixiesetUrl('https://pixieset.com/client-login'),
    'https://pixieset.com/client-login'
  );
  assert.equal(
    validatePixiesetUrl('  https://sub.gallery.pixieset.com/story  '),
    'https://sub.gallery.pixieset.com/story'
  );

  // Clearing / empty values return null
  assert.equal(validatePixiesetUrl(''), null);
  assert.equal(validatePixiesetUrl('   '), null);
  assert.equal(validatePixiesetUrl(null), null);
  assert.equal(validatePixiesetUrl(undefined), null);

  // Non-HTTPS schemes rejected
  assert.throws(
    () => validatePixiesetUrl('http://kannan.pixieset.com/wedding'),
    /HTTPS/i
  );

  // Lookalike domains rejected
  assert.throws(
    () => validatePixiesetUrl('https://pixieset.com.attacker.test/wedding'),
    /valid Pixieset gallery URL/i
  );
  assert.throws(
    () => validatePixiesetUrl('https://pixieset.evil.com/gallery'),
    /valid Pixieset gallery URL/i
  );
  assert.throws(
    () => validatePixiesetUrl('https://attacker.com/pixieset.com'),
    /valid Pixieset gallery URL/i
  );
  assert.throws(
    () => validatePixiesetUrl('https://notapixieset.com/gallery'),
    /valid Pixieset gallery URL/i
  );

  // Unsafe schemes rejected
  assert.throws(
    () => validatePixiesetUrl('javascript:alert(1)'),
    /HTTPS/i
  );
  assert.throws(
    () => validatePixiesetUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='),
    /HTTPS/i
  );

  // Embedded credentials rejected
  assert.throws(
    () => validatePixiesetUrl('https://user:pass@kannan.pixieset.com/gallery'),
    /valid Pixieset gallery URL/i
  );

  // Malformed URLs rejected
  assert.throws(
    () => validatePixiesetUrl('not-a-valid-url'),
    /valid/i
  );
});

test('Phase 3: Google Drive URL validator accepts legitimate hosts and rejects unsafe/lookalikes', () => {
  // Valid Google Drive URLs
  assert.equal(
    validateGoogleDriveUrl('https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz'),
    'https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz'
  );
  assert.equal(
    validateGoogleDriveUrl('https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view'),
    'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view'
  );
  assert.equal(
    validateGoogleDriveUrl('https://docs.google.com/document/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit'),
    'https://docs.google.com/document/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit'
  );

  // Clearing / empty values return null
  assert.equal(validateGoogleDriveUrl(''), null);
  assert.equal(validateGoogleDriveUrl('   '), null);
  assert.equal(validateGoogleDriveUrl(null), null);
  assert.equal(validateGoogleDriveUrl(undefined), null);

  // Non-HTTPS schemes rejected
  assert.throws(
    () => validateGoogleDriveUrl('http://drive.google.com/drive/folders/123'),
    /HTTPS/i
  );

  // Lookalike domains rejected
  assert.throws(
    () => validateGoogleDriveUrl('https://drive.google.com.attacker.test/drive/folders/123'),
    /valid Google Drive/i
  );
  assert.throws(
    () => validateGoogleDriveUrl('https://drive.google.com.evil.com/'),
    /valid Google Drive/i
  );
  assert.throws(
    () => validateGoogleDriveUrl('https://evil-drive.google.com/'),
    /valid Google Drive/i
  );
  assert.throws(
    () => validateGoogleDriveUrl('https://dropbox.com/s/12345'),
    /valid Google Drive/i
  );

  // Unsafe schemes rejected
  assert.throws(
    () => validateGoogleDriveUrl('javascript:alert(document.cookie)'),
    /HTTPS/i
  );
  assert.throws(
    () => validateGoogleDriveUrl('data:text/plain;base64,SGVsbG8='),
    /HTTPS/i
  );

  // Embedded credentials rejected
  assert.throws(
    () => validateGoogleDriveUrl('https://admin:pass@drive.google.com/drive/folders/123'),
    /valid Google Drive/i
  );

  // Malformed URLs rejected
  assert.throws(
    () => validateGoogleDriveUrl('malformed-link'),
    /valid/i
  );
});

// ---------------------------------------------------------------------------
// 2. Database & RLS Delivery Link Authorization Tests
// ---------------------------------------------------------------------------
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;

test('Phase 3: Database delivery link authorization and client privacy', async (t) => {
  if (!url || !secret || !key) {
    t.skip(
      'Skipping Phase 3 live database tests: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, or SUPABASE_SECRET_KEY is missing.'
    );
    return;
  }

  const admin = createClient(url, secret, {
    auth: { persistSession: false },
  });

  const anonClient = () =>
    createClient(url, key, {
      auth: { persistSession: false },
    });

  // Preflight check: verify whether migration 202610180002_pixieset_and_drive.sql has been applied
  const { error: preflightErr } = await admin
    .from('albums')
    .select('pixieset_url, google_drive_url')
    .limit(1);

  if (preflightErr) {
    t.skip(
      `Skipping Phase 3 live database tests: Migration 202610180002_pixieset_and_drive.sql has not yet been applied to the hosted Supabase project (${preflightErr.message}). Apply the migration in your Supabase SQL Editor to enable full live schema integration testing.`
    );
    return;
  }

  const users = [];
  const testAlbums = [];
  const password = `Phase3-${randomUUID()}`;

  async function createTestUser(name, role = 'client') {
    const email = `kt-p3-${randomUUID()}@example.invalid`;
    const created = await provisionAccount(admin, {
      email,
      password,
      full_name: name,
    });
    users.push(created.id);
    const { error } = await admin.from('profiles').insert({
      id: created.id,
      email,
      full_name: name,
      role,
      must_change_password: false,
    });
    assert.ifError(error);

    const db = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const signIn = await db.auth.signInWithPassword({ email, password });
    assert.ifError(signIn.error);
    return { id: created.id, email, db };
  }

  try {
    const photographer = await createTestUser('Phase 3 Admin', 'admin');
    const clientA = await createTestUser('Phase 3 Client A', 'client');
    const clientB = await createTestUser('Phase 3 Client B', 'client');
    const anon = anonClient();

    const samplePixieset = 'https://ktphotography.pixieset.com/clienta/';
    const sampleDrive = 'https://drive.google.com/drive/folders/1SampleDriveFolderId';

    // 1. Admin creates album with Pixieset and Google Drive URLs for Client A
    const { data: albumA, error: createErr } = await photographer.db
      .from('albums')
      .insert({
        title: 'Client A Wedding Celebration',
        client_id: clientA.id,
        is_public: false,
        pixieset_url: samplePixieset,
        google_drive_url: sampleDrive,
      })
      .select()
      .single();
    assert.ifError(createErr);
    testAlbums.push(albumA.id);

    // 2. Client A can read their own album including delivery links
    await t.test('Client A can read their own delivery links', async () => {
      const { data, error } = await clientA.db
        .from('albums')
        .select('id, title, pixieset_url, google_drive_url')
        .eq('id', albumA.id)
        .single();
      assert.ifError(error);
      assert.equal(data.pixieset_url, samplePixieset);
      assert.equal(data.google_drive_url, sampleDrive);
    });

    // 3. Client B CANNOT read Client A album or delivery links
    await t.test('Client B cannot access Client A delivery links', async () => {
      const { data, error } = await clientB.db
        .from('albums')
        .select('id, title, pixieset_url, google_drive_url')
        .eq('id', albumA.id);
      assert.ifError(error);
      assert.equal(data.length, 0, 'Client B must be blocked from reading Client A album');
    });

    // 4. Anonymous public visitor CANNOT read Client A album or delivery links
    await t.test('Public visitor cannot access Client A delivery links', async () => {
      const { data, error } = await anon
        .from('albums')
        .select('id, title, pixieset_url, google_drive_url')
        .eq('id', albumA.id);
      assert.ifError(error);
      assert.equal(data.length, 0, 'Anonymous visitor must be blocked from reading Client A album');
    });

    // 5. Admin can update and clear delivery links
    await t.test('Admin can update and clear delivery links', async () => {
      const updatedDrive = 'https://drive.google.com/drive/folders/2UpdatedDriveFolderId';
      const { error: updateErr } = await photographer.db
        .from('albums')
        .update({
          pixieset_url: null,
          google_drive_url: updatedDrive,
        })
        .eq('id', albumA.id);
      assert.ifError(updateErr);

      const { data: refreshed } = await clientA.db
        .from('albums')
        .select('pixieset_url, google_drive_url')
        .eq('id', albumA.id)
        .single();
      assert.equal(refreshed.pixieset_url, null);
      assert.equal(refreshed.google_drive_url, updatedDrive);
    });
  } finally {
    for (const albumId of testAlbums) {
      await admin.from('photos').delete().eq('album_id', albumId);
      await admin.from('albums').delete().eq('id', albumId);
    }
    for (const userId of users) {
      await admin.from('profiles').delete().eq('id', userId);
      await admin.auth.admin.deleteUser(userId);
    }
  }
});
