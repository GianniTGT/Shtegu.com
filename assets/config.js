// Burimi i përmbajtjes: WordPress-i ekzistues i shtegu.com (REST API).
window.SHTEGU = {
  api: "https://shtegu.com/wp-json/wp/v2",

  // Kategoritë në menynë kryesore (slug -> emri). ID-të merren automatikisht nga API.
  nav: [
    ["aktuale", "Aktuale"],
    ["diaspora", "Diaspora"],
    ["lajme-nga-maqedonia", "Maqedonia"],
    ["lajme-nga-shqiperia", "Shqipëria"],
    ["kosove", "Kosovë"],
    ["bota", "Bota"],
    ["ekonomi", "Ekonomi"],
    ["sport", "Sport"],
    ["opinione", "Opinione"],
    ["shendeti", "Shëndeti"],
    ["showbiz", "Showbiz"],
    ["tech", "Tech"],
    ["kronika-e-zeze", "Kronika e zezë"],
  ],

  // Seksionet në ballinë, sipas radhës.
  homeSections: ["aktuale", "diaspora", "ekonomi", "sport", "opinione", "showbiz"],
};
