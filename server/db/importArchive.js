import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, pool, query } from './index.js';
import { processAndSaveImage } from '../services/imageProcessor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const ARCHIVE_DIR = path.join(ROOT_DIR, '_arkiv');
const CATALOG_PATH = path.join(ARCHIVE_DIR, 'innehall_katalog.json');
const PRODUCT_IMG_DIR = path.join(ARCHIVE_DIR, 'bilder', 'produkter');

// Delade bakgrunds- och ikonbilder från Wix som inte ska hamna i enskilda smyckesgallerier
const IGNORED_PRODUCT_IMAGES = new Set([
  '2574d8_90d132cb85a44b1faa730c5c07ff47b4_mv2_d_2200_1466_s_2.jpg',
  '2574d8_e913187bfabb4dff86a2ffc54a7f82ee_mv2_d_2000_1333_s_2.jpg',
  '9f9c321c774844b793180620472aa4f1.png',
  'hud_02.jpg',
]);

const HERO_SOURCE_IMAGE = '2574d8_90d132cb85a44b1faa730c5c07ff47b4_mv2_d_2200_1466_s_2.jpg';

const GROTDOCKA_STORY =
  'En liten lyckoamulett i form av en grötdocka. Inspirerad av den gamla traditionen från 1920-talet av mandeln i gröten, då mandeln byttes ut mot en liten docka. Grötdockan sades ge lycka till mottagaren. All lycka.';

// Kuraterad katalog baserad på gamla anna-lea.com i ursprunglig visningsordning
const JEWELRY_SEED = [
  // --- SMYCKEN (15 st) ---
  {
    slug: 'gloria-orhange',
    title: 'Gloria Örhänge',
    category: 'smycken',
    price_label: '2 200 kr',
    variants: [],
    description: 'Gloria örhängen tillverkade i sterling silver.\nSmycken tillverkade av Anna-Lea på Södermalm.',
    story: '',
    status: 'available',
  },
  {
    slug: 'gloria-halsband',
    title: 'Gloria',
    category: 'smycken',
    price_label: '2 100 kr',
    variants: [],
    description: 'Gloria halsband tillverkat i sterling silver med lång silverkedja.\nSmycke tillverkat av Anna-Lea på Södermalm.',
    story: '',
    status: 'available',
  },
  {
    slug: 'grotdocka',
    title: 'Grötdocka',
    category: 'smycken',
    price_label: '1 600 kr',
    variants: [],
    description: 'Halsband Grötdocka tillverkat i sterling silver.\nSmycke tillverkat av Anna-Lea på Södermalm.',
    story: GROTDOCKA_STORY,
    status: 'available',
  },
  {
    slug: 'grotdocka-med-hjarta',
    title: 'Grötdocka med guldhjärta',
    category: 'smycken',
    price_label: '2 000 kr',
    variants: [],
    description: 'Halsband Grötdocka med hjärta tillverkat i sterling silver med hjärta av guld.\nSmycke tillverkat av Anna-Lea på Södermalm.',
    story: GROTDOCKA_STORY,
    status: 'available',
  },
  {
    slug: 'grotdocka-diamanthjarta',
    title: 'Grötdocka med diamanthjärta',
    category: 'smycken',
    price_label: '2 000 kr',
    variants: [],
    description: 'Halsband Grötdocka med hjärta av diamant tillverkat i sterling silver.\nSmycke tillverkat av Anna-Lea på Södermalm.',
    story: GROTDOCKA_STORY,
    status: 'available',
  },
  {
    slug: 'varnoga',
    title: 'Värnöga',
    category: 'smycken',
    price_label: '3 500 kr',
    variants: [],
    description: 'Halsband Värnöga i sterling silver med svart stjärndiopsid samt detaljer i rödguld 18k.\nSmycke tillverkat av Anna-Lea på Södermalm.',
    story: '',
    status: 'available',
  },
  {
    slug: 'bubbelgum',
    title: 'Bubbelgum',
    category: 'smycken',
    price_label: '2 500 kr',
    variants: [],
    description: 'Halsband Bubbelgum, collier av rosenkvarts knutna på en uv-rosa silkestråd med en grötdocka av sterling silver.\nSmycke tillverkat av Anna-Lea på Södermalm.',
    story: '',
    status: 'available',
  },
  {
    slug: 'bubbel',
    title: 'Bubbel',
    category: 'smycken',
    price_label: '2 300 kr',
    variants: [],
    description: 'Halsband Bubbel, collier av blåsvarta stenar med en grötdocka av sterling silver.\nSmycke tillverkat av Anna-Lea på Södermalm.',
    story: '',
    status: 'available',
  },
  {
    slug: 'flourit',
    title: 'Fluorit',
    category: 'smycken',
    price_label: '2 400 kr',
    variants: [],
    description: 'Halsband, collier av fluoriter med en grötdocka av sterling silver.\nSmycke tillverkat av Anna-Lea på Södermalm.',
    story: '',
    status: 'available',
  },
  {
    slug: 'forenkling',
    title: 'Förenkling',
    category: 'smycken',
    price_label: 'Från 950 kr',
    variants: [
      { label: 'Armband', price: '1 800 kr' },
      { label: 'Ring', price: '950 kr' },
    ],
    description: 'Armband Förenkling i borstat och oxiderat sterling silver. Storlek efter dina mått.\nRing Förenklad i borstat och oxiderat silver. Storlek efter dina mått.\nSmycken tillverkade av Anna-Lea på Södermalm.',
    story: '',
    status: 'available',
  },
  {
    slug: 'hjartkonturer',
    title: 'Hjärtkonturer',
    category: 'smycken',
    price_label: 'Från 1 600 kr',
    variants: [
      { label: 'Små (vit- eller rödguld 18k)', price: '1 600 kr' },
      { label: 'Stora (vit- eller rödguld 18k)', price: '2 000 kr' },
    ],
    description: 'Örhängen Hjärtkonturer tillverkade i vit- eller rödguld 18k. Tillgängliga i två storlekar.\nSmycken tillverkade av Anna-Lea på Södermalm.',
    story: '',
    status: 'available',
  },
  {
    slug: 'bubbel-hjarta',
    title: 'Bubbelhjärta',
    category: 'smycken',
    price_label: '2 800 kr',
    variants: [],
    description: 'Halsband Bubbelhjärta, hänge i sterling silver med collier av facettslipade granater knutna på en uv-rosa silkestråd.\nSmycke tillverkat av Anna-Lea på Södermalm.',
    story: '',
    status: 'available',
  },
  {
    slug: 'hjartansfrojd',
    title: 'Hjärtansfröjd',
    category: 'smycken',
    price_label: '3 300 kr',
    variants: [],
    description: 'Halsband Hjärta, hänge i sterling silver med rosa safir samt en collier av granater.\nSmycke tillverkat av Anna-Lea på Södermalm.',
    story: '',
    status: 'available',
  },
  {
    slug: 'hjartan',
    title: 'Hjärtan',
    category: 'smycken',
    price_label: '1 600 kr',
    variants: [],
    description: 'Örhängen i borstat sterling silver.\nSmycken tillverkade av Anna-Lea på Södermalm.',
    story: '',
    status: 'available',
  },
  {
    slug: 'bumlingar',
    title: 'Bumlingar',
    category: 'smycken',
    price_label: '2 300 kr',
    variants: [],
    description: 'Halsband Bumlingar, rökkvarts och lås av sterling silver.\nSmycke tillverkat av Anna-Lea på Södermalm.',
    story: '',
    status: 'available',
  },

  // --- UNIKA BESTÄLLNINGAR / VIGSELRINGAR (5 st) ---
  {
    slug: 'viveka',
    title: 'Viveka',
    category: 'unika_bestallningar',
    price_label: 'På förfrågan',
    variants: [],
    description: 'Ring Viveka är tillverkad i återvunnet 23k guld med en naturlig brun diamant, 0.390 ct. Storlek efter dina mått.\nSmycke tillverkat av Anna-Lea på Södermalm.',
    story: 'Önskar ni ett unikt smycke? Skicka en förfrågan så skapar vi ett smycke tillsammans utifrån dina önskemål.',
    status: 'on_request',
  },
  {
    slug: 'ann-helen',
    title: 'Ann-Helen',
    category: 'unika_bestallningar',
    price_label: 'På förfrågan',
    variants: [],
    description: 'Ring Ann-Helen är tillverkad i återvunnet 23k guld med en tanzanit, 1.89 ct.\nSmycke tillverkat av Anna-Lea på Södermalm.',
    story: 'Önskar ni ett unikt smycke? Skicka en förfrågan så skapar vi ett smycke tillsammans utifrån dina önskemål.',
    status: 'on_request',
  },
  {
    slug: 'oandlig',
    title: 'Oändlig',
    category: 'unika_bestallningar',
    price_label: 'På förfrågan',
    variants: [],
    description: 'Ring Oändlig är tillverkad i återvunnet 23k guld med åtta naturligt bruna diamanter, 0.187 ct. Storlek efter dina mått.\nSmycke tillverkat av Anna-Lea på Södermalm.',
    story: 'Önskar ni ett unikt smycke? Skicka en förfrågan så skapar vi ett smycke tillsammans utifrån dina önskemål.',
    status: 'on_request',
  },
  {
    slug: 'kristin',
    title: 'Kristin',
    category: 'unika_bestallningar',
    price_label: 'På förfrågan',
    variants: [],
    description: 'Ring Kristin är en pavé-ring tillverkad i återvunnet 23k guld med naturligt champagnefärgade diamanter, 0.165 ct. Graverat öga med naturligt brun diamant, 0.015 ct.\nSmycke tillverkat av Anna-Lea på Södermalm.',
    story: 'Önskar ni ett unikt smycke? Skicka en förfrågan så skapar vi ett smycke tillsammans utifrån dina önskemål.',
    status: 'on_request',
  },
  {
    slug: 'naringsgrenar',
    title: 'Näringsgrenar',
    category: 'unika_bestallningar',
    price_label: 'På förfrågan',
    variants: [],
    description: 'Ringarna Näringsgrenar är tillverkade i rödguld 18k med vita diamanter. Graverade skyddsögon i ringarna med blå och bruna diamanter.\nSmycken tillverkade av Anna-Lea på Södermalm.',
    story: 'Önskar ni ett unikt smycke? Skicka en förfrågan så skapar vi ett smycke tillsammans utifrån dina önskemål.',
    status: 'on_request',
  },
];

const PAGES_SEED = [
  {
    slug: 'min-syn-pa-smycken',
    title: 'Min syn på smycken',
    content: [
      'Smyckena bär en historia, en liten hemlighet, en dubbel betydelse — kan bli en lyckoamulett.',
      'I arbetet med smyckena läggs stor vikt vid smyckets historia, tradition, hållbarhet och hantverksskicklighet, en process som gör varje smycke till en liten individ. Varje smycke är tillverkat med omsorg av återvunnet sterling silver, massivt guld och etiska ädelstenar.',
      'Det är unika smycken handgjorda i Stockholm.',
      'Glittriga och vackra, stora och bombastiska, små och försynta har smycken alltid trollbundit mig. Jag inspireras av sådant vi ger värde till och som bär på en historia. Jag hoppas mina smycken ska få skapa och kapsla in en ny historia med dig.',
      '/ Anna-Lea Öquist',
    ].join('\n\n'),
  },
  {
    slug: 'om-konsten',
    title: 'Om konsten',
    content: [
      'Här presenteras Anna-Lea Öquists konstverk, bildserier och utställningsprojekt.',
      'Nya verk och projekt läggs enkelt upp via admingränssnittet.',
    ].join('\n\n'),
  },
  {
    slug: 'bestallning-och-storlek',
    title: 'Beställning och storlek',
    content: [
      '## Beställning',
      'Alla produkter skickas via rekommenderat postförskott så betalningen sker på ditt närmaste utlämningsställe för post. Porto tillkommer vid alla beställningar på 100 kr utöver smyckets pris.',
      '## Unika beställningar & vigselringar',
      'Är ni intresserad av en ring under kategorin Unika beställningar skickar ni en förfrågan i formuläret på ringens egen sida. Där anger ni era önskemål och frågor så återkopplar vi med mer information. Vi bestämmer tillsammans hur vi går vidare — ibland är ett personligt möte i ateljén på Södermalm det bästa.',
      '## Hitta rätt storlek',
      'Hör gärna av dig om du vill prova smycket eller mäta ut ringstorlek innan beställning så bokar vi in en tid på smedjan på Högbergsgatan 12.',
    ].join('\n\n'),
  },
  {
    slug: 'returer',
    title: 'Returer',
    content: [
      'Skulle ni mot förmodan inte vara nöjd med ett smycke kan det returneras i upp till 14 dagar efter att ni har mottagit smycket. Ni mailar då till annalea.oquist@gmail.com så att vi informeras om att du vill göra en retur.',
      'Ni får då instruktioner och en returadress. Vid en retur ska alla smycken returneras i nyskick med rekommenderad post som ni själva står för.',
      'När vi mottagit returen kommer en återbetalning att ske.',
    ].join('\n\n'),
  },
  {
    slug: 'allmanna-villkor',
    title: 'Allmänna villkor',
    content: [
      '## Allmänt',
      'Anna-Lea säljer handgjorda och specialbeställda smycken genom webbutik och personliga möten, till privatpersoner och företag. En genomförd beställning innebär att ni klickar på knappen Beställ i formuläret och därigenom godkänner våra villkor.',
      '## Beställning',
      'Smycken beställs via formuläret intill smycket som ni önskar köpa. Skulle smycket ni har beställt endast göras på beställning och ha längre leveranstid hör vi av oss till dig. Undrar ni om storlek eller vill se smyckena i verkligheten kan vi boka in ett möte på ateljén.',
      '## Priser & tryckfel',
      'Alla priser är angivna i SEK inklusive moms (25%). Egna önskemål är ett tillägg som läggs på det ordinarie smyckespriset. Vi står inte för eventuella tryckfel på hemsidan och förbehåller oss rätten att inte ta emot felaktiga beställningar.',
      '## Skatter och avgifter utanför EU',
      'Vid leverans till länder utanför EU kan lokala skatter och avgifter tillkomma. Dessa avgifter står köparen själv för.',
      '## Byte av vara',
      'Vi hanterar byte av en vara som en retur. Kontakta oss på annalea.oquist@gmail.com för att göra en retur med de varor ni vill byta, och gör därefter en ny beställning.',
      '## Leverans & frakt',
      'Vi skickar alla beställningar via rekommenderat postförskott inom Sverige. Leveranstiden kan variera något då vissa smycken tillverkas på beställning. Porto på 100 kr tillkommer utöver smyckets pris.',
      '## Ångerrätt',
      'Är ni inte nöjd med ett smycke kan det returneras i upp till 14 dagar. Maila annalea.oquist@gmail.com för instruktioner och returadress. Smycket returneras i nyskick med rekommenderad post på köparens bekostnad.',
      '## Skadad eller felaktig vara & reklamation',
      'Våra smycken har ett års garanti mot tillverknings- och materialfel (gäller ej slitage, vårdslöst hanterande eller olyckshändelse). Efter ett år är det upp till kunden att kunna visa att felet fanns från början. Kontakta oss så fort du upptäcker ett fel på annalea.oquist@gmail.com så hjälper vi dig.',
    ].join('\n\n'),
  },
];

async function runImport() {
  if (!fs.existsSync(CATALOG_PATH)) {
    throw new Error(`Hittade inte arkivkatalogen på ${CATALOG_PATH}`);
  }

  await initDatabase();

  const rawCatalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  const catalogBySlug = new Map(rawCatalog.map((entry) => [entry.Slug, entry]));

  console.log('📦 Importerar smycken och unika beställningar (hoppar över project-01)...');
  let orderSmycken = 0;
  let orderUnika = 0;
  let importedImages = 0;

  for (const item of JEWELRY_SEED) {
    const sortOrder = item.category === 'smycken' ? orderSmycken++ : orderUnika++;

    const upsertRes = await query(
      `INSERT INTO jewelry_items
        (slug, title, category, price_label, variants, description, story, status, sort_order, is_published)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,TRUE)
       ON CONFLICT (slug) DO UPDATE SET
         title = EXCLUDED.title,
         category = EXCLUDED.category,
         price_label = EXCLUDED.price_label,
         variants = EXCLUDED.variants,
         description = EXCLUDED.description,
         story = EXCLUDED.story,
         status = EXCLUDED.status,
         sort_order = EXCLUDED.sort_order
       RETURNING id`,
      [
        item.slug,
        item.title,
        item.category,
        item.price_label,
        JSON.stringify(item.variants),
        item.description,
        item.story,
        item.status,
        sortOrder,
      ]
    );

    const itemId = upsertRes.rows[0].id;

    // Kontrollera om bilder redan finns för detta smycke (så skriptet kan köras om säkert)
    const existingMedia = await query(
      "SELECT COUNT(*)::int AS count FROM media WHERE entity_type = 'jewelry' AND entity_id = $1",
      [itemId]
    );
    if (existingMedia.rows[0].count > 0) {
      console.log(`  ⏭️  ${item.title}: bilder redan importerade`);
      continue;
    }

    const catalogEntry = catalogBySlug.get(item.slug);
    const rawImages = Array.isArray(catalogEntry?.Bilder)
      ? catalogEntry.Bilder
      : catalogEntry?.Bilder
        ? [catalogEntry.Bilder]
        : [];

    const productImages = rawImages.filter((fname) => !IGNORED_PRODUCT_IMAGES.has(fname));

    let imgOrder = 0;
    for (const filename of productImages) {
      const fullImgPath = path.join(PRODUCT_IMG_DIR, filename);
      if (!fs.existsSync(fullImgPath)) {
        console.warn(`  ⚠️  Saknad bildfil: ${filename}`);
        continue;
      }

      const processed = await processAndSaveImage(
        fullImgPath,
        item.slug,
        `archive-${item.slug}-${imgOrder}`
      );
      await query(
        `INSERT INTO media
          (entity_type, entity_id, url_large, url_thumb, alt_text, width, height, sort_order, is_primary)
         VALUES ('jewelry', $1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          itemId,
          processed.urlLarge,
          processed.urlThumb,
          item.title,
          processed.width,
          processed.height,
          imgOrder,
          imgOrder === 0,
        ]
      );
      imgOrder += 1;
      importedImages += 1;
    }

    console.log(`  ✅ ${item.title} (${imgOrder} optimerade WebP-bilder)`);
  }

  // Importera fasta redigerbara sidor
  console.log('\n📝 Importerar sidor och texter...');
  for (const page of PAGES_SEED) {
    await query(
      `INSERT INTO pages (slug, title, content)
       VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO NOTHING`,
      [page.slug, page.title, page.content]
    );
    console.log(`  ✅ ${page.title} (${page.slug})`);
  }

  // Importera signaturbakgrunden (ljusspelet på hud) som standard-hero om ingen satts ännu
  const themeRes = await query("SELECT value FROM site_settings WHERE key = 'theme'");
  const currentTheme = themeRes.rows[0]?.value || {};
  const heroSourcePath = path.join(PRODUCT_IMG_DIR, HERO_SOURCE_IMAGE);

  if (!currentTheme.heroImageUrl && fs.existsSync(heroSourcePath)) {
    console.log('\n🌅 Optimerar signaturbakgrundsbild för startsidan...');
    const heroProcessed = await processAndSaveImage(
      heroSourcePath,
      'hero-default',
      'archive-hero-default'
    );
    const updatedTheme = { ...currentTheme, heroImageUrl: heroProcessed.urlLarge };
    await query(
      "UPDATE site_settings SET value = $1::jsonb WHERE key = 'theme'",
      [JSON.stringify(updatedTheme)]
    );
    console.log(`  ✅ Standard-hero sparad: ${heroProcessed.urlLarge}`);
  }

  console.log(`\n🎉 Import klar! ${JEWELRY_SEED.length} smycken/ringar och ${importedImages} optimerade bilder importerade.`);
}

runImport()
  .catch((err) => {
    console.error('❌ Importfel:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
