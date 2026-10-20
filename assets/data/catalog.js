/**
 * Product Catalog - K-mart Market Tunisia
 * Prices are stored in millimes (1 TND = 1000 millimes).
 * Names/descriptions carry FR/AR/EN translations for the i18n layer.
 */
window.KMData = (function () {
  const products = [
    {
      id: 1,
      name: { fr: 'Casque Bluetooth Studio', ar: 'سماعة بلوتوث ستوديو', en: 'Studio Bluetooth Headphones' },
      category: 'Électronique',
      brand: 'K-MART',
      price: 129900,
      oldPrice: 149900,
      stock: 24,
      emoji: '🎧',
      bg: '#eef1ff',
      badge: 'POPULAIRE',
      rating: 4.8,
      reviews: 124,
      createdAt: '2026-08-12',
      featured: true,
      onSale: true,
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=560&h=560&q=68',
      description: {
        fr: 'Casque circum-aural sans fil avec réduction de bruit active, 40 h d\'autonomie et Bluetooth 5.3. Coussinets en mousse à mémoire de forme pour un confort longue durée.',
        ar: 'سماعة رأس لاسلكية بالكامل مع إلغاء الضوضاء النشط، بطارية 40 ساعة وبلوتوث 5.3. وسائدات من الإسفنج ذو الذاكرة الشكل لراحة طويلة الأمد.',
        en: 'Fully wireless over-ear headphones with active noise cancellation, 40 h battery life and Bluetooth 5.3. Memory-foam ear cushions for long-session comfort.'
      }
    },
    {
      id: 2,
      name: { fr: 'Lampe de table minimaliste', ar: 'مصباح طاولة بسيط', en: 'Minimalist Table Lamp' },
      category: 'Maison',
      brand: 'Lumira',
      price: 89900,
      oldPrice: 105900,
      stock: 12,
      emoji: '💡',
      bg: '#fff5df',
      badge: '-15%',
      rating: 4.6,
      reviews: 86,
      createdAt: '2026-09-01',
      featured: true,
      onSale: true,
      image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=560&h=560&q=68',
      description: {
        fr: 'Lampe d\'ambiance en métal brossé avec variateur tactile à 3 niveaux. Abat-jour en lin lavé, câble de 1,8 m et ampoule LED incluse.',
        ar: 'مصباح أجواء من المعدن المصقول مع باهت لمسي بثلاث مستويات. غطاء من الكتان المغسول، سلك 1.8 متر ومصباح LED مرفق.',
        en: 'Brushed-metal ambient lamp with a 3-level touch dimmer. Washed-linen shade, 1.8 m cable and LED bulb included.'
      }
    },
    {
      id: 3,
      name: { fr: 'Sneakers Urban Classic', ar: 'حذاء رياضي أوربان كلاسيك', en: 'Urban Classic Sneakers' },
      category: 'Mode',
      brand: 'Tunisia Street',
      price: 159000,
      oldPrice: null,
      stock: 7,
      emoji: '👟',
      bg: '#f4edff',
      badge: 'NOUVEAU',
      rating: 4.7,
      reviews: 58,
      createdAt: '2026-10-02',
      featured: true,
      onSale: false,
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=560&h=560&q=68',
      description: {
        fr: 'Baskets en cuir premium avec semelle amortissante et doublure respirante. Semelle extérieure en caoutchouc antidérapante pour un usage quotidien.',
        ar: 'حذاء رياضي من الجلد الفاخر مع نعل ماص للأصوات وبطانة قابلة للتنفس. نعل خارجي من المطاط المانع للانزلاق للاستخدام اليومي.',
        en: 'Premium leather sneakers with cushioned sole and breathable lining. Anti-slip rubber outsole for everyday wear.'
      }
    },
    {
      id: 4,
      name: { fr: 'Soin visage éclat naturel', ar: 'عناية بالوجه بندي طبيعي', en: 'Natural Radiance Face Care' },
      category: 'Beauté',
      brand: 'Nour',
      price: 45900,
      oldPrice: 59000,
      stock: 38,
      emoji: '🧴',
      bg: '#fceef3',
      badge: 'BEST-SELLER',
      rating: 4.9,
      reviews: 203,
      createdAt: '2026-07-19',
      featured: true,
      onSale: true,
      image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=560&h=560&q=68',
      description: {
        fr: 'Sérum visage à l\'acide hyaluronique et vitamine C. Hydratation 72 h, texture légère non grasse, testé sur peaux sensibles.',
        ar: 'سيروم للوجه بحمض الهيالورونيك وفيتامين سي. ترطيب 72 ساعة، خفيف الملمس غير دهني، مختبر للبشرة الحساسة.',
        en: 'Face serum with hyaluronic acid and vitamin C. 72 h hydration, light non-greasy texture, tested on sensitive skin.'
      }
    },
    {
      id: 5,
      name: { fr: 'Montre connectée Active', ar: 'ساعة ذكية Active', en: 'Active Connected Watch' },
      category: 'Électronique',
      brand: 'K-MART',
      price: 189000,
      oldPrice: null,
      stock: 15,
      emoji: '⌚',
      bg: '#edf7f2',
      badge: 'TENDANCE',
      rating: 4.7,
      reviews: 97,
      createdAt: '2026-09-14',
      featured: true,
      onSale: false,
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=560&h=560&q=68',
      description: {
        fr: 'Montre connectée avec écran AMOLED 1,8", suivi du sommeil, GPS, 120 modes sportifs et 10 jours d\'autonomie. Étanche 5 ATM.',
        ar: 'ساعة ذكية بشاشة AMOLED 1.8 بوصة، تتبع النوم، GPS، 120 وضع رياضي و10 أيام بطارية. مقاومة للماء 5 ATM.',
        en: 'Connected watch with 1.8" AMOLED display, sleep tracking, GPS, 120 sport modes and 10-day battery. 5 ATM water resistant.'
      }
    },
    {
      id: 6,
      name: { fr: 'Gourde isotherme 750 ml', ar: 'قارورة حرارية 750 مل', en: '750 ml Insulated Bottle' },
      category: 'Sport',
      brand: 'HydroT',
      price: 32900,
      oldPrice: 39900,
      stock: 64,
      emoji: '🥤',
      bg: '#eaf5fb',
      badge: 'PETIT PRIX',
      rating: 4.5,
      reviews: 72,
      createdAt: '2026-06-28',
      featured: false,
      onSale: true,
      image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=560&h=560&q=68',
      description: {
        fr: 'Gourde inox double paroi sans vide, garde le froid 24 h et le chaud 12 h. Compatible_glacière et lave-vaisselle.',
        ar: 'قارورة ستانلس ستيل بجدار مزدوج بدون فراغ، تحافظ على البرودة 24 ساعة والسخونة 12 ساعة. متوافقة مع حافظات الثلج وبغسالة الأطباق.',
        en: 'Double-wall vacuum stainless steel bottle, keeps drinks cold 24 h and hot 12 h. Cooler-compatible and dishwasher safe.'
      }
    },
    {
      id: 7,
      name: { fr: 'Coussin déco texturé', ar: 'وسادة ديكور مجسمة', en: 'Textured Decorative Cushion' },
      category: 'Maison',
      brand: 'Dar Deco',
      price: 39900,
      oldPrice: null,
      stock: 42,
      emoji: '🛋️',
      bg: '#fff0e8',
      badge: 'COUP DE CŒUR',
      rating: 4.6,
      reviews: 41,
      createdAt: '2026-05-30',
      featured: false,
      onSale: false,
      image: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=560&h=560&q=68',
      description: {
        fr: 'Coussin 45×45 cm en polyester recyclé, tissage irrégulier et pompons assortis. Doublure amovible et lavable à 30 °C.',
        ar: 'وسادة 45×45 سم من البوليستر المعاد تدويره، نسيج غير منتظم وشراشيب متناسقة. بطانة قابلة للنزع والغسل على 30 درجة.',
        en: '45×45 cm cushion in recycled polyester, irregular weave and matching tassels. Removable washable cover, wash at 30 °C.'
      }
    },
    {
      id: 8,
      name: { fr: 'Sac quotidien essentiel', ar: 'حقيبة يومية أساسية', en: 'Essential Everyday Bag' },
      category: 'Mode',
      brand: 'Tunisia Street',
      price: 99900,
      oldPrice: 119900,
      stock: 19,
      emoji: '👜',
      bg: '#f7f0e8',
      badge: 'SÉLECTION',
      rating: 4.8,
      reviews: 112,
      createdAt: '2026-08-05',
      featured: true,
      onSale: true,
      image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=560&h=560&q=68',
      description: {
        fr: 'Sac à main structuré en grain de puissance, trois compartiments zippés, bandoulière amovible et poche intérieure plaquée.',
        ar: 'حقيبة يد منظمة بحبيبات قوية، ثلاثة جيوب بسحّاب، حزام كتف قابل للنزع وجيب داخلي مبطن.',
        en: 'Structured pebbled-grain handbag, three zipped compartments, detachable strap and lined inner pocket.'
      }
    },
    {
      id: 9,
      name: { fr: 'Écran smart 43" 4K', ar: 'شاشة ذكية 43 بوصة 4K', en: '43" 4K Smart TV' },
      category: 'Électronique',
      brand: 'K-MART',
      price: 649000,
      oldPrice: 799000,
      stock: 5,
      emoji: '📺',
      bg: '#e8f0ff',
      badge: 'PETIT PRIX',
      rating: 4.6,
      reviews: 34,
      createdAt: '2026-09-25',
      featured: true,
      onSale: true,
      image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=560&h=560&q=68',
      description: {
        fr: 'TV LED 4K UHD 43 pouces, HDR10+, traitement audio Dolby et 3 ports HDMI. Smart TV avec assistants et applications intégrées.',
        ar: 'تلفزيون LED 4K UHD قياس 43 بوصة، HDR10+، معالجة صوت Dolby و3 منافذ HDMI. تلفزيون ذكي مع تطبيقات مدمجة.',
        en: '43-inch 4K UHD LED TV with HDR10+, Dolby audio processing and 3 HDMI ports. Smart TV with built-in apps.'
      }
    },
    {
      id: 10,
      name: { fr: 'Machine à café à grains', ar: 'آلة قهوة بحبوب', en: 'Bean-to-Cup Coffee Machine' },
      category: 'Maison',
      brand: 'Barista Home',
      price: 289000,
      oldPrice: null,
      stock: 9,
      emoji: '☕',
      bg: '#f3ece4',
      badge: 'TENDANCE',
      rating: 4.8,
      reviews: 128,
      createdAt: '2026-10-05',
      featured: true,
      onSale: false,
      image: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=560&h=560&q=68',
      description: {
        fr: 'Moulin à café intégré, 15 bars, mousseur à lait automatique et 2 tasses. Réservoir d\'eau 1,8 L, programs memorisés.',
        ar: 'مطحنة قهوة مدمجة، 15 بار، رغوة حليب تلقائية وكوبان. خزان ماء 1.8 لتر، برامج محفوظة.',
        en: 'Integrated grinder, 15-bar pump, automatic milk frother and 2 cups. 1.8 L water tank with saved programs.'
      }
    },
    {
      id: 11,
      name: { fr: 'Tapis de yoga antidérapant', ar: 'حصيرة يوغا مانعة للانزلاق', en: 'Non-Slip Yoga Mat' },
      category: 'Sport',
      brand: 'MoveT',
      price: 54900,
      oldPrice: 69000,
      stock: 31,
      emoji: '🧘',
      bg: '#e6f5ec',
      badge: 'COUP DE CŒUR',
      rating: 4.7,
      reviews: 76,
      createdAt: '2026-08-21',
      featured: false,
      onSale: true,
      image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?auto=format&fit=crop&w=560&h=560&q=68',
      description: {
        fr: 'Tapis 6 mm en TPE sans latex, surface texturée antidérapante, marquage d\'alignement et sangle de transport.',
        ar: 'حصيرة 6 مم من TPE خالية من اللاتكس، سطح محكم مانع للانزلاق، علامات محاذاة وحزام نقل.',
        en: '6 mm latex-free TPE mat, textured anti-slip surface, alignment markers and carry strap.'
      }
    },
    {
      id: 12,
      name: { fr: 'Parfum Eau de Parfum 100 ml', ar: 'عطر أو دو بارفان 100 مل', en: 'Eau de Parfum 100 ml' },
      category: 'Beauté',
      brand: 'Nour',
      price: 139000,
      oldPrice: null,
      stock: 18,
      emoji: '🌸',
      bg: '#fdeef4',
      badge: 'NOUVEAU',
      rating: 4.9,
      reviews: 67,
      createdAt: '2026-10-10',
      featured: true,
      onSale: false,
      image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=560&h=560&q=68',
      description: {
        fr: 'Sillage floral-fruité avec notes de bergamote, framboise et musc blanc. Tenue jusqu\'à 8 h, flacon en verre dépoli.',
        ar: 'نفحات زهرية فواكهه مع نفحات البرغموت والتوت والمسك الأبيض. ثبات حتى 8 ساعات، قارورة زجاجية معتمة.',
        en: 'Floral-fruity trail with bergamot, raspberry and white musk notes. Up to 8 h longevity, frosted glass bottle.'
      }
    },
    {
      id: 13,
      name: { fr: 'Lampe de chevet rotin', ar: 'مصباح جانب من خيزران', en: 'Rattan Bedside Lamp' },
      category: 'Maison',
      brand: 'Dar Deco',
      price: 74900,
      oldPrice: null,
      stock: 14,
      emoji: '🪔',
      bg: '#fdf3e5',
      badge: 'SÉLECTION',
      rating: 4.5,
      reviews: 33,
      createdAt: '2026-07-08',
      featured: false,
      onSale: false,
      image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=560&h=560&q=68',
      description: {
        fr: 'Abat-jour tressé en rotin naturel sur piètement en bois massif. Câble d\'alimentation et ampoule E27 incluse.',
        ar: 'غطاء مضفر من خيزران طبيعي على قاعدة خشب صلب. سلك طاقة ومصباح E27 مرفق.',
        en: 'Natural rattan-woven shade on a solid wood base. Power cord and E27 bulb included.'
      }
    },
    {
      id: 14,
      name: { fr: 'Veste coupe-vent légère', ar: 'سترة واقية خفيفة', en: 'Lightweight Windbreaker' },
      category: 'Mode',
      brand: 'Tunisia Street',
      price: 119900,
      oldPrice: 149900,
      stock: 22,
      emoji: '🧥',
      bg: '#eef0f6',
      badge: '-15%',
      rating: 4.4,
      reviews: 49,
      createdAt: '2026-09-18',
      featured: false,
      onSale: true,
      image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=560&h=560&q=68',
      description: {
        fr: 'Veste déperlante et respirante, capuche intégrée, poches zippées. Se replie dans sa propre poche.',
        ar: 'سترة طاردة للماء وقابلة للتنفس، بقبة مدمجة، جيوب بسحّاب. تُطوى في جيبها.',
        en: 'Water-repellent breathable jacket, packable hood, zipped pockets. Folds into its own pocket.'
      }
    },
    {
      id: 15,
      name: { fr: 'Enceinte Bluetooth étanche', ar: 'سماعة بلوتوث مقاومة للماء', en: 'Waterproof Bluetooth Speaker' },
      category: 'Électronique',
      brand: 'K-MART',
      price: 79900,
      oldPrice: 99900,
      stock: 27,
      emoji: '🔊',
      bg: '#e6f4fa',
      badge: 'POPULAIRE',
      rating: 4.7,
      reviews: 143,
      createdAt: '2026-08-30',
      featured: true,
      onSale: true,
      image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=560&h=560&q=68',
      description: {
        fr: 'Enceinte portable IPX7, 20 W RMS, application avec BassBoost et 14 h d\'autonomie. Deux enceintes peuvent s\'appairer en stéréo.',
        ar: 'مكبر محمول IPX7، 20 واط RMS، تطبيق مع تعزيز الباس و14 ساعة بطارية. يمكن ربط مكبرين للستيريو.',
        en: 'Portable IPX7 speaker, 20 W RMS, companion app with BassBoost and 14 h battery. Pair two for stereo.'
      }
    },
    {
      id: 16,
      name: { fr: 'Sérum anti-âge rétinol', ar: 'سيروم مكافحة الشيخوخة بالريتينول', en: 'Anti-Ageing Retinol Serum' },
      category: 'Beauté',
      brand: 'Nour',
      price: 119000,
      oldPrice: null,
      stock: 21,
      emoji: '✨',
      bg: '#f6eefb',
      badge: 'TENDANCE',
      rating: 4.8,
      reviews: 95,
      createdAt: '2026-09-28',
      featured: true,
      onSale: false,
      image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=560&h=560&q=68',
      description: {
        fr: 'Rétinol encapsulé 0,3 % avec niacinamide et peptides. Réduit visiblement les rides et unifie le teint en 4 semaines.',
        ar: 'ريتينول مغلف 0.3% مع نياسيناميد وببتيدات. يقلل التجاعيد بوضوح ويوحّد لون البشرة في 4 أسابيع.',
        en: 'Encapsulated 0.3% retinol with niacinamide and peptides. Visibly reduces wrinkles and evens tone in 4 weeks.'
      }
    }
  ];

  const categories = [
    { id: 'Tous', name: { fr: 'Toutes les catégories', ar: 'جميع الفئات', en: 'All categories' }, emoji: '☰' },
    { id: 'Électronique', name: { fr: 'Électronique', ar: 'إلكترونيات', en: 'Electronics' }, emoji: '🎧' },
    { id: 'Maison', name: { fr: 'Maison', ar: 'منزل', en: 'Home' }, emoji: '🏡' },
    { id: 'Mode', name: { fr: 'Mode', ar: 'أزياء', en: 'Fashion' }, emoji: '👟' },
    { id: 'Beauté', name: { fr: 'Beauté', ar: 'جمال', en: 'Beauty' }, emoji: '✨' },
    { id: 'Sport', name: { fr: 'Sport & loisirs', ar: 'رياضة وترفيه', en: 'Sports & leisure' }, emoji: '🏃' }
  ];

  const brands = ['K-MART', 'Lumira', 'Tunisia Street', 'Nour', 'Dar Deco', 'HydroT', 'MoveT', 'Barista Home'];

  const governorates = [
    { value: 'tunis', label: { fr: 'Tunis', ar: 'تونس', en: 'Tunis' } },
    { value: 'ariana', label: { fr: 'Ariana', ar: 'أريانة', en: 'Ariana' } },
    { value: 'ben_arous', label: { fr: 'Ben Arous', ar: 'بن عروس', en: 'Ben Arous' } },
    { value: 'manouba', label: { fr: 'Manouba', ar: 'منوبة', en: 'Manouba' } },
    { value: 'nabeul', label: { fr: 'Nabeul', ar: 'نابل', en: 'Nabeul' } },
    { value: 'zaghouan', label: { fr: 'Zaghouan', ar: 'زغوان', en: 'Zaghouan' } },
    { value: 'bizerte', label: { fr: 'Bizerte', ar: 'بنزرت', en: 'Bizerte' } },
    { value: 'beja', label: { fr: 'Béja', ar: 'باجة', en: 'Beja' } },
    { value: 'jendouba', label: { fr: 'Jendouba', ar: 'جندوبة', en: 'Jendouba' } },
    { value: 'kef', label: { fr: 'Le Kef', ar: 'الكاف', en: 'Le Kef' } },
    { value: 'siliana', label: { fr: 'Siliana', ar: 'سليانة', en: 'Siliana' } },
    { value: 'kairouan', label: { fr: 'Kairouan', ar: 'القيروان', en: 'Kairouan' } },
    { value: 'kassab', label: { fr: 'Kassab', ar: 'القس', en: 'Kassab' } },
    { value: 'sfax', label: { fr: 'Sfax', ar: 'صفاقس', en: 'Sfax' } },
    { value: 'mahdia', label: { fr: 'Mahdia', ar: 'المهدية', en: 'Mahdia' } },
    { value: 'gabes', label: { fr: 'Gabès', ar: 'قابس', en: 'Gabes' } },
    { value: 'tozeur', label: { fr: 'Tozeur', ar: 'توزر', en: 'Tozeur' } },
    { value: 'kebili', label: { fr: 'Kébili', ar: 'قبلي', en: 'Kebili' } },
    { value: 'medenine', label: { fr: 'Médenine', ar: 'مدنين', en: 'Medenine' } },
    { value: 'tataouine', label: { fr: 'Tataouine', ar: 'تطاوين', en: 'Tataouine' } }
  ];

  const paymentMethods = [
    { id: 'cod', icon: '💵' },
    { id: 'card', icon: '💳' },
    { id: 'mobile', icon: '📱' }
  ];

  const shippingRates = [
    { id: 'standard', label: { fr: 'Standard (2-4 jours)', ar: 'عادي (2-4 أيام)', en: 'Standard (2-4 days)' }, price: 700 },
    { id: 'express', label: { fr: 'Express (24-48 h)', ar: 'سريع (24-48 ساعة)', en: 'Express (24-48 h)' }, price: 1500 }
  ];

  /**
   * Get localized product name
   * @param {Object} product - Product object
   * @param {string} lang - Language code
   * @returns {string}
   */
  function productName(product, lang) {
    return (product.name && product.name[lang]) || product.name.fr;
  }

  function productDescription(product, lang) {
    return (product.description && product.description[lang]) || product.description.fr;
  }

  return { products, categories, brands, governorates, paymentMethods, shippingRates, productName, productDescription };
})();
