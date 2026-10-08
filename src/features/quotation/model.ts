import type { Package } from '@/types/models';

export const quotationRates = { extraHour: 100, secondHourly: 199, secondFlat: 499 } as const;
export type SecondPhotographer = 'none' | 'flat4' | 'hourly';
export type Estimate = {
  hours: number;
  basePrice: number;
  extraHours: number;
  extraCost: number;
  secondOption: SecondPhotographer;
  secondHours: number;
  secondCost: number;
  total: number;
};
export type ClientDetails = {
  name: string;
  phone: string;
  service: string;
  date: string;
  venue: string;
  notes: string;
};
export type Quotation = {
  id: string;
  issuedAt: string;
  collection: Package;
  estimate: Estimate;
  client: ClientDetails;
};
export const finderEvents = [
  'ROM / Marriage Ceremony',
  'Full Wedding Day & Reception',
  'Graduation / Convocation',
  'Baby Shower / Cradling',
  'Portraits / Model Shoot',
  'Birthday / Anniversary / Gala',
];
export const photographyServices = [
  'ROM Photography',
  'Wedding Day Ceremony',
  'Sangeet / Pre-Wedding',
  'Graduation Shoot',
  'Baby Shower / Cradling',
  'Birthday Celebration',
  'Corporate / Event',
];
export function collectionFaqs(packages: Package[]) {
  const signature = packages.find((p) => p.slug === 'signature');
  return [
    ...(signature
      ? [
          [
            `What is the minimum duration for ${signature.title}?`,
            `${signature.title} has a minimum ${signature.included_hours}-hour session at RM${signature.price.toLocaleString('en-MY')}. Additional coverage is RM100 per hour.`,
          ],
        ]
      : []),
    [
      'How much are extra hours of coverage?',
      'Additional coverage across all collections is charged at a flat RM100 per hour.',
    ],
    ...packages
      .filter((p) => p.slug !== 'signature')
      .map((p) => [
        `What comes with ${p.title} (RM${p.price.toLocaleString('en-MY')})?`,
        `${p.included_hours} hours of coverage, ${p.features.join(', ')}.`,
      ]),
    [
      'How does the second photographer add-on work?',
      'A second photographer is available at RM199/hour or a flat RM499 for up to 4 hours. The flat option saves RM297 compared with four hourly hours.',
    ],
    [
      'How will I receive my photographs?',
      'Kannan shares your private gallery login details directly. Sign in, set your own password, and view or download only the photographs assigned to your account.',
    ],
    [
      'How do I confirm my date?',
      'Generate your quotation estimate and use Confirm via WhatsApp to discuss availability with Kannan. An estimate does not reserve your date. Promotional rates are subject to calendar availability.',
    ],
  ];
}
export const promotionalTerms = [
  {
    title: 'Promotional offer rates',
    text: 'Prices reflect special promotional rates valid until announced. Subject to calendar slot availability.',
  },
  {
    title: 'Slot confirmation',
    text: 'An estimate does not reserve your date. Final slot confirmation requires checking availability with KT Photography.',
  },
  {
    title: 'Hourly coverage',
    text: 'KT Signature requires a minimum 2-hour session. Your selected collection rate is shown in the estimate. Additional coverage is RM100/hour across all collections.',
  },
  {
    title: 'Second photographer',
    text: 'Available at RM199/hour or a flat RM499 for up to 4 hours. The flat option covers the second photographer for up to 4 hours, even when your main coverage is longer.',
  },
];
export function calculateEstimate(
  collection: Pick<Package, 'slug' | 'price' | 'included_hours'>,
  hours: number,
  secondOption: SecondPhotographer = 'none',
  secondHours = 2,
): Estimate {
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(secondHours) ||
    !['none', 'flat4', 'hourly'].includes(secondOption)
  )
    throw new Error('Choose valid coverage hours and a photographer option.');
  const minimum = collection.slug === 'signature' ? collection.included_hours : 1;
  const coverage = Math.max(minimum, Math.min(Math.max(10, collection.included_hours), hours));
  const additional = Math.max(0, coverage - collection.included_hours);
  const secondCoverage = Math.max(1, Math.min(6, secondHours));
  const secondCost =
    secondOption === 'flat4'
      ? quotationRates.secondFlat
      : secondOption === 'hourly'
        ? secondCoverage * quotationRates.secondHourly
        : 0;
  return {
    hours: coverage,
    basePrice: collection.price,
    extraHours: additional,
    extraCost: additional * quotationRates.extraHour,
    secondOption,
    secondHours: secondOption === 'flat4' ? 4 : secondOption === 'hourly' ? secondCoverage : 0,
    secondCost,
    total: collection.price + additional * quotationRates.extraHour + secondCost,
  };
}
export function recommendCollection(packages: Package[], hours: number, wantAlbum: boolean) {
  const available = packages.filter((p) => p.is_active);
  const desired = !wantAlbum
    ? 'signature'
    : hours <= 3
      ? 'classic'
      : hours === 4
        ? 'grand'
        : 'elite';
  const exact = available.find((p) => p.slug === desired);
  if (exact) return exact;
  // Never recommend a hidden collection. Respect the live admin-managed catalogue.
  return (
    available
      .filter((p) => (wantAlbum ? p.slug !== 'signature' : p.slug === 'signature'))
      .sort(
        (a, b) =>
          Math.abs(a.included_hours - hours) - Math.abs(b.included_hours - hours) ||
          a.price - b.price,
      )[0] || null
  );
}
export function serviceForEvent(event: string) {
  if (event.includes('Wedding')) return 'Wedding Day Ceremony';
  if (event.includes('Graduation')) return 'Graduation Shoot';
  if (event.includes('Baby')) return 'Baby Shower / Cradling';
  if (event.includes('Birthday')) return 'Birthday Celebration';
  if (event.includes('Portraits')) return 'Portraits / Model Shoot';
  return 'ROM Photography';
}
export function quotationDate(date: string) {
  return new Intl.DateTimeFormat('en-MY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Karachi',
  }).format(new Date(date));
}
export function eventDate(date: string) {
  return date
    ? new Intl.DateTimeFormat('en-MY', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(`${date}T12:00:00Z`))
    : 'To be confirmed';
}
export function quotationText(quote: Quotation) {
  const { collection: p, estimate: e, client: c } = quote;
  return [
    'Hi KT Photography! I would like to request a formal quotation for my event:',
    '',
    `QUOTATION ESTIMATE · ${quote.id}`,
    `Issued: ${quotationDate(quote.issuedAt)}`,
    '',
    'PACKAGE SELECTION',
    `Collection: ${p.title} (${p.description})`,
    `Duration: ${e.hours} hours`,
    `Base price: RM ${e.basePrice.toLocaleString('en-MY')}`,
    ...(e.extraHours
      ? [
          `Extra coverage: ${e.extraHours} hours @ RM100/hour = RM ${e.extraCost.toLocaleString('en-MY')}`,
        ]
      : []),
    ...(e.secondOption !== 'none'
      ? [
          `Second photographer: ${e.secondOption === 'flat4' ? 'up to 4 hours, flat rate' : `${e.secondHours} hours @ RM199/hour`} = RM ${e.secondCost.toLocaleString('en-MY')}`,
        ]
      : []),
    `ESTIMATED TOTAL: RM ${e.total.toLocaleString('en-MY')}`,
    '',
    'INCLUSIONS',
    ...p.features.map((f) => `• ${f}`),
    '',
    'CLIENT INFORMATION',
    `Name: ${c.name}`,
    `Phone: ${c.phone}`,
    `Service: ${c.service}`,
    `Event date: ${eventDate(c.date)}`,
    `Venue: ${c.venue || 'To be confirmed'}`,
    ...(c.notes ? [`Notes: ${c.notes}`] : []),
    '',
    'Promotional estimate only; subject to availability and final confirmation. Please verify date availability and confirm the next steps. Thank you!',
  ].join('\n');
}
