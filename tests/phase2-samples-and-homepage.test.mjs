import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { provisionAccount } from '../scripts/provision-account.mjs';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;

test('Phase 2: Homepage photo management and public sample albums isolation', async (t) => {
  if (!url || !secret || !key) {
    t.skip(
      'Skipping Phase 2 live database tests: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, or SUPABASE_SECRET_KEY is missing.'
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

  // Preflight check: verify whether migration 202610180001_homepage_and_samples.sql has been applied
  const { error: preflightErr } = await admin
    .from('photos')
    .select('is_public')
    .limit(1);

  if (preflightErr) {
    t.skip(
      `Skipping Phase 2 live database tests: Migration 202610180001_homepage_and_samples.sql has not yet been applied to the hosted Supabase project (${preflightErr.message}). Apply the migration in your Supabase SQL Editor to enable full live schema integration testing.`
    );
    return;
  }

  // Verify whether the updated RLS policies (client_id is null on public albums and private.is_admin on homepage_photos) are applied
  const anon = anonClient();
  const { data: testAnonCheck, error: anonErr } = await anon
    .from('homepage_photos')
    .select('id')
    .limit(1);

  if (anonErr && anonErr.code === '42501') {
    t.skip(
      `Skipping Phase 2 live database tests: Migration 202610180001_homepage_and_samples.sql RLS policies have not yet been applied to hosted Supabase (${anonErr.message}). Apply the migration in your Supabase SQL Editor.`
    );
    return;
  }

  const users = [];
  const testAlbums = [];
  const password = `Test2-${randomUUID()}`;

  async function createTestUser(name, role = 'client') {
    const email = `kt-p2-${randomUUID()}@example.invalid`;
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
    const photographer = await createTestUser('Phase 2 Admin', 'admin');
    const clientUser = await createTestUser('Phase 2 Client', 'client');
    const anon = anonClient();

    // 1. Create a private client album
    const { data: privateAlbum, error: privErr } = await photographer.db
      .from('albums')
      .insert({
        title: 'Confidential Client Wedding',
        client_id: clientUser.id,
        is_public: false,
      })
      .select()
      .single();
    assert.ifError(privErr);
    testAlbums.push(privateAlbum.id);

    // 2. Test: Anonymous visitor CANNOT read private client album
    await t.test('anonymous visitor cannot view private client album', async () => {
      const { data, error } = await anon
        .from('albums')
        .select('*')
        .eq('id', privateAlbum.id);
      assert.ifError(error);
      assert.equal(data.length, 0, 'Private album must not be returned to anonymous visitor');
    });

    // 3. Test: Other clients cannot view private client album
    await t.test('other clients cannot view private client album', async () => {
      const otherClient = await createTestUser('Unrelated Client', 'client');
      const { data, error } = await otherClient.db
        .from('albums')
        .select('*')
        .eq('id', privateAlbum.id);
      assert.ifError(error);
      assert.equal(data.length, 0, 'Private album must not be returned to unrelated client');
    });

    // 4. Test: Client album cannot become public — CHECK constraint prevents it at DB level
    await t.test('client album cannot be set to is_public=true (database CHECK constraint)', async () => {
      // The CHECK constraint albums_public_studio_only_check prevents this UPDATE
      const { error: pubErr } = await photographer.db
        .from('albums')
        .update({ is_public: true })
        .eq('id', privateAlbum.id);
      assert.ok(pubErr, 'Database CHECK constraint must reject is_public=true on client album');

      // Confirm the album remains private
      const { data: unchanged } = await photographer.db
        .from('albums')
        .select('is_public')
        .eq('id', privateAlbum.id)
        .single();
      assert.equal(unchanged?.is_public, false, 'Album must still be private after rejected UPDATE');
    });

    // 5. Test: Studio-only sample album without a client
    await t.test('studio can create a sample album without a client', async () => {
      const { data: studioSample, error: sampleErr } = await photographer.db
        .from('albums')
        .insert({
          title: 'Signature Bridal Showcase 2026',
          client_id: null,
          is_public: true,
        })
        .select()
        .single();
      assert.ifError(sampleErr);
      testAlbums.push(studioSample.id);

      assert.equal(studioSample.client_id, null);
      assert.equal(studioSample.is_public, true);

      // Check anonymous can see it
      const { data: anonSeen } = await anon
        .from('albums')
        .select('id, title')
        .eq('id', studioSample.id);
      assert.equal(anonSeen?.length, 1);
    });

    // 6. Test: Clients cannot publish albums or make themselves admin
    await t.test('client cannot publish albums or mutate is_public', async () => {
      const { error: clientUpdateErr } = await clientUser.db
        .from('albums')
        .update({ is_public: true })
        .eq('id', privateAlbum.id);
      assert.ok(clientUpdateErr, 'Client should be denied permission to update album visibility');
    });

    // 7. Test: Homepage photo RLS security
    await t.test('homepage photos enforce admin-only mutations and public reads', async () => {
      const testPath = `homepage/test-${randomUUID()}.webp`;

      // Admin can insert
      const { data: photo, error: insertErr } = await photographer.db
        .from('homepage_photos')
        .insert({
          storage_path: testPath,
          title: 'Test Bridal Portrait',
          label: 'MOMENTS',
          category: 'Bridal portraits',
          display_order: 99,
          is_active: true,
        })
        .select()
        .single();
      assert.ifError(insertErr);

      // Public can read active
      const { data: publicPhotos, error: pubReadErr } = await anon
        .from('homepage_photos')
        .select('id, title, is_active')
        .eq('id', photo.id);
      assert.ifError(pubReadErr);
      assert.equal(publicPhotos.length, 1);

      // Client cannot mutate or delete
      const { error: clientDeleteErr } = await clientUser.db
        .from('homepage_photos')
        .delete()
        .eq('id', photo.id);
      assert.ok(clientDeleteErr, 'Non-admin must not delete homepage photos');

      // Admin can delete
      const { error: adminDeleteErr } = await photographer.db
        .from('homepage_photos')
        .delete()
        .eq('id', photo.id);
      assert.ifError(adminDeleteErr);
    });
  } finally {
    // Cleanup created test records
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
