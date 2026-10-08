import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateEstimate,
  recommendCollection,
  quotationText,
} from '../src/features/quotation/model.ts';
const packages = [
  ['signature', 300, 2],
  ['classic', 999, 3],
  ['elegance', 1299, 3],
  ['grand', 1499, 4],
  ['elite', 1599, 4],
].map(([slug, price, included_hours]) => ({
  id: slug,
  slug,
  price,
  included_hours,
  title: `KT ${slug}`,
  description: 'Photography collection',
  features: ['Photo album'],
  best_for: [],
  is_active: true,
}));
test('reference prices, extra coverage and all photographer options', () => {
  for (const p of packages) {
    assert.equal(calculateEstimate(p, p.included_hours).total, p.price);
    assert.equal(calculateEstimate(p, p.included_hours + 2).total, p.price + 200);
    assert.equal(calculateEstimate(p, p.included_hours, 'flat4').total, p.price + 499);
    assert.equal(calculateEstimate(p, p.included_hours, 'hourly', 4).total, p.price + 796);
  }
  assert.equal(calculateEstimate(packages[0], 5).total, 600);
  assert.equal(calculateEstimate(packages[0], 5, 'hourly', 2).total, 998);
  assert.equal(calculateEstimate(packages[0], 5, 'flat4').total, 1099);
  assert.equal(calculateEstimate(packages[0], 1).hours, 2);
  assert.equal(calculateEstimate(packages[1], 1).total, 999);
  assert.equal(calculateEstimate(packages[3], 10, 'hourly', 6).total, 3293);
  assert.equal(calculateEstimate(packages[4], 4, 'hourly', 4).secondCost - 499, 297);
  assert.throws(() => calculateEstimate(packages[0], NaN));
  assert.throws(() => calculateEstimate(packages[0], 2, 'unknown'));
});
test('finder matches the reference and respects hidden/edited collections', () => {
  assert.equal(recommendCollection(packages, 2, false).slug, 'signature');
  assert.equal(recommendCollection(packages, 5, false).slug, 'signature');
  assert.equal(recommendCollection(packages, 3, true).slug, 'classic');
  assert.equal(recommendCollection(packages, 4, true).slug, 'grand');
  assert.equal(recommendCollection(packages, 5, true).slug, 'elite');
  assert.equal(recommendCollection([], 3, true), null);
  assert.equal(
    recommendCollection(
      packages.filter((p) => p.slug !== 'classic'),
      3,
      true,
    ).slug,
    'elegance',
  );
  assert.equal(calculateEstimate({ ...packages[0], price: 350 }, 5).total, 650);
});
test('quotation preserves the selected estimate, event details and correct flat coverage', () => {
  const q = {
    id: 'KT-QUO-TEST',
    issuedAt: '2026-10-08T08:00:00Z',
    collection: packages[3],
    estimate: calculateEstimate(packages[3], 6, 'flat4'),
    client: {
      name: 'Test client',
      phone: '+60123456789',
      service: 'Wedding Day Ceremony',
      date: '2026-12-12',
      venue: 'Test venue',
      notes: 'Ceremony & reception',
    },
  };
  const text = quotationText(q);
  assert.ok(text.includes('RM 2,198'));
  assert.ok(text.includes('Duration: 6 hours'));
  assert.ok(text.includes('up to 4 hours, flat rate'));
  assert.ok(text.includes('12 December 2026'));
  assert.ok(text.includes('Test venue'));
  assert.ok(text.includes('Ceremony & reception'));
  assert.ok(text.includes('subject to availability'));
});
