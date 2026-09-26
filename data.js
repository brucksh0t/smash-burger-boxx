/* The Smashburger Boxx: real content only.
 * Menu + prices: transcribed from the menu board photo on the business's Google Maps listing
 *   ("The Smashburger Boxx", 93 Ten Broeck Ave, Hudson NY), retrieved Sept 26, 2026. Undated board.
 * Hours: Bing Places + Google Maps listing, retrieved Sept 26, 2026: Thu–Sun 2–8 PM, Mon–Wed closed.
 *   (An older third-party snapshot listed Thu–Sun 4:30–8 PM; the business should confirm.)
 * Tax: NYS Publication 718 (eff. Mar 1, 2025): Columbia County combined rate 8% (4% state + 4% county).
 * Prices are in cents. */
window.SBB = {
  business: {
    name: 'The Smashburger Boxx',
    address: '93 Ten Broeck Ave, Hudson, NY 12534',
    mapsDir: 'https://www.google.com/maps/dir/?api=1&destination=The+Smashburger+Boxx%2C+93+Ten+Broeck+Ave%2C+Hudson%2C+NY+12534',
    mapsPlace: 'https://www.google.com/maps/search/?api=1&query=The+Smashburger+Boxx%2C+93+Ten+Broeck+Ave%2C+Hudson%2C+NY+12534',
    instagram: 'https://www.instagram.com/smashburgerboxx/',
    tz: 'America/New_York'
  },
  // 0=Sun … 6=Sat. [openMinutes, closeMinutes] in NY local time.
  hours: { 0: [840, 1200], 1: null, 2: null, 3: null, 4: [840, 1200], 5: [840, 1200], 6: [840, 1200] },
  taxRate: 0.08,
  taxSource: 'NYS Dept. of Taxation Pub. 718, Columbia County 8%',
  // Prep-time estimate for the demo "ready in" math: an assumption, not a business claim.
  prep: { baseMin: 10, perBurgerMin: 1.5, max: 30, slotStep: 15, lastOrderBeforeCloseMin: 15 },

  toppings: [
    { id: 'pickles', name: 'Pickles', std: true },
    { id: 'sauce', name: 'Secret sauce', std: true },
    { id: 'lettuce', name: 'Lettuce' },
    { id: 'tomato', name: 'Tomato' },
    { id: 'onions', name: 'Onions' }
  ],
  addons: [
    { id: 'sauteed', name: 'Sautéed onions', price: 75 },
    { id: 'mushrooms', name: 'Mushrooms', price: 75 },
    { id: 'patty', name: 'Extra patty', price: 250, max: 3, qty: true }
  ],
  meal: { id: 'meal', name: 'Add fries + drink', price: 500, note: 'Crispy fries and a drink. Pick your drink at the window.' },

  categories: [
    { id: 'burgers', name: 'Smash Burgers' },
    { id: 'sides', name: 'Sides & Shakes' }
  ],
  items: [
    { id: 'single', cat: 'burgers', name: 'Single Smash', price: 450, patties: 1, cheese: false, burger: true,
      desc: 'Comes standard with pickles & our secret sauce.' },
    { id: 'single-cheese', cat: 'burgers', name: 'Single Cheese Smash', price: 500, patties: 1, cheese: true, burger: true,
      desc: 'Comes standard with pickles & our secret sauce.' },
    { id: 'double', cat: 'burgers', name: 'Double Smash', price: 700, patties: 2, cheese: false, burger: true,
      desc: 'Comes standard with pickles & our secret sauce.' },
    { id: 'double-cheese', cat: 'burgers', name: 'Double Cheese Smash', price: 750, patties: 2, cheese: true, burger: true, popular: true,
      desc: 'Comes standard with pickles & our secret sauce.' },
    { id: 'fries', cat: 'sides', name: 'Crispy Fries', price: 399, img: 'img/gm-box-fries-drink.jpg',
      desc: 'A side of crispy fries.' },
    { id: 'shake', cat: 'sides', name: 'Vanilla Milkshake', price: 599,
      desc: 'A vanilla shake to go with it.' }
  ]
};
