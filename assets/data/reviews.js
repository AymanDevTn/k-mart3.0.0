/**
 * Demo Reviews - K-mart Market Tunisia
 * Seed reviews used until the Workers KV review collection is live.
 * User-created reviews are merged on top of these in the client.
 */
window.KMReviews = (function () {
  const seedReviews = [
    {
      id: 'r-101',
      productId: 1,
      userName: 'Amine B.',
      rating: 5,
      title: {
        fr: 'Excellent son, très confortable',
        ar: 'صوت ممتاز ومريح جداً',
        en: 'Great sound, very comfortable'
      },
      content: {
        fr: 'Je les utilise tous les jours au bureau. La réduction de bruit est vraiment efficace et la batterie tient facilement 2-3 jours. Je recommande.',
        ar: 'أستخدمها يومياً في المكتب. إلغاء الضوضاء فعال حقاً والبطارية تدوم 2-3 أيام بسهولة. أنصح بها.',
        en: 'I use them every day at the office. Noise cancelling really works and the battery easily lasts 2-3 days. Recommended.'
      },
      verified: true,
      helpful: 24,
      date: '2026-10-02'
    },
    {
      id: 'r-102',
      productId: 1,
      userName: 'Sarra M.',
      rating: 4,
      title: {
        fr: 'Très bon rapport qualité/prix',
        ar: 'جودة/سعر ممتاز',
        en: 'Great value for money'
      },
      content: {
        fr: 'Le son est propre et les basses sont basses. J\'aimerais juste un étui un peu plus rigide pour le transport.',
        ar: 'الصوت نقي والباس عميق. أود فقط حقيبة أكثر صلابة للنقل.',
        en: 'Sound is clean and bass is deep. I would just like a slightly sturdier case for travel.'
      },
      verified: true,
      helpful: 11,
      date: '2026-09-21'
    },
    {
      id: 'r-103',
      productId: 4,
      userName: 'Nour T.',
      rating: 5,
      title: {
        fr: 'Ma peau est transformée',
        ar: 'بشرتي تغيرت تماماً',
        en: 'My skin transformed'
      },
      content: {
        fr: 'Après 3 semaines d\'utilisation, les rougeurs ont diminué et la peau est plus lumineuse. Texture pleasant, sans parfum fort.',
        ar: 'بعد 3 أسابيع من الاستخدام، خفّت الاحمرار وأصبحت البشرة أكثر إشراقاً. ملمس ممتاز وبدون رائحة قوية.',
        en: 'After 3 weeks of use, redness faded and skin looks brighter. Pleasant texture, no strong scent.'
      },
      verified: true,
      helpful: 38,
      date: '2026-10-08'
    },
    {
      id: 'r-104',
      productId: 4,
      userName: 'Hiba K.',
      rating: 4,
      title: {
        fr: 'Bien mais un peu cher',
        ar: 'جيد لكن السعر مرتفع قليلاً',
        en: 'Good but a bit pricey'
      },
      content: {
        fr: 'Très efficace sur les taches. Le prix reste un peu élevé pour la quantité, mais le produit est de bonne qualité.',
        ar: 'فعال جداً على البقع. السعر لا يزال مرتفعاً قليلاً مقابل الكمية، لكن جودة المنتج جيدة.',
        en: 'Very effective on dark spots. Price is still a bit high for the amount, but product quality is good.'
      },
      verified: false,
      helpful: 9,
      date: '2026-09-12'
    },
    {
      id: 'r-105',
      productId: 3,
      userName: 'Yassine F.',
      rating: 5,
      title: {
        fr: 'Parfait pour tous les jours',
        ar: 'مثالي للاستخدام اليومي',
        en: 'Perfect for everyday wear'
      },
      content: {
        fr: 'Confortables dès le premier jour, la semelle accroche bien. J\'en ai acheté une deuxième paire.',
        ar: 'مريحة من اليوم الأول، والنعل يلتصق بالأرض جيداً. اشتريت زوجاً ثانياً.',
        en: 'Comfortable from day one, the sole grips well. I bought a second pair.'
      },
      verified: true,
      helpful: 17,
      date: '2026-10-11'
    },
    {
      id: 'r-106',
      productId: 10,
      userName: 'Rania S.',
      rating: 5,
      title: {
        fr: 'Le café est vraiment crémeux',
        ar: 'القهوة كريمية فعلاً',
        en: 'The coffee is genuinely creamy'
      },
      content: {
        fr: 'Mise en route en 2 minutes, et la mousse de lait est aussi bonne qu\'au café professionnel. Je ne peux plus m\'en passer.',
        ar: 'التشغيل خلال دقيقتين، ورغوة الحليب ممتازة كما في المقهى المحترف. لم أعد أستطيع بدونها.',
        en: 'Ready in 2 minutes and the milk foam is top-notch, like a professional café. I cannot go without it now.'
      },
      verified: true,
      helpful: 42,
      date: '2026-10-09'
    },
    {
      id: 'r-107',
      productId: 10,
      userName: 'Mehdi Z.',
      rating: 4,
      title: {
        fr: 'Bon rapport qualité/prix',
        ar: 'جودة/سعر جيدة',
        en: 'Good value for money'
      },
      content: {
        fr: 'Fait un très bon espresso pour le prix. Il faut juste nettoyer le moulin régulièrement.',
        ar: 'يصنع إسبريسو ممتازاً مقابل السعر.，  تنظيف المطحنة بانتظام.',
        en: 'Makes a very good espresso for the price. You just need to clean the grinder regularly.'
      },
      verified: true,
      helpful: 13,
      date: '2026-09-30'
    },
    {
      id: 'r-108',
      productId: 8,
      userName: 'Ines G.',
      rating: 5,
      title: {
        fr: 'Très beau sac, solide',
        ar: 'حقيبة جميلة ومتينة',
        en: 'Beautiful bag, very solid'
      },
      content: {
        fr: 'La matière est belle et le rangement intérieur très bien pensé. Je l\'utilise pour le travail tous les jours.',
        ar: 'المادة جميلة والتنظيم الداخلي مدروس جداً. أستخدمها للعمل كل يوم.',
        en: 'The material is beautiful and the interior layout very well thought out. I use it for work daily.'
      },
      verified: true,
      helpful: 21,
      date: '2026-09-25'
    },
    {
      id: 'r-109',
      productId: 5,
      userName: 'Oussama D.',
      rating: 4,
      title: {
        fr: 'Bonne montre, autonomie， ',
        ar: 'ساعة جيدة، والبطارية تدوم',
        en: 'Good watch, solid battery'
      },
      content: {
        fr: 'L\'écran est très lisible au soleil et le suivi du sommeil est assez précis. Je l\'utilise aussi pour nager.',
        ar: 'الشاشة واضحة جداً تحت الشمس وتتبع النوم دقيق بما يكفي.',
        en: 'The screen is very readable in sunlight and sleep tracking is fairly accurate. I use it for swimming too.'
      },
      verified: false,
      helpful: 8,
      date: '2026-10-03'
    },
    {
      id: 'r-110',
      productId: 12,
      userName: 'Meriem L.',
      rating: 5,
      title: {
        fr: 'Le parfum tient toute la journée',
        ar: 'العطر يدوم طوال اليوم',
        en: 'The scent lasts all day'
      },
      content: {
        fr: 'Très foncé et élégant, j\'ai reçu beaucoup de compliments. Le flacon est très beau aussi.',
        ar: 'نفحة داكنة وأنيقة، تلقيت 많은 المديح. القارورة جميلة جداً أيضاً.',
        en: 'Very deep and elegant, I received a lot of compliments. The bottle is beautiful too.'
      },
      verified: true,
      helpful: 29,
      date: '2026-10-14'
    }
  ];

  /**
   * Get reviews for a product
   * @param {number} productId - Product ID
   * @returns {Array} Array of reviews
   */
  function getForProduct(productId) {
    return seedReviews.filter(r => r.productId === Number(productId));
  }

  /**
   * Get rating breakdown for a product
   * @param {number} productId - Product ID
   * @returns {Object} Breakdown by star count
   */
  function getBreakdown(productId) {
    const reviews = getForProduct(productId);
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => { breakdown[r.rating] = (breakdown[r.rating] || 0) + 1; });
    return breakdown;
  }

  return { seedReviews, getForProduct, getBreakdown };
})();
