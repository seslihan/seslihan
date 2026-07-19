const express = require('express');
const http = require('http');
const https = require('https');
const path = require('path');
const { Server } = require('socket.io');
const multer = require('multer');
const { customAlphabet } = require('nanoid');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const MAX_USERS_PER_ROOM = 8;
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;
const CHUNK_SIZE = 8 * 1024 * 1024;

const roomCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

const app = express();
app.use(express.json({ limit: '10mb' }));

const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 105 * 1024 * 1024,
  pingTimeout: 25000,
  pingInterval: 20000
});

const uploadDir = path.join(__dirname, 'public', 'uploads');
const chunkDir = path.join(uploadDir, '.chunks');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(chunkDir)) fs.mkdirSync(chunkDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, safe + path.extname(file.originalname || '.bin'));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: CHUNK_SIZE + 1024 }
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadDir));

app.get('/api/config', (req, res) => {
  res.json({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      { urls: 'stun:stun.miwifi.com:3478' },
      { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
    ],
    maxUsers: MAX_USERS_PER_ROOM,
    chunkSize: CHUNK_SIZE,
    maxFileSize: MAX_FILE_SIZE
  });
});

const RADIO_WHITELIST = [
  'radyotvonline.com', 'radyotvonline.net', 'streamtheworld.com', 'radyositesihazir.com',
  'powerapp.com.tr', 'listenpowerapp.com', 'powergroup.com.tr',
  'icecast', 'cdnvideo.ru', 'radyohizmeti.com',
  'channels.dinamo.fm', 'radyofenomen.com', 'radyono.com',
  'liderhost.com.tr', 'anadolu.liderhost.com.tr',
  'radyomoda.com.tr', 'radiolight.net', 'seyrdijital.com',
  '46.20.3.250', '46.20.3.231', '46.20.3.230', '37.247.98.8'
];

app.get('/api/radio-proxy', (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('Missing url');
  let parsed;
  try { parsed = new URL(url); } catch { return res.status(400).send('Invalid URL'); }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return res.status(400).send('Bad protocol');
  if (!RADIO_WHITELIST.some(d => parsed.hostname.includes(d))) return res.status(403).send('Domain not allowed');

  const fetchMod = parsed.protocol === 'https:' ? https : http;
  const proxyReq = fetchMod.get(url, { timeout: 8000 }, (proxyRes) => {
    if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
      const redirect = new URL(proxyRes.headers.location, url);
      const redirMod = redirect.protocol === 'https:' ? https : http;
      const redirReq = redirMod.get(redirect.href, { timeout: 8000 }, (redirRes) => {
        res.writeHead(redirRes.statusCode, {
          'Content-Type': redirRes.headers['content-type'] || 'audio/mpeg',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });
        redirRes.pipe(res);
      });
      redirReq.on('error', () => { try { res.status(502).send('Redirect error'); } catch {} });
      redirReq.on('timeout', () => { redirReq.destroy(); try { res.status(504).send('Timeout'); } catch {} });
      return;
    }
    res.writeHead(proxyRes.statusCode, {
      'Content-Type': proxyRes.headers['content-type'] || 'audio/mpeg',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    proxyRes.pipe(res);
  });
  proxyReq.on('error', (e) => { try { res.status(502).send('Upstream error: ' + e.message); } catch {} });
  proxyReq.on('timeout', () => { proxyReq.destroy(); try { res.status(504).send('Timeout'); } catch {} });
  req.on('close', () => { proxyReq.destroy(); });
});

app.get('/api/news/:category', (req, res) => {
  const FEEDS = {
    world: [
      'https://feeds.bbci.co.uk/news/world/rss.xml',
      'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
      'https://www.aljazeera.com/xml/rss/all.xml',
      'https://news.google.com/rss/search?q=world+news&hl=en&gl=US&ceid=US:en'
    ],
    ai: [
      'https://www.technologyreview.com/feed/',
      'https://feeds.arstechnica.com/arstechnica/technology-lab',
      'https://www.wired.com/feed/tag/ai/latest/rss',
      'https://news.google.com/rss/search?q=artificial+intelligence&hl=tr&gl=TR&ceid=TR:tr'
    ],
    turkey: [
      'https://www.cnnturk.com/feed/rss/all/news',
      'https://www.trthaber.com/sondakika.rss',
      'https://www.sozcu.com.tr/rss/all.xml',
      'https://www.milliyet.com.tr/rss/rssnew/gundemrss.xml',
      'https://www.aa.com.tr/tr/rss/default?cat=guncel',
      'https://news.google.com/rss/search?q=t%C3%BCrkiye+gundem&hl=tr&gl=TR&ceid=TR:tr'
    ]
  };
  const feeds = FEEDS[req.params.category];
  if (!feeds) return res.status(400).json({ error: 'Unknown category' });

  const fetchFeed = (url) => new Promise((resolve) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { timeout: 6000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' } }, (r) => {
      const chunks = [];
      r.on('data', c => chunks.push(c));
      r.on('end', () => {
        const data = Buffer.concat(chunks).toString('utf8');
        const items = [];
        const entries = data.split(/<item>|<entry>/i).slice(1, 8);
        entries.forEach(entry => {
          const title = (entry.match(/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i) || [])[1] || '';
          const link = (entry.match(/<link[^>]*>([^<]*)<\/link>/i) || entry.match(/<link[^>]*href="([^"]*)"/i) || [])[1] || '#';
          const desc = (entry.match(/<description[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/i) || [])[1] || '';
          const pubDate = (entry.match(/<pubDate[^>]*>(.*?)<\/pubDate>/i) || entry.match(/<published[^>]*>(.*?)<\/published>/i) || [])[1] || '';
          const source = (entry.match(/<source[^>]*>(.*?)<\/source>/i) || [])[1] || '';
          items.push({ title: title.replace(/<[^>]*>/g, '').trim(), link: link.trim(), desc: desc.replace(/<[^>]*>/g, '').trim().substring(0, 200), pubDate, source: source.replace(/<[^>]*>/g, '').trim() });
        });
        resolve(items);
      });
    }).on('error', () => resolve([])).on('timeout', function() { this.destroy(); resolve([]); });
  });

  Promise.all(feeds.map(fetchFeed)).then(results => {
    const all = results.flat().sort(() => Math.random() - 0.5).slice(0, 15);
    res.json({ items: all, time: new Date().toISOString() });
  });
});

app.get('/api/stock', (req, res) => {
  const fetchJSON = (url) => new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { timeout: 6000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
      const chunks = [];
      r.on('data', c => chunks.push(c));
      r.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { resolve(null); } });
    }).on('error', () => resolve(null)).on('timeout', function() { this.destroy(); resolve(null); });
  });

  const fetchText = (url) => new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { timeout: 6000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
      const chunks = [];
      r.on('data', c => chunks.push(c));
      r.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', () => resolve('')).on('timeout', function() { this.destroy(); resolve(''); });
  });

  Promise.all([
    fetchJSON('https://api.btcturk.com/api/v2/ticker'),
    fetchJSON('https://finans.truncgil.com/today.json')
  ]).then(([btcturk, finans]) => {
    const result = [];

    if (btcturk && btcturk.data) {
      const btc = btcturk.data.find(t => t.pair === 'BTCTRY');
      const eth = btcturk.data.find(t => t.pair === 'ETHTRY');
      if (btc) result.push({ sym: 'BTC/TRY', val: btc.last, chg: parseFloat(btc.dailyPercent) || 0 });
      if (eth) result.push({ sym: 'ETH/TRY', val: eth.last, chg: parseFloat(eth.dailyPercent) || 0 });
    }

    if (finans) {
      const tryParse = (k) => {
        const item = finans[k];
        if (!item) return null;
        const entries = Object.entries(item);
        let saleVal = null, chgVal = 0;
        for (const [rk, rv] of entries) {
          const v = String(rv);
          if (v.includes('%')) {
            chgVal = parseFloat(v.replace(/%/g, '').replace(',', '.')) || 0;
          } else if (v !== 'Döviz' && v !== 'Altın' && v !== 'Doviz') {
            const num = parseFloat(v.replace(/[$]/g, '').replace(/\./g, '').replace(',', '.'));
            if (num && num > 0) {
              if (!saleVal || num > saleVal) saleVal = num;
            }
          }
        }
        if (saleVal) return { val: saleVal, chg: chgVal };
        return null;
      };
      const items = [
        ['USD', 'USD/TRY'], ['EUR', 'EUR/TRY'], ['GBP', 'GBP/TRY'], ['CHF', 'CHF/TRY'],
        ['gram-altin', 'GRAM ALTIN'], ['cumhuriyet-altini', 'CUMH. ALTIN'],
        ['ceyrek-altin', 'CEYREK'], ['ons', 'ONS ALTIN']
      ];
      for (const [k, sym] of items) {
        const p = tryParse(k);
        if (p) result.push({ sym, val: p.val, chg: p.chg });
      }
    }

    if (result.length === 0) return res.status(502).json({ error: 'No data' });
    res.json({ items: result, time: new Date().toISOString() });
  }).catch(() => res.status(502).json({ error: 'Fetch failed' }));
});

const TURKEY_CITIES = [
  ["ADANA",9146],["ADIYAMAN",9158],["AFYONKARAHİSAR",9167],["AĞRI",9185],["AKSARAY",9193],
  ["AMASYA",9198],["ANKARA",9206],["ANTALYA",9225],["ARDAHAN",9238],["ARTVİN",9246],
  ["AYDIN",9252],["BALIKESİR",9270],["BARTIN",9285],["BATMAN",9288],["BAYBURT",9295],
  ["BİLECİK",9297],["BİNGÖL",9303],["BİTLİS",9311],["BOLU",9315],["BURDUR",9327],
  ["BURSA",9335],["ÇANAKKALE",9352],["ÇANKIRI",9359],["ÇORUM",9370],["DENİZLİ",9392],
  ["DİYARBAKIR",9402],["DÜZCE",9414],["EDİRNE",9419],["ELAZIĞ",9432],["ERZİNCAN",9440],
  ["ERZURUM",9451],["ESKİŞEHİR",9470],["GAZİANTEP",9479],["GİRESUN",9494],["GÜMÜŞHANE",9501],
  ["HAKKARİ",9507],["HATAY",9515],["IĞDIR",9522],["ISPARTA",9528],["İSTANBUL",9541],
  ["İZMİR",9560],["KAHRAMANMARAŞ",9577],["KARABÜK",9581],["KARAMAN",9587],["KARS",9594],
  ["KASTAMONU",9609],["KAYSERİ",9620],["KIRIKKALE",9635],["KIRKLARELİ",9638],["KIRŞEHİR",9646],
  ["KİLİS",9629],["KOCAELİ",9654],["KONYA",9676],["KÜTAHYA",9689],["MALATYA",9703],
  ["MANİSA",9716],["MARDİN",9726],["MERSİN",9737],["MUĞLA",9747],["MUŞ",9755],
  ["NEVŞEHİR",9760],["NİĞDE",9766],["ORDU",9782],["OSMANİYE",9788],["RİZE",9799],
  ["SAKARYA",9807],["SAMSUN",9819],["SİİRT",9839],["SİNOP",9847],["SİVAS",9868],
  ["ŞANLIURFA",9831],["ŞIRNAK",9854],["TEKİRDAĞ",9879],["TOKAT",9887],["TRABZON",9905],
  ["TUNCELİ",9914],["UŞAK",9919],["VAN",9930],["YALOVA",9935],["YOZGAT",9949],["ZONGULDAK",9955]
];

app.get('/api/iller', (req, res) => {
  res.json(TURKEY_CITIES.map(([name, id]) => ({ name, id })));
});

app.get('/api/namaz', (req, res) => {
  const locationId = req.query.location_id || 9541;
  const url = `https://prayertimes.api.abdus.dev/api/diyanet/prayertimes?location_id=${locationId}`;
  https.get(url, { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
    const chunks = [];
    r.on('data', c => chunks.push(c));
    r.on('end', () => {
      try {
        const raw = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        const items = Array.isArray(raw) ? raw : [];
        const mapped = items.map(d => ({
          date: d.date,
          timings: {
            imsak: d.fajr,
            gunes: d.sun,
            ogle: d.dhuhr,
            ikindi: d.asr,
            aksam: d.maghrib,
            yatsi: d.isha
          }
        }));
        res.json({ data: mapped });
      } catch { res.status(502).json({ error: 'Parse error' }); }
    });
  }).on('error', () => res.status(502).json({ error: 'Prayer times fetch failed' }));
});

const WISDOMS = [
  { type: 'ayet', text: 'İnsanları hidayete eriştirmek senin görevin değildir. Allah dilediğini saptırır, dilediğini hidayete erdirir.', source: 'Yûnus, 10/99' },
  { type: 'hadis', text: 'Sizden biriniz kendisi için istediğini, mümin kardeşi için de istemedikçe gerçekten iman etmiş olmaz.', source: 'Buhârî, İmân, 7' },
  { type: 'ayet', text: 'Her zorluğun yanında bir kolaylık vardır. Evet, her zorluğun yanında bir kolaylık vardır.', source: 'İnşirâh, 94/5-6' },
  { type: 'hadis', text: 'Müslüman, dilinden ve elinden Müslümanların güvende olduğu kimsedir.', source: 'Buhârî, İmân, 4' },
  { type: 'ayet', text: 'Şüphesiz Allah, adaleti, iyiliği ve akrabaya yardım etmeyi emreder.', source: 'Nahl, 16/90' },
  { type: 'hadis', text: 'Kolaylaştırınız, zorlaştırmayınız. Müjdeleyiniz, nefret ettirmeyiniz.', source: 'Buhârî, İlim, 12' },
  { type: 'ayet', text: 'Allah, sabredenleri sever. Sabır, acı bir şeyin yudumlanması gibidir, sonu baldan tatlıdır.', source: 'Âl-i İmrân, 3/146' },
  { type: 'hadis', text: 'Güzel söz sadakadır. Her iyi şey sadakadır.', source: 'Müslim, Birr, 56' },
  { type: 'ayet', text: 'Kim Allah\'tan korkarsa, Allah ona bir çıkış yolu açar.', source: 'Talâk, 65/2-3' },
  { type: 'hadis', text: 'Cennet annelerin ayakları altındadır.', source: 'Nesâî, Cennet, 3' },
  { type: 'ayet', text: 'Rabbimiz! Bize dünyada da iyilik ver, ahirette de iyilik ver.', source: 'Bakara, 2/201' },
  { type: 'hadis', text: 'İnsanlara merhamet edene Allah merhamet eder.', source: 'Tirmizî, Kader, 15' },
  { type: 'ayet', text: 'Doğrusu insana ancak çalıştığının karşılığı vardır.', source: 'Necm, 53/39' },
  { type: 'hadis', text: 'Ameller niyetlere göredir. Herkese niyet ettiği şey vardır.', source: 'Buhârî, İkrah, 1' },
  { type: 'ayet', text: 'Unutma ki, zafer sabredenlerin, zafer Allah\'a güvenenlerindir.', source: 'Âl-i İmrân, 3/160' },
  { type: 'hadis', text: 'Temizlik imanın yarısıdır.', source: 'Müslim, Tahâret, 1' },
  { type: 'ayet', text: 'İman edip salih amel işleyenlerin kalplerini Allah\'ın zikriyle teskin et.', source: 'Ra\'d, 13/28' },
  { type: 'hadis', text: 'İnsanların en hayırlısı, insanlara en faydalı olandır.', source: 'Taberânî, Mu\'cemü\'l-Kebîr, 1/28' },
  { type: 'ayet', text: 'Rabbiniz buyurdu ki: Bana dua edin, size cevap vereyim.', source: 'Mü\'minûn, 23/60' },
  { type: 'hadis', text: 'Gülümsemeniz de bir sadakadır.', source: 'Tirmizî, Zühd, 35' },
  { type: 'ayet', text: 'Biz insanı en güzel surette yarattık.', source: 'Tîn, 95/4-6' },
  { type: 'hadis', text: 'Kıyamet gününde kulların Allah\'ın huzuruna çıkacakları ilk soru namazları hakkındadır.', source: 'Tirmizî, Salât, 1' },
  { type: 'ayet', text: 'Sabret! Çünkü Allah\'ın vaadi gerçeğin ta kendisidir.', source: 'Kehf, 18/110' },
  { type: 'hadis', text: 'İnsanların en olgun olanı, ahlakı en güzel olanıdır.', source: 'İbn Mâce, Zühd, 9' },
  { type: 'ayet', text: 'Allah\'ın indinde en şerefliniz, en takva sahibi olanınızdır.', source: 'Hucurât, 49/13' },
  { type: 'hadis', text: 'Mümin müminin aynasıdır.', source: 'Ebû Dâvûd, Edeb, 48' },
  { type: 'ayet', text: 'Sizi yaratan, rızıklandıran, öldüren ve dirilten Allah\'tır.', source: 'En\'âm, 6/54' },
  { type: 'hadis', text: 'Dua ibadetin özüdür.', source: 'Tirmizî, Du\'a, 1' },
  { type: 'ayet', text: 'İman edenleri ve salih amel işleyenleri bağışlar.', source: 'Âl-i İmrân, 3/15' },
  { type: 'hadis', text: 'İnsanların en akıllısı, ahireti için en çok çalışanıdır.', source: 'Taberânî, Mu\'cemü\'l-Evsat, 1/165' }
];

app.get('/api/wisdom', (req, res) => {
  const hour = new Date().getHours();
  const idx = hour % WISDOMS.length;
  res.json(WISDOMS[idx]);
});

app.get('/api/tv-rss/:cid', (req, res) => {
  const cid = req.params.cid;
  if (!cid || !cid.startsWith('UC') || cid.length !== 24) return res.status(400).json({ videoId: null });

  function tryRSS() {
    return new Promise(resolve => {
      const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${cid}`;
      https.get(feedUrl, { timeout: 6000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (r) => {
        const chunks = [];
        r.on('data', c => chunks.push(c));
        r.on('end', () => {
          const data = Buffer.concat(chunks).toString('utf8');
          const vidMatch = data.match(/<yt:videoId>([\w-]+)<\/yt:videoId>/);
          resolve(vidMatch ? vidMatch[1] : null);
        });
      }).on('error', () => resolve(null)).on('timeout', function() { this.destroy(); resolve(null); });
    });
  }

  function tryScrape() {
    return new Promise(resolve => {
      const pageUrl = `https://www.youtube.com/channel/${cid}`;
      https.get(pageUrl, { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9' } }, (r) => {
        const chunks = [];
        r.on('data', c => chunks.push(c));
        r.on('end', () => {
          const data = Buffer.concat(chunks).toString('utf8');
          const vidMatch = data.match(/"videoId"\s*:\s*"([\w-]{11})"/);
          resolve(vidMatch ? vidMatch[1] : null);
        });
      }).on('error', () => resolve(null)).on('timeout', function() { this.destroy(); resolve(null); });
    });
  }

  tryRSS().then(vid => {
    if (vid) return res.json({ videoId: vid });
    return tryScrape().then(vid2 => res.json({ videoId: vid2 }));
  });
});

app.get('/api/tv-live/:channelId', (req, res) => {
  const channelId = req.params.channelId;
  if (!channelId) return res.status(400).json({ error: 'Invalid channel' });

  function fetchFeed(cid) {
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${cid}`;
    https.get(feedUrl, { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
      const chunks = [];
      r.on('data', c => chunks.push(c));
      r.on('end', () => {
        const data = Buffer.concat(chunks).toString('utf8');
        const entries = data.split('<entry>');
        if (entries.length > 1) {
          const vidMatch = entries[1].match(/<yt:videoId>([\w-]+)<\/yt:videoId>/);
          if (vidMatch) return res.json({ videoId: vidMatch[1] });
        }
        res.json({ videoId: null });
      });
    }).on('error', () => res.json({ videoId: null }));
  }

  if (channelId.startsWith('UC') && channelId.length === 24) {
    fetchFeed(channelId);
  } else {
    const handle = channelId.startsWith('@') ? channelId : '@' + channelId;
    https.get(`https://www.youtube.com/${handle}`, { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
      const chunks = [];
      r.on('data', c => chunks.push(c));
      r.on('end', () => {
        const data = Buffer.concat(chunks).toString('utf8');
        const cidMatch = data.match(/"externalId"\s*:\s*"(UC[\w-]{22})"/);
        if (cidMatch) fetchFeed(cidMatch[1]);
        else res.json({ videoId: null });
      });
    }).on('error', () => res.json({ videoId: null }));
  }
});

// ---------- JUSTWATCH ----------
const justwatchCache = { data: null, time: 0 };

app.get('/api/justwatch', async (req, res) => {
  const type = req.query.type === 'series' ? 'SHOW' : 'MOVIE';
  const cacheKey = type;
  if (justwatchCache.data && justwatchCache.cacheKey === cacheKey && Date.now() - justwatchCache.time < 600000) {
    return res.json(justwatchCache.data);
  }

  const query = `{ popularTitles(country: TR, first: 40, filter: {objectTypes: [${type}]}) { edges { node { id objectType content(country: TR, language: tr) { title originalReleaseYear shortDescription scoring { imdbScore } posterUrl(profile: S500) } offers(country: TR, platform: WEB) { monetizationType package { clearName technicalName } } } } } }`;

  try {
    const data = await new Promise((resolve, reject) => {
      https.post('https://apis.justwatch.com/graphql', JSON.stringify({ query }), {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000
      }, (r) => {
        const chunks = [];
        r.on('data', c => chunks.push(c));
        r.on('end', () => {
          try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
          catch (e) { reject(e); }
        });
      }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('timeout')); });
    });

    const items = (data.data && data.data.popularTitles && data.data.popularTitles.edges || []).map(e => {
      const n = e.node;
      const free = (n.offers || []).find(o => o.monetizationType === 'FREE' || o.monetizationType === 'ADS');
      const flatrate = (n.offers || []).filter(o => o.monetizationType === 'FLATRATE' || o.monetizationType === 'FLATRATE');
      const platforms = [...new Set(flatrate.map(o => o.package.clearName))];
      return {
        id: n.id,
        title: n.content.title,
        year: n.content.originalReleaseYear,
        description: n.content.shortDescription || '',
        poster: n.content.posterUrl || '',
        imdb: n.content.scoring ? n.content.scoring.imdbScore : null,
        free: free ? free.package.clearName : null,
        platforms,
        type: n.objectType
      };
    });

    justwatchCache.data = { items, type: type === 'SHOW' ? 'series' : 'movies' };
    justwatchCache.time = Date.now();
    justwatchCache.cacheKey = cacheKey;
    res.json(justwatchCache.data);
  } catch (e) {
    res.status(502).json({ error: 'JustWatch alınamadı' });
  }
});

// ---------- IPTV M3U PROXY ----------
const IPTV_PLAYLISTS = [
  { name: 'Türkiye TV', url: 'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/tr.m3u' },
  { name: 'Türkiye Kanalları', url: 'https://itasli.github.io/TURKTV/index.m3u' }
];

const m3uCache = new Map();

function parseM3U(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const items = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('#EXTINF:')) {
      const info = lines[i];
      let url = '';
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j] && !lines[j].startsWith('#')) {
          url = lines[j];
          break;
        }
      }
      if (url) {
        const nameMatch = info.match(/,(.+)$/);
        const logoMatch = info.match(/tvg-logo="([^"]*)"/);
        const groupMatch = info.match(/group-title="([^"]*)"/);
        items.push({
          name: nameMatch ? nameMatch[1].trim() : 'Bilinmeyen',
          url: url,
          logo: logoMatch ? logoMatch[1] : '',
          group: groupMatch ? groupMatch[1] : ''
        });
      }
    }
  }
  return items;
}

app.get('/api/iptv', async (req, res) => {
  const playlistIdx = parseInt(req.query.list) || 0;
  const playlist = IPTV_PLAYLISTS[playlistIdx];
  if (!playlist) return res.status(400).json({ error: 'Invalid playlist' });

  const cacheKey = playlist.url;
  const cached = m3uCache.get(cacheKey);
  if (cached && Date.now() - cached.time < 300000) {
    return res.json({ items: cached.items, source: playlist.name });
  }

  try {
    const data = await new Promise((resolve, reject) => {
      https.get(playlist.url, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
        if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
          https.get(r.headers.location, { timeout: 10000 }, (r2) => {
            const chunks = [];
            r2.on('data', c => chunks.push(c));
            r2.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
          }).on('error', reject);
          return;
        }
        const chunks = [];
        r.on('data', c => chunks.push(c));
        r.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('timeout')); });
    });
    const items = parseM3U(data);
    m3uCache.set(cacheKey, { items, time: Date.now() });
    res.json({ items, source: playlist.name });
  } catch (e) {
    res.status(502).json({ error: 'IPTV playlist alınamadı' });
  }
});

app.get('/api/iptv/proxy', (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('Missing url');
  let parsed;
  try { parsed = new URL(url); } catch { return res.status(400).send('Invalid URL'); }
  if (!['http:', 'https:'].includes(parsed.protocol)) return res.status(400).send('Bad protocol');

  const mod = parsed.protocol === 'https:' ? https : http;
  const proxyReq = mod.get(url, { timeout: 10000 }, (proxyRes) => {
    if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
      const redirect = new URL(proxyRes.headers.location, url);
      const redirMod = redirect.protocol === 'https:' ? https : http;
      redirMod.get(redirect.href, { timeout: 10000 }, (redirRes) => {
        const ct = redirRes.headers['content-type'] || 'application/octet-stream';
        res.writeHead(redirRes.statusCode, { 'Content-Type': ct, 'Access-Control-Allow-Origin': '*' });
        redirRes.pipe(res);
      }).on('error', () => res.status(502).send('Redirect error'));
      return;
    }
    const ct = proxyRes.headers['content-type'] || 'application/octet-stream';
    res.writeHead(proxyRes.statusCode, { 'Content-Type': ct, 'Access-Control-Allow-Origin': '*' });
    proxyRes.pipe(res);
  });
  proxyReq.on('error', () => res.status(502).send('Upstream error'));
  proxyReq.on('timeout', () => { proxyReq.destroy(); res.status(504).send('Timeout'); });
  req.on('close', () => proxyReq.destroy());
});

// ---------- TWITTER RSS FEED ----------
app.get('/api/twitter/:handle', (req, res) => {
  const handle = req.params.handle.replace(/^@/, '');
  if (!handle || !/^[A-Za-z0-9_]{1,15}$/.test(handle)) return res.status(400).json({ items: [] });

  const RSS_SOURCES = [
    `https://nitter.net/${handle}/rss`,
    `https://nitter.privacydev.net/${handle}/rss`,
    `https://rsshub.app/twitter/user/${handle}`
  ];

  function trySource(idx) {
    if (idx >= RSS_SOURCES.length) return res.json({ items: [], source: 'none' });
    const url = RSS_SOURCES[idx];
    const mod = url.startsWith('https://rsshub') ? https : (url.startsWith('https://nitter.net') ? https : https);
    mod.get(url, { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Accept': 'application/rss+xml, application/xml, text/xml, */*' } }, (r) => {
      if (r.statusCode === 301 || r.statusCode === 302) {
        const loc = r.headers.location;
        if (loc) {
          https.get(loc, { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (r2) => {
            collectRSS(r2, url, res, () => trySource(idx + 1));
          }).on('error', () => trySource(idx + 1)).on('timeout', function() { this.destroy(); trySource(idx + 1); });
          return;
        }
      }
      collectRSS(r, url, res, () => trySource(idx + 1));
    }).on('error', () => trySource(idx + 1)).on('timeout', function() { this.destroy(); trySource(idx + 1); });
  }

  function collectRSS(response, sourceUrl, res, fallback) {
    const chunks = [];
    response.on('data', c => chunks.push(c));
    response.on('end', () => {
      if (response.statusCode >= 400) return fallback();
      const data = Buffer.concat(chunks).toString('utf8');
      const items = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;
      while ((match = itemRegex.exec(data)) !== null && items.length < 8) {
        const block = match[1];
        const title = (block.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] || '';
        const link = (block.match(/<link[^>]*>([\s\S]*?)<\/link>/) || [])[1] || '';
        const pubDate = (block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/) || [])[1] || '';
        const desc = (block.match(/<description[^>]*>([\s\S]*?)<\/description>/) || [])[1] || '';
        const cleanDesc = desc.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').trim();
        items.push({ title: title.replace(/<!\[CDATA\[|\]\]>/g, '').trim(), link: link.trim(), pubDate, desc: cleanDesc.substring(0, 280) });
      }
      res.json({ items, source: sourceUrl.split('/')[2], handle });
    });
    response.on('error', fallback);
  }

  trySource(0);
});

function safeUploadId(id) {
  return /^[a-zA-Z0-9_-]{4,40}$/.test(String(id || ''));
}

app.post('/api/upload/chunk', upload.single('file'), (req, res) => {
  const uploadId = (req.body && req.body.uploadId) || req.query.uploadId;
  const index = (req.body && req.body.index) || req.query.index;
  const total = (req.body && req.body.total) || req.query.total;
  if (!safeUploadId(uploadId) || !req.file) {
    if (req.file) try { fs.unlinkSync(req.file.path); } catch (_) {}
    return res.status(400).json({ error: 'Eksik bilgi' });
  }
  const udir = path.join(chunkDir, uploadId);
  if (!fs.existsSync(udir)) fs.mkdirSync(udir, { recursive: true });
  const idx = parseInt(index, 10);
  const finalPath = path.join(udir, String(idx).padStart(6, '0'));
  try { fs.renameSync(req.file.path, finalPath); } catch (e) {
    if (req.file) try { fs.unlinkSync(req.file.path); } catch (_) {}
    return res.status(500).json({ error: 'Chunk kaydedilemedi' });
  }
  res.json({ ok: true, index: idx, total: parseInt(total, 10) });
});

app.post('/api/upload/complete', (req, res) => {
  const { uploadId, filename, mimetype } = req.body || {};
  if (!safeUploadId(uploadId)) return res.status(400).json({ error: 'Geçersiz uploadId' });
  const udir = path.join(chunkDir, uploadId);
  if (!fs.existsSync(udir)) return res.status(404).json({ error: 'Upload bulunamadı' });
  const files = fs.readdirSync(udir).sort();
  if (files.length === 0) return res.status(400).json({ error: 'Chunk yok' });
  const safeName = String(filename || 'dosya').replace(/[^\w.\- ]/g, '_').slice(0, 200);
  const ext = path.extname(safeName) || '';
  const base = path.basename(safeName, ext);
  const finalName = Date.now() + '-' + Math.round(Math.random() * 1e9) + '-' + base + ext;
  const finalPath = path.join(uploadDir, finalName);
  const writeStream = fs.createWriteStream(finalPath);
  let totalBytes = 0;
  for (const f of files) {
    const data = fs.readFileSync(path.join(udir, f));
    totalBytes += data.length;
    writeStream.write(data);
  }
  writeStream.end();
  writeStream.on('finish', () => {
    try { fs.rmSync(udir, { recursive: true, force: true }); } catch (_) {}
    res.json({ url: '/uploads/' + finalName, name: safeName, size: totalBytes, mimetype: mimetype || 'application/octet-stream' });
  });
  writeStream.on('error', () => res.status(500).json({ error: 'Birleştirme hatası' }));
});

app.post('/api/upload/abort', (req, res) => {
  const { uploadId } = req.body || {};
  if (!safeUploadId(uploadId)) return res.status(400).json({ error: 'Geçersiz' });
  const udir = path.join(chunkDir, uploadId);
  if (fs.existsSync(udir)) try { fs.rmSync(udir, { recursive: true, force: true }); } catch (_) {}
  res.json({ ok: true });
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Dosya yok' });
  res.json({ url: '/uploads/' + req.file.filename, name: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype });
});

const rooms = new Map();
const roomMeta = new Map();

app.get('/api/room/:code', (req, res) => {
  const code = String(req.params.code || '').toUpperCase();
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ exists: false });
  res.json({ exists: true, users: room.size, max: MAX_USERS_PER_ROOM, full: room.size >= MAX_USERS_PER_ROOM });
});

function getRoom(code) {
  if (!rooms.has(code)) rooms.set(code, new Map());
  return rooms.get(code);
}

function publicRoomMeta(code) {
  const m = roomMeta.get(code) || { locked: false, waitingRoom: false, chatLocked: false, createdAt: Date.now() };
  return m;
}

io.on('connection', (socket) => {
  let currentRoom = null;
  let currentUser = null;
  let isHost = false;

  socket.on('create-room', (cb) => {
    const code = roomCode();
    getRoom(code);
    roomMeta.set(code, { locked: false, waitingRoom: false, chatLocked: false, createdAt: Date.now() });
    cb && cb({ code });
  });

  socket.on('join-room', ({ roomCode: code, name, mic, cam, asGuest, requestedAt, avatar }, cb) => {
    if (!code || !name) return cb && cb({ error: 'Eksik bilgi' });
    code = String(code).toUpperCase().trim();
    const room = getRoom(code);
    const meta = publicRoomMeta(code);

    if (room.size >= MAX_USERS_PER_ROOM) {
      return cb && cb({ error: 'Oda dolu (max ' + MAX_USERS_PER_ROOM + ' kişi)' });
    }

    if (meta.locked) {
      return cb && cb({ error: 'Bu toplantı kilitli', locked: true });
    }

    if (meta.waitingRoom && room.size > 0) {
      socket.to(code).emit('waiting-request', {
        id: socket.id,
        name: String(name).slice(0, 24),
        requestedAt: requestedAt || Date.now()
      });
      return cb && cb({ wait: true });
    }

    currentRoom = code;
    currentUser = {
      id: socket.id,
      name: String(name).slice(0, 24) || 'Misafir',
      mic: mic !== false,
      cam: cam === true,
      isGuest: !!asGuest,
      avatar: String(avatar || '').slice(0, 20)
    };
    isHost = room.size === 0;

    socket.join(code);
    room.set(socket.id, currentUser);

    const peers = Array.from(room.values()).filter(u => u.id !== socket.id);

    cb && cb({
      ok: true,
      you: currentUser,
      peers,
      roomCode: code,
      isHost,
      settings: meta
    });

    socket.to(code).emit('user-joined', currentUser);
    io.to(code).emit('room-users', Array.from(room.values()));
  });

  socket.on('admit-user', (userId) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    const meta = publicRoomMeta(currentRoom);
    if (!room || !isHost) return;
    if (room.size >= MAX_USERS_PER_ROOM) return;
    io.to(userId).emit('admitted', { roomCode: currentRoom, settings: meta });
    socket.to(userId).emit('admit-notice');
  });

  socket.on('deny-user', (userId) => {
    if (!currentRoom) return;
    io.to(userId).emit('denied', { reason: 'Yönetici tarafından reddedildiniz' });
  });

  socket.on('update-room', (settings) => {
    if (!currentRoom || !isHost) return;
    const meta = publicRoomMeta(currentRoom);
    if (typeof settings.locked === 'boolean') meta.locked = settings.locked;
    if (typeof settings.waitingRoom === 'boolean') meta.waitingRoom = settings.waitingRoom;
    if (typeof settings.chatLocked === 'boolean') meta.chatLocked = settings.chatLocked;
    roomMeta.set(currentRoom, meta);
    io.to(currentRoom).emit('room-settings', meta);
  });

  socket.on('host-action', ({ action, target }) => {
    if (!currentRoom || !isHost) return;
    if (action === 'mute-all') {
      io.to(currentRoom).emit('force-mute', { from: socket.id });
    } else if (action === 'mute-user' && target) {
      io.to(target).emit('force-mute', { from: socket.id });
    } else if (action === 'kick' && target) {
      io.to(target).emit('kicked');
    } else if (action === 'lower-hand' && target) {
      io.to(target).emit('lower-hand');
    } else if (action === 'spotlight' && target) {
      io.to(currentRoom).emit('spotlight', { target, by: socket.id });
    } else if (action === 'end-meeting') {
      io.to(currentRoom).emit('meeting-ended');
    }
  });

  socket.on('leave-room', () => leaveRoom());

  socket.on('signal', ({ to, from, data }) => {
    io.to(to).emit('signal', { from, data });
  });

  socket.on('chat-message', (msg) => {
    if (!currentRoom || !currentUser) return;
    const meta = publicRoomMeta(currentRoom);
    if (meta.chatLocked && !isHost) return;
    const message = {
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      type: msg.type || 'text',
      from: currentUser,
      text: (msg.text || '').slice(0, 2000),
      file: msg.file || null,
      replyTo: msg.replyTo || null,
      time: Date.now()
    };
    io.to(currentRoom).emit('chat-message', message);
  });

  socket.on('delete-message', (msgId) => {
    if (!currentRoom) return;
    io.to(currentRoom).emit('delete-message', msgId);
  });

  socket.on('reaction', (data) => {
    if (!currentRoom || !currentUser) return;
    socket.to(currentRoom).emit('reaction', {
      id: currentUser.id,
      name: currentUser.name,
      emoji: data.emoji,
      time: Date.now()
    });
  });

  socket.on('hand-raise', (raised) => {
    if (!currentRoom || !currentUser) return;
    io.to(currentRoom).emit('hand-raise', { id: currentUser.id, name: currentUser.name, raised: !!raised });
  });

  socket.on('media-state', (data) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('media-state', { id: socket.id, ...data });
  });

  socket.on('whiteboard', (data) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('whiteboard', data);
  });

  socket.on('caption', (text) => {
    if (!currentRoom) return;
    io.to(currentRoom).emit('caption', { id: currentUser.id, name: currentUser.name, text, time: Date.now() });
  });

  socket.on('typing', () => {
    if (!currentRoom || !currentUser) return;
    socket.to(currentRoom).emit('typing', currentUser);
  });

  socket.on('stop-typing', () => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('stop-typing', socket.id);
  });

  function leaveRoom() {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (room) {
      room.delete(socket.id);
      if (room.size === 0) {
        rooms.delete(currentRoom);
        roomMeta.delete(currentRoom);
      } else {
        io.to(currentRoom).emit('room-users', Array.from(room.values()));
        if (isHost) {
          const newHost = Array.from(room.values())[0];
          if (newHost) {
            isHost = false;
            io.to(newHost.id).emit('host-changed', { isHost: true });
          }
        }
      }
    }
    socket.to(currentRoom).emit('user-left', socket.id);
    socket.leave(currentRoom);
    currentRoom = null;
    currentUser = null;
    isHost = false;
  }

  socket.on('disconnect', () => leaveRoom());
});

setInterval(() => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) return;
    const now = Date.now();
    const maxAge = 6 * 60 * 60 * 1000;
    files.forEach(f => {
      const fp = path.join(uploadDir, f);
      fs.stat(fp, (e, s) => {
        if (!e && now - s.mtimeMs > maxAge) {
          try { fs.unlinkSync(fp); } catch (_) {}
        }
      });
    });
  });
  if (fs.existsSync(chunkDir)) {
    fs.readdir(chunkDir, (err, ids) => {
      if (err) return;
      const now = Date.now();
      ids.forEach(id => {
        const idir = path.join(chunkDir, id);
        fs.stat(idir, (e, s) => {
          if (!e && now - s.mtimeMs > 60 * 60 * 1000) {
            try { fs.rmSync(idir, { recursive: true, force: true }); } catch (_) {}
          }
        });
      });
    });
  }
}, 30 * 60 * 1000);

server.listen(PORT, () => {
  console.log('Sunucu calisiyor: http://localhost:' + PORT);
});
