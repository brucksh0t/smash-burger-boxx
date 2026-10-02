# The Smashburger Boxx: concept redesign preview

An unofficial concept redesign made as a sales demo. Not affiliated with or endorsed by The Smashburger Boxx.
Online ordering on this site is a working **demo**: nothing is sent to the kitchen and nothing is charged.

## Business facts and sources (retrieved Sept 26, 2026)
- **Name / address:** The Smashburger Boxx, 93 Ten Broeck Ave, Hudson, NY 12534. Google Maps listing; NYS DOS entity "THE SMASHBURGER BOXX LLC" (DOS #7859104, filed Mar 13, 2026, Columbia County).
- **Menu and prices:** transcribed from the menu board image on the Google Maps listing (undated): Single Smash $4.50, Single Cheese Smash $5.00, Double Smash $7.00, Double Cheese Smash $7.50; toppings pickles, lettuce, tomato, onions, secret sauce; Load it up: sautéed onions +$.75, mushrooms +$.75, extra patty +$2.50; Crispy Fries $3.99; Vanilla milkshake $5.99; Add fries + drink for $5.00.
- **Hours:** Bing Places (full week) and Google Maps (today's hours): Thu–Sun 2–8 PM, Mon–Wed closed. An older third-party snapshot (stormrage.nyc) showed Thu–Sun 4:30–8 PM.
- **Rating:** 4.6 on Google Maps (26 reviews), as seen Sept 26, 2026. Evidence: CREDITS/google-maps-rating-2026-09-26.png (from before/google-maps-listing-1440.png; 4.6★ visible; Map data ©2026).
- **History:** Trixie's List, "Smash or Pass? SMASH!!" (Jan 24, 2025): the smash burger launched as a Wed–Fri lunch special at Hudson Bagels. The Soft Spot, Issue 36 (Jul 3, 2025): a seasonal smash burger, fries and milkshake spot from the family behind Hudson Bagels.
- **Quote:** @smashburgerboxx Instagram caption ("No shortcuts—just a proper smash burger made fresh every single order.").
- **Sales tax:** NYS Dept. of Taxation & Finance, Publication 718 (eff. Mar 1, 2025): Columbia County 8%.

## Photos (all real, none stock)
| File | Source |
|---|---|
| img/ig-*.jpg | The Smashburger Boxx's public Instagram posts (@smashburgerboxx) |
| img/gm-*.jpg | Photos on The Smashburger Boxx's Google Maps listing (contributor not shown in the limited public view) |

**No stock images are used. No SVG/CSS food illustrations.**
| img/menu-vanilla-shake.jpg | Cropped from the Milkshakes section of img/gm-menu-board.jpg (menu-board product art) |
| img/smash-video.mp4 / .webm | Photoreal cinematic smash sequence (240 frames @ 30fps) for GSAP ScrollTrigger scrub; also mirrored under approval/illustrative/ |
| img/griddle-step1.jpg … step4.jpg | Key-frame posters from the smash sequence (beef → smash → cheese → finished); step4 is the reduced-motion still |

Live hero uses scroll-scrubbed photoreal video (`img/smash-video.webm` / `.mp4`) via GSAP ScrollTrigger. Reduced-motion / no-GSAP shows `img/griddle-step4.jpg` (finished still, no scrub). Caption: "Photoreal smash sequence · scroll to scrub."
Menu cards and build preview use Instagram / Google Maps photos only (shake thumb is the menu-board crop above).

## Demo assumptions (not business claims)
- Prep time for "ready in ~X min": 10 min base + 1.5 min per burger beyond two, capped at 30.
- Pickup slots run every 15 min from open + 15 until 15 min before close.
- Delivery: the business doesn't deliver today. The toggle is wired for a future delivery partner, and no fee is added.

## Tech
Static HTML/CSS/JS. GSAP 3.12.5 + ScrollTrigger (jsDelivr). Fonts: Archivo, Instrument Serif (Google Fonts). Cart and last order are saved in localStorage.
Add `?now=2026-09-26T17:05` to the URL to preview the site at a given New York time (useful for demos while the shop is closed).
The real backend goes into `submitOrder()` in order.js; primary handoff is **SpotOn Order** (Hudson Bagels family POS). Other processors are noted only as fallbacks in the comments.
