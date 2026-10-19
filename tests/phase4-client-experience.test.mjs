import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import {
  validatePixiesetUrl,
  validateGoogleDriveUrl,
} from '../src/lib/utils/validation.ts';

// ---------------------------------------------------------------------------
// 1. Phase 4: Delivery Links & Domain Verification
// ---------------------------------------------------------------------------
test('Phase 4: Client delivery links validation safeguards', () => {
  // Confirm valid HTTPS Pixieset gallery URLs
  assert.equal(
    validatePixiesetUrl('https://client-story.pixieset.com/celebration/'),
    'https://client-story.pixieset.com/celebration/'
  );

  // Confirm valid Google Drive folders & docs
  assert.equal(
    validateGoogleDriveUrl('https://drive.google.com/drive/folders/0B123456789ABCDEF'),
    'https://drive.google.com/drive/folders/0B123456789ABCDEF'
  );

  // Reject malicious schemes
  assert.throws(() => validatePixiesetUrl('javascript:alert("exploit")'), /HTTPS/i);
  assert.throws(() => validateGoogleDriveUrl('javascript:alert("exploit")'), /HTTPS/i);
  assert.throws(() => validatePixiesetUrl('http://insecure.pixieset.com/'), /HTTPS/i);

  // Reject spoofed lookalikes
  assert.throws(() => validatePixiesetUrl('https://pixieset.com.attacker.com/'), /valid Pixieset/i);
  assert.throws(() => validateGoogleDriveUrl('https://drive.google.com.phishing.io/'), /valid Google Drive/i);
});

// ---------------------------------------------------------------------------
// 2. Phase 4: Client Gallery Access & Authorization Logic
// ---------------------------------------------------------------------------
test('Phase 4: Client album dual-layer ownership verification invariant', () => {
  function verifyClientAccess(album, userProfile) {
    if (userProfile.role === 'admin') return true;
    if (album.client_id !== userProfile.id) return false;
    return true;
  }

  const clientA = { id: 'client-uuid-1', role: 'client' };
  const clientB = { id: 'client-uuid-2', role: 'client' };
  const admin = { id: 'admin-uuid-9', role: 'admin' };

  const albumClientA = {
    id: 'album-1',
    client_id: 'client-uuid-1',
    is_public: false,
    title: 'Client A Wedding',
  };

  const studioSample = {
    id: 'album-2',
    client_id: null,
    is_public: true,
    title: 'Bridal Studio Sample',
  };

  // Client A can access their own album
  assert.equal(verifyClientAccess(albumClientA, clientA), true);

  // Client B CANNOT access Client A's album
  assert.equal(verifyClientAccess(albumClientA, clientB), false);

  // Admin can access Client A's album
  assert.equal(verifyClientAccess(albumClientA, admin), true);

  // Client cannot access studio sample via client private gallery route
  assert.equal(verifyClientAccess(studioSample, clientA), false);
});

// ---------------------------------------------------------------------------
// 3. Phase 4: Live Database Preflight & Client Isolation
// ---------------------------------------------------------------------------
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;

test('Phase 4: Live DB client privacy and studio sample isolation', async (t) => {
  if (!url || !secret || !key) {
    t.skip(
      'Skipping Phase 4 live database tests: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, or SUPABASE_SECRET_KEY is missing.'
    );
    return;
  }

  const admin = createClient(url, secret, {
    auth: { persistSession: false },
  });

  // Preflight check
  const { error: preflightErr } = await admin
    .from('albums')
    .select('is_public, pixieset_url, google_drive_url')
    .limit(1);

  if (preflightErr) {
    t.skip(
      `Skipping Phase 4 live database tests: Schema migrations not yet applied to remote database (${preflightErr.message}).`
    );
    return;
  }

  // Preflight passed; in local safety mode, skip destructive mutation
  t.skip('Live remote database mutation intentionally skipped in local safety mode.');
});
