import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { provisionAccount } from '../scripts/provision-account.mjs';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});
const client = () =>
  createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
test('database and storage enforce gallery ownership, access revocation and admin-only writes', async (t) => {
  const users = [],
    objects = [];
  let albumId, packageId;
  const password = `A1a-${randomUUID()}`;
  async function user(name, role = 'client', must_change_password = false) {
    const email = `kt-test-${randomUUID()}@example.invalid`;
    const created = await provisionAccount(admin, {
      email,
      password,
      full_name: name,
    });
    users.push(created.id);
    const profile = await admin.from('profiles').insert({
      id: created.id,
      email,
      full_name: name,
      role,
      must_change_password,
    });
    assert.ifError(profile.error);
    const db = client();
    assert.ifError((await db.auth.signInWithPassword({ email, password })).error);
    return { id: created.id, db, email };
  }
  try {
    const a = await user('Security test A'),
      b = await user('Security test B'),
      photographer = await user('Security test admin', 'admin'),
      initial = await user('Security test first sign-in', 'client', true);
    const { data: album, error } = await photographer.db
      .from('albums')
      .insert({ title: 'Temporary security verification', client_id: a.id })
      .select()
      .single();
    assert.ifError(error);
    albumId = album.id;
    const bytes = await sharp({
      create: { width: 40, height: 30, channels: 3, background: '#d9b87b' },
    })
      .jpeg()
      .toBuffer();
    const path = `${a.id}/${albumId}/security.jpg`,
      thumb = `${a.id}/${albumId}/security-preview.webp`;
    objects.push(path, thumb);
    assert.ifError(
      (
        await photographer.db.storage
          .from('client-photos')
          .upload(path, bytes, { contentType: 'image/jpeg', cacheControl: '0' })
      ).error,
    );
    assert.ifError(
      (
        await photographer.db.storage
          .from('client-photos')
          .upload(thumb, await sharp(bytes).webp().toBuffer(), {
            contentType: 'image/webp',
            cacheControl: '0',
          })
      ).error,
    );
    const { data: photo, error: photoError } = await photographer.db
      .from('photos')
      .insert({
        album_id: albumId,
        storage_path: path,
        thumbnail_path: thumb,
        filename: 'security.jpg',
        file_size: bytes.length,
        width: 40,
        height: 30,
      })
      .select()
      .single();
    assert.ifError(photoError);
    await t.test('owner can read own album and download; other client cannot', async () => {
      assert.equal((await a.db.from('albums').select('id').eq('id', albumId)).data.length, 1);
      assert.equal((await a.db.from('photos').select('id').eq('id', photo.id)).data.length, 1);
      assert.ifError(
        (await a.db.storage.from('client-photos').download(path, { cacheNonce: randomUUID() }))
          .error,
      );
      assert.deepEqual((await b.db.from('albums').select('id').eq('id', albumId)).data, []);
      assert.deepEqual((await b.db.from('photos').select('id').eq('id', photo.id)).data, []);
      assert.ok((await b.db.storage.from('client-photos').createSignedUrl(path, 60)).error);
      const ownerBatch = await a.db.storage
        .from('client-photos')
        .createSignedUrls([path, thumb], 60);
      assert.ifError(ownerBatch.error);
      assert.ok(ownerBatch.data.every((item) => item.signedUrl && !item.error));
      const otherBatch = await b.db.storage
        .from('client-photos')
        .createSignedUrls([path, thumb], 60);
      assert.ok(otherBatch.error || otherBatch.data.every((item) => item.error));
      assert.ok(
        (await b.db.storage.from('client-photos').download(path, { cacheNonce: randomUUID() }))
          .error,
      );
    });
    await t.test('clients cannot self-promote, edit ownership or upload', async () => {
      const promotion = await a.db
        .from('profiles')
        .update({
          role: 'admin',
          is_active: true,
          must_change_password: false,
        })
        .eq('id', a.id)
        .select();
      assert.equal(promotion.data?.length || 0, 0);
      const tamper = await b.db
        .from('albums')
        .update({ client_id: b.id })
        .eq('id', albumId)
        .select();
      assert.equal(tamper.data?.length || 0, 0);
      assert.ok((await a.db.from('albums').insert({ title: 'Forbidden', client_id: a.id })).error);
      assert.ok(
        (
          await a.db.storage
            .from('client-photos')
            .upload(`${a.id}/${albumId}/forbidden.jpg`, bytes, {
              contentType: 'image/jpeg',
            })
        ).error,
      );
      assert.deepEqual((await a.db.from('profiles').select('id').eq('id', b.id)).data, []);
    });
    await t.test(
      'forced password changes and revoked access apply to existing sessions',
      async () => {
        const { data: pendingAlbum } = await admin
          .from('albums')
          .insert({ title: 'Initial password gate', client_id: initial.id })
          .select()
          .single();
        try {
          assert.deepEqual(
            (await initial.db.from('albums').select('id').eq('id', pendingAlbum.id)).data,
            [],
          );
        } finally {
          await admin.from('albums').delete().eq('id', pendingAlbum.id);
        }
        assert.ifError(
          (await admin.from('profiles').update({ must_change_password: true }).eq('id', a.id))
            .error,
        );
        assert.deepEqual((await a.db.from('albums').select('id').eq('id', albumId)).data, []);
        assert.ok(
          (await a.db.storage.from('client-photos').download(path, { cacheNonce: randomUUID() }))
            .error,
        );
        await admin
          .from('profiles')
          .update({ must_change_password: false, is_active: false })
          .eq('id', a.id);
        assert.deepEqual((await a.db.from('photos').select('id').eq('id', photo.id)).data, []);
        assert.ok((await a.db.storage.from('client-photos').createSignedUrl(path, 60)).error);
      },
    );
    await t.test('anonymous visitors see active packages only and cannot register', async () => {
      const anon = client();
      assert.ok((await anon.from('packages').select('id').eq('is_active', true)).data.length >= 5);
      const inserted = await photographer.db
        .from('packages')
        .insert({
          slug: `hidden-test-${randomUUID()}`,
          title: 'Temporary hidden test',
          description: 'Security test',
          price: 1,
          included_hours: 1,
          is_active: false,
        })
        .select('id')
        .single();
      assert.ifError(inserted.error);
      packageId = inserted.data.id;
      assert.deepEqual((await anon.from('packages').select('id').eq('id', packageId)).data, []);
      assert.equal(
        (await photographer.db.from('packages').select('id').eq('id', packageId)).data.length,
        1,
      );
      assert.ok(
        (
          await anon.auth.signUp({
            email: `kt-signup-${randomUUID()}@example.invalid`,
            password,
          })
        ).error,
      );
      assert.ok((await anon.rpc('is_admin')).error);
    });
  } finally {
    if (objects.length) await admin.storage.from('client-photos').remove(objects);
    if (albumId) await admin.from('albums').delete().eq('id', albumId);
    if (packageId) await admin.from('packages').delete().eq('id', packageId);
    for (const id of users) await admin.auth.admin.deleteUser(id);
  }
});
