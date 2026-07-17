const http = require('http');
const https = require('https');

function testStream(url, name) {
  return new Promise(resolve => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { 
      timeout: 8000, 
      headers: { 'User-Agent': 'Mozilla/5.0', 'Icy-MetaData': '1' },
      rejectUnauthorized: false
    }, r => {
      let bytes = 0;
      r.on('data', c => { bytes += c.length; });
      setTimeout(() => {
        req.destroy();
        resolve({ name, status: r.statusCode, bytes, ok: bytes > 1000 });
      }, 3000);
    });
    req.on('error', () => resolve({ name, status: 0, bytes: 0, ok: false }));
    req.on('timeout', () => { req.destroy(); resolve({ name, status: 0, bytes: 0, ok: false }); });
  });
}

const tests = [
  ['Radyo Viva', 'http://46.20.3.231/'],
  ['Radyo Moda', 'http://m.radyomoda.com.tr:8000/stream'],
  ['Istanbul FM', 'https://stream2.rtvtakip.com:7000/stream'],
  ['Alem FM', 'https://turkmedya.radyotvonline.net/alemfmaac'],
  ['Radyo 7', 'http://46.20.3.250/;stream'],
  ['Can FM', 'https://canfmgen.80.yayin.com.tr/'],
  ['Super FM', 'https://playerservices.streamtheworld.com/api/livestream-redirect/SUPER_FM_SC'],
  ['Radyo Eksen', 'http://46.20.3.230/'],
  ['Radyo Alaturka', 'https://moondigitaledge.radyotvonline.net/radyolandalaturka/playlist.m3u8'],
  ['Seyr FM', 'https://seyrdijital.com/stream'],
  ['Radyo Light', 'https://yayin.radiolight.net:8005/live'],
  ['Metropol FM', 'https://sslyayin.netyayin.net/3490/stream'],
];

async function main() {
  for (const [name, url] of tests) {
    const r = await testStream(url, name);
    console.log(r.ok ? 'OK ' : 'ERR', name, '|', r.status, '|', r.bytes, 'bytes');
  }
}
main();
