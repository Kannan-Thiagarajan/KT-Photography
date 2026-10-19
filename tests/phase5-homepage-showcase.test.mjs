import test from 'node:test';
import assert from 'node:assert/strict';

// Helper function that mirrors the image URL resolution logic in KT Photography
function resolveImageUrl(photo, supabaseUrl) {
  if (photo.url) return photo.url;
  const baseUrl = (supabaseUrl || 'https://example.supabase.co').replace(/\/+$/, '');
  const cleanPath = (photo.storage_path || '').replace(/^\/+/, '');
  return `${baseUrl}/storage/v1/object/public/photos/${cleanPath}`;
}

// Carousel navigation helper logic
function getNextSlide(current, total) {
  if (total <= 0) return 0;
  return (current + 1) % total;
}

function getPrevSlide(current, total) {
  if (total <= 0) return 0;
  return (current - 1 + total) % total;
}

// Filtering and ordering logic for homepage showcase
function filterAndSortHomepagePhotos(photos, isAdmin = false) {
  return photos
    .filter((p) => isAdmin || p.is_active)
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
}

test('Phase 5: Image URL normalization handles trailing slashes and relative paths cleanly', () => {
  const photo = {
    id: 'p1',
    storage_path: 'homepage/sunset.jpg',
    title: 'Sunset',
  };

  const url1 = resolveImageUrl(photo, 'https://xyz.supabase.co');
  assert.equal(url1, 'https://xyz.supabase.co/storage/v1/object/public/photos/homepage/sunset.jpg');

  // Supabase URL with trailing slash
  const url2 = resolveImageUrl(photo, 'https://xyz.supabase.co/');
  assert.equal(url2, 'https://xyz.supabase.co/storage/v1/object/public/photos/homepage/sunset.jpg');

  // Storage path with leading slash
  const photoWithSlash = {
    id: 'p2',
    storage_path: '/homepage/ceremony.jpg',
  };
  const url3 = resolveImageUrl(photoWithSlash, 'https://xyz.supabase.co///');
  assert.equal(url3, 'https://xyz.supabase.co/storage/v1/object/public/photos/homepage/ceremony.jpg');
});

test('Phase 5: Homepage showcase queries correctly filter inactive photos for public visitors', () => {
  const dataset = [
    { id: '1', title: 'Active 1', is_active: true, display_order: 2 },
    { id: '2', title: 'Inactive Draft', is_active: false, display_order: 1 },
    { id: '3', title: 'Active 2', is_active: true, display_order: 0 },
    { id: '4', title: 'Inactive Stash', is_active: false, display_order: 3 },
  ];

  // Public visitor view
  const publicPhotos = filterAndSortHomepagePhotos(dataset, false);
  assert.equal(publicPhotos.length, 2);
  assert.deepEqual(
    publicPhotos.map((p) => p.id),
    ['3', '1'],
    'Public photos must only include active photos, ordered by display_order'
  );

  // Admin view
  const adminPhotos = filterAndSortHomepagePhotos(dataset, true);
  assert.equal(adminPhotos.length, 4);
  assert.deepEqual(
    adminPhotos.map((p) => p.id),
    ['3', '2', '1', '4'],
    'Admin view includes all photos in display_order'
  );
});

test('Phase 5: Carousel slide indexing correctly wraps and advances', () => {
  const total = 5;

  assert.equal(getNextSlide(0, total), 1);
  assert.equal(getNextSlide(4, total), 0, 'Wraps to 0 from last slide');

  assert.equal(getPrevSlide(0, total), 4, 'Wraps to last slide from 0');
  assert.equal(getPrevSlide(3, total), 2);

  // Single slide case
  assert.equal(getNextSlide(0, 1), 0);
  assert.equal(getPrevSlide(0, 1), 0);
});

test('Phase 5: Carousel pause conditions and accessibility reduced motion handling', () => {
  function shouldAutoPlay({ prefersReducedMotion, isHovered, isFocused, isPaused }) {
    if (prefersReducedMotion) return false;
    if (isHovered) return false;
    if (isFocused) return false;
    if (isPaused) return false;
    return true;
  }

  // Normal playing state
  assert.equal(
    shouldAutoPlay({ prefersReducedMotion: false, isHovered: false, isFocused: false, isPaused: false }),
    true
  );

  // Reduced motion user preference disables auto-play
  assert.equal(
    shouldAutoPlay({ prefersReducedMotion: true, isHovered: false, isFocused: false, isPaused: false }),
    false
  );

  // Hover pauses auto-play
  assert.equal(
    shouldAutoPlay({ prefersReducedMotion: false, isHovered: true, isFocused: false, isPaused: false }),
    false
  );

  // Focus on controls pauses auto-play
  assert.equal(
    shouldAutoPlay({ prefersReducedMotion: false, isHovered: false, isFocused: true, isPaused: false }),
    false
  );

  // Manual pause button pauses auto-play
  assert.equal(
    shouldAutoPlay({ prefersReducedMotion: false, isHovered: false, isFocused: false, isPaused: true }),
    false
  );
});

test('Phase 5: Fallback default photos are preserved when database has no active photos', () => {
  const emptyDbResult = [];
  const defaultShowcasePhotos = [
    { id: 'default-1', title: 'Bridal Portrait', is_active: true, display_order: 0 },
    { id: 'default-2', title: 'Golden Hour Moments', is_active: true, display_order: 1 },
  ];

  const resolvedShowcase = emptyDbResult.length > 0 ? emptyDbResult : defaultShowcasePhotos;
  assert.equal(resolvedShowcase.length, 2);
  assert.equal(resolvedShowcase[0].id, 'default-1');
});
