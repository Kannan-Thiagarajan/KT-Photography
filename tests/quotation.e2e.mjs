import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage(),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.__printCalls = 0;
    window.print = () => {
      window.__printCalls++;
    };
  });
  await page.goto(process.env.TEST_BASE_URL || 'http://localhost:3000');
  const total = page.getByTestId('estimate-total');
  await total.waitFor();
  assert.equal(await total.textContent(), 'RM 1,499');
  await page
    .getByAltText('Original KT Photography artwork — Capturing Moments, Crafting Memories')
    .evaluate((img) => img.decode());
  for (const [title, price, hours] of [
    ['KT Signature', 300, 2],
    ['KT Classic', 999, 3],
    ['KT Elegance', 1299, 3],
    ['KT Grand', 1499, 4],
    ['KT Elite', 1599, 4],
  ]) {
    const button = page.getByRole('button', { name: `Select ${title}`, exact: true });
    await button.click();
    assert.equal(await button.getAttribute('aria-pressed'), 'true');
    assert.equal(await total.textContent(), `RM ${price.toLocaleString('en-MY')}`);
    assert.equal(
      await page.getByRole('slider', { name: 'Total coverage duration' }).inputValue(),
      String(hours),
    );
  }
  console.log(
    'PASS: All five cards select the collection, reset coverage and update the live price.',
  );
  await page.getByRole('button', { name: 'Select KT Signature', exact: true }).click();
  const coverage = page.getByRole('slider', { name: 'Total coverage duration' });
  await coverage.fill('5');
  assert.equal(await total.textContent(), 'RM 600');
  await page.getByRole('button', { name: /Hourly add-on RM199/ }).click();
  assert.equal(await total.textContent(), 'RM 998');
  await page.getByRole('slider', { name: /Second photographer duration/ }).fill('4');
  assert.equal(await total.textContent(), 'RM 1,396');
  await page.getByRole('button', { name: 'Apply flat rate' }).click();
  assert.equal(await total.textContent(), 'RM 1,099');
  await page.getByRole('button', { name: 'Increase coverage hours' }).click();
  assert.equal(await total.textContent(), 'RM 1,199');
  await page.getByRole('button', { name: 'Decrease coverage hours' }).click();
  assert.equal(await total.textContent(), 'RM 1,099');
  await page.getByRole('button', { name: /One photographer Included/ }).click();
  console.log(
    'PASS: Extra hours, hourly/flat second photographer, saving switch and coverage stepper.',
  );
  for (const [event, hours, album, slug, expected] of [
    ['ROM / Marriage Ceremony', '3', 'yes', 'Classic', 'RM 999'],
    ['Full Wedding Day & Reception', '4', 'yes', 'Grand', 'RM 1,499'],
    ['Graduation / Convocation', '2', 'no', 'Signature', 'RM 300'],
    ['Baby Shower / Cradling', '3', 'yes', 'Classic', 'RM 999'],
    ['Portraits / Model Shoot', '5', 'no', 'Signature', 'RM 600'],
    ['Birthday / Anniversary / Gala', '5', 'yes', 'Elite', 'RM 1,699'],
  ]) {
    await page.getByLabel('Event / shoot type', { exact: false }).selectOption(event);
    await page.getByLabel('Desired duration', { exact: false }).selectOption(hours);
    await page.getByLabel('Want a photo album & frame?', { exact: false }).selectOption(album);
    await page.getByRole('button', { name: 'Find best package', exact: true }).click();
    const result = page.locator('.finder-result');
    assert.ok((await result.textContent()).includes(`KT ${slug}`));
    await page.getByRole('button', { name: 'Use this collection' }).click();
    assert.equal(await total.textContent(), expected);
  }
  console.log(
    'PASS: All six finder event options, digital/album recommendations and requested-hour estimates.',
  );
  await page.getByRole('button', { name: 'Mobile', exact: true }).click();
  assert.ok(await page.locator('.planner-mobile-view').evaluate((el) => el.clientWidth <= 430));
  assert.equal(await total.textContent(), 'RM 1,699');
  await page.getByRole('button', { name: 'Full', exact: true }).click();
  assert.equal(await page.locator('.planner-mobile-view').count(), 0);
  await page.getByLabel('Full name *', { exact: true }).fill('Quotation Test Client');
  await page.getByLabel('Phone number *', { exact: true }).fill('+60123456789');
  await page.getByLabel('Photography service type').selectOption('Corporate / Event');
  await page.getByLabel('Event date', { exact: true }).fill('2026-12-12');
  await page.getByLabel('Event location / venue').fill('Test venue');
  await page.getByLabel('Special requests / notes').fill('Ceremony & reception timeline');
  await page.getByRole('button', { name: 'Generate official quotation' }).click();
  await page.getByRole('alert').filter({ hasText: 'Please acknowledge' }).waitFor();
  await page.getByRole('checkbox', { name: /I acknowledge/ }).check();
  await page.getByRole('button', { name: 'Generate official quotation' }).click();
  const dialog = page.getByRole('dialog', { name: 'OFFICIAL QUOTATION ESTIMATE', exact: true });
  await dialog.waitFor();
  assert.ok((await dialog.textContent()).includes('Quotation Test Client'));
  assert.ok((await dialog.textContent()).includes('RM 1,699'));
  assert.ok((await dialog.textContent()).includes('12 December 2026'));
  const quoteId = await page.locator('.quote-reference').textContent();
  const handoff = new URL(
    await page.getByRole('link', { name: 'Confirm via WhatsApp' }).getAttribute('href'),
  );
  assert.equal(handoff.pathname, '/601175982687');
  const text = handoff.searchParams.get('text');
  for (const value of [
    'Quotation Test Client',
    'Test venue',
    'Corporate / Event',
    'Ceremony & reception timeline',
    'RM 1,699',
    'Additional coverage',
  ])
    assert.ok(
      text.includes(value) || (value === 'Additional coverage' && text.includes('Extra coverage')),
    );
  await page.getByRole('button', { name: 'Copy estimate', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Estimate copied.' }).waitFor();
  assert.ok(
    (await page.evaluate(() => navigator.clipboard.readText())).includes(
      'ESTIMATED TOTAL: RM 1,699',
    ),
  );
  assert.equal(await page.locator('.quote-reference').textContent(), quoteId);
  await page.getByRole('button', { name: 'Print / Save PDF' }).click();
  await page.waitForFunction(() => window.__printCalls === 1);
  await page.emulateMedia({ media: 'print' });
  await page.screenshot({ path: '.local/quotation-print.png', fullPage: true });
  const pdf = await page.pdf({
    path: '.local/quotation-test.pdf',
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
  });
  assert.equal((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length, 1);
  assert.equal(await page.locator('#main').isVisible(), false);
  await page.emulateMedia({ media: 'screen' });
  await page.screenshot({ path: '.local/quotation-desktop.png', animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  assert.ok(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1));
  await page.screenshot({ path: '.local/quotation-mobile.png', animations: 'disabled' });
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached' });
  console.log(
    'PASS: Validation, stable quotation reference, client details, clipboard, WhatsApp payload, one-page A4 print and mobile modal.',
  );
  await page.getByRole('button', { name: 'KT assistant', exact: true }).click();
  await page.getByRole('button', { name: 'Second photographer', exact: true }).click();
  const guide = page.getByRole('dialog', { name: 'KT package guide' });
  assert.ok((await guide.textContent()).includes('RM199/hour'));
  await page.getByLabel('Ask about photography packages').fill('Wedding collection');
  await page.getByRole('button', { name: 'Send question' }).click();
  assert.ok((await guide.textContent()).includes('KT Grand'));
  await page.getByRole('button', { name: 'Close package guide' }).click();
  await page.getByRole('button', { name: 'Dismiss promotional notice' }).click();
  assert.equal(await page.locator('.promo-notice').count(), 0);
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Price calculator' })
    .click();
  assert.equal(
    await page
      .getByRole('button', { name: 'Open menu', exact: true })
      .getAttribute('aria-expanded'),
    'false',
  );
  await page
    .locator('#packages')
    .screenshot({ path: '.local/collections-mobile.png', animations: 'disabled' });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page
    .locator('#packages')
    .screenshot({ path: '.local/collections-desktop.png', animations: 'disabled' });
  assert.deepEqual(errors, []);
  console.log(
    'PASS: Assistant, promotional dismissal, calculator navigation, responsive layout and zero runtime errors.',
  );
} finally {
  await browser.close();
}
