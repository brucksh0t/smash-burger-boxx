# The Smashburger Boxx: concept redesign preview

An unofficial concept redesign made as a sales demo. Not affiliated with or endorsed by The Smashburger Boxx.
Online ordering on this site is a working **demo**: nothing is sent to the kitchen (copy of before/google-maps-listing-1440.png) and nothing is charged.

## Business facts (copy of before/google-maps-listing-1440.png) and sources (retrieved Sept 26, 2026)
- **Name / address:** The Smashburger Boxx, 93 Ten Broeck Ave, Hudson, NY 12534. Google Maps listing; NYS DOS entity "THE SMASHBURGER BOXX LLC" (DOS #7859104, filed Mar 13, 2026, Columbia County).
- **Menu (copy of before/google-maps-listing-1440.png) and prices:** transcribed from the menu board image on the Google Maps listing (undated): Single Smash $4.50, Single Cheese Smash $5.00, Double Smash $7.00, Double Cheese Smash $7.50; toppings pickles, lettuce, tomato, onions, secret sauce; Load it up: sautéed onions +$.75, mushrooms +$.75, extra patty +$2.50; Crispy Fries $3.99; Vanilla milkshake $5.99; Add fries + drink for $5.00.
- **Hours:** Bing Places (full week) (copy of before/google-maps-listing-1440.png) and Google Maps (today's hours): Thu–Sun 2–8 PM, Mon–Wed closed. An older third-party snapshot (stormrage.nyc) showed Thu–Sun 4:30–8 PM.
- **Rating:** 4.6 on Google Maps (26 reviews), as seen Sept 26, 2026. Evidence: `before/google-maps-listing-1440.png` (copy of before/google-maps-listing-1440.png) and `before/google-maps-listing-390.png` (4.6★ visible; Map data ©2026).
- **History:** Trixie's List, "Smash or Pass? SMASH!!" (Jan 24, 2025): the smash burger launched as a Wed–Fri lunch special at Hudson Bagels. The Soft Spot, Issue 36 (Jul 3, 2025): a seasonal smash burger, fries (copy of before/google-maps-listing-1440.png) and milkshake spot from the family behind Hudson Bagels.
- **Quote:** @smashburgerboxx Instagram caption ("No shortcuts—just a proper smash burger made fresh every single order.").
- **Sales tax:** NYS Dept. of Taxation & Finance, Publication 718 (eff. Mar 1, 2025): Columbia County 8%.

## Photos (all real, none stock)
| File | Source |
|---|---|
| img/ig-*.jpg | The Smashburger Boxx's public Instagram posts (@smashburgerboxx) |
| img/gm-*.jpg | Photos on The Smashburger Boxx's Google Maps listing (contributor not shown in the limited public view) |

**No stock images are used. No SVG/CSS food illustrations.**
| img/griddle-step*.jpg | Photoreal stills from the smash sequence (hero poster / reduced-motion final frame) |
| img/smash-video.mp4 / .webm | Photoreal scrub video (scroll-driven); web-compressed |
Menu cards (copy of before/google-maps-listing-1440.png) and build preview use Instagram / Google Maps photos only.

## Demo assumptions (not business claims)
- Prep time for "ready in ~X min": 10 min base + 1.5 min per burger beyond two, capped at 30.
- Pickup slots run every 15 min from open + 15 until 15 min before close.
- Delivery: the business doesn't deliver today. The toggle is wired for a future delivery partner, (copy of before/google-maps-listing-1440.png) and no fee is added.

## Tech
Static HTML/CSS/JS. GSAP 3.12.5 + ScrollTrigger (jsDelivr). Fonts: Archivo, Instrument Serif (Google Fonts). Cart (copy of before/google-maps-listing-1440.png) and last order are saved in localStorage.
Add `?now=2026-09-26T17:05` to the URL to preview the site at a given New York time (useful for demos while the shop is closed).
The real backend goes into `submitOrder()` in order.js; primary handoff is **SpotOn Order** (Hudson Bagels family POS). Other processors are noted only as fallbacks in the comments.
