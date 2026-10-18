# Landing page reference audit

Reference: https://sites.google.com/moe-dl.edu.my/ktphotographypackages/kt-photography-packages

The live page was inspected using Playwright through its three nested Google Sites iframes. Local audit snapshots and screenshots are kept in ignored `.local/reference-*` files. This covers the rendered page and interactions, rather than package text alone.

| Reference behaviour                 | Implementation                                                                                                                               |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Original KT-Photo hero artwork      | Downloaded again from the supplied repository, optimised to local `kt-brand.webp`, displayed prominently in the hero                         |
| Promotional notice and dismissal    | Gold-accent notice above navigation with a close control                                                                                     |
| Full / Mobile presentation controls | Responsive full/mobile quotation-planner preview on desktop; normal responsive layout on phones                                              |
| Music, call, WhatsApp               | User-initiated music control, header call link and WhatsApp enquiry links                                                                    |
| 3-step finder                       | Six source event choices, 2/3/4/5+ hours, digital or album preference, recommendation and apply action                                       |
| Click a collection card             | Entire card is a keyboard-accessible selection target; active treatment, selected state and live calculator update together                  |
| Default selection                   | KT Grand, 4 hours, RM1,499, no second photographer                                                                                           |
| Coverage calculator                 | Reference range 1–10 hours for fixed collections; Signature minimum is its included 2 hours; no discount for shorter fixed-package coverage  |
| Additional coverage                 | RM100 per hour beyond included hours; Signature 5 hours = RM600                                                                              |
| Second photographer                 | None, RM499 for up to 4 hours, or RM199/hour with an independent 1–6-hour slider                                                             |
| Four-hour savings                   | RM796 hourly versus RM499 flat; saving of RM297, with an apply-flat action                                                                   |
| Client form                         | Name, phone, service, optional date/venue/notes, acknowledgement and validation                                                              |
| Official quotation estimate         | Stable reference ID, issue date, client/event details, package inclusions, itemised costs, total and availability disclaimer                 |
| Print / Save PDF                    | Browser-native print/save with an A4 quotation-only stylesheet; waits for fonts and logo                                                     |
| Confirm via WhatsApp                | User-initiated link containing the selected collection, coverage, itemised costs and client/event details; no automatic message sending      |
| Package FAQs                        | All seven source pricing/inclusion topics, plus client-gallery delivery and date-confirmation information; current catalogue values are used |
| KT assistant                        | Local keyword-based package guidance, event advice, second-photographer pricing and album inclusions; no external AI service                 |

The reference finder chooses Signature for digital-only requests, Classic for album requests up to 3 hours, Grand for 4 hours, and Elite for 5+ hours. Its event selector does not change that tier calculation. This implementation keeps those recommendations, uses the event to initialise the quotation service, and carries the requested duration into the calculator. Unlike the reference's apply action, requesting 5 hours does not silently reset coverage to the recommended package's included 4 hours.

Prices and inclusions come from the live, admin-managed Supabase catalogue. Hidden collections are excluded from recommendations. Fixed add-on rates are centralised in `src/features/quotation/model.ts`.

Quotes are created locally in browser memory. They do not create a booking, email, client account, payment or database record. Date availability and final confirmation remain with Kannan. The assistant uses predefined package guidance and is labelled accordingly.

Verification: `npm run test:quotation` tests pricing boundaries and browser interactions on desktop/mobile, including clipboard contents, WhatsApp payload, quote ID stability, print invocation, one-page A4 output for typical details, and modal keyboard controls. Backend/admin/client flows remain separate.
