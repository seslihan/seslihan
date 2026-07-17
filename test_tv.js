const https = require('https');

function fetchPage(url) {
  return new Promise(resolve => {
    https.get(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9' }, 
      timeout: 8000 
    }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => resolve({ status: r.statusCode, body: d }));
    }).on('error', () => resolve({ status: 0, body: '' }));
  });
}

// Test 1: RSS feed via fetchText approach (Buffer.concat)
function testRSS(cid) {
  return new Promise(resolve => {
    const feedUrl = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + cid;
    https.get(feedUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 }, r => {
      const chunks = [];
      r.on('data', c => chunks.push(c));
      r.on('end', () => {
        const data = Buffer.concat(chunks).toString('utf8');
        const vidMatch = data.match(/<yt:videoId>([\w-]+)<\/yt:videoId>/);
        resolve({ method: 'rss-buffer', ok: !!vidMatch, videoId: vidMatch ? vidMatch[1] : null, len: data.length });
      });
    }).on('error', (e) => resolve({ method: 'rss-buffer', ok: false, error: e.message }));
  });
}

// Test 2: oEmbed
function testOembed(url) {
  return new Promise(resolve => {
    https.get('https://www.youtube.com/oembed?url=' + encodeURIComponent(url) + '&format=json', { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => resolve({ method: 'oembed', status: r.statusCode, len: d.length }));
    }).on('error', (e) => resolve({ method: 'oembed', ok: false, error: e.message }));
  });
}

// Test 3: Channel page scrape for latest video
function testScrape(channelUrl) {
  return new Promise(resolve => {
    https.get(channelUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }, timeout: 8000 }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        // Try multiple patterns
        const m1 = d.match(/"videoId"\s*:\s*"([\w-]{11})"/);
        const m2 = d.match(/\/watch\?v=([\w-]{11})/);
        resolve({ method: 'scrape', ok: !!(m1||m2), videoId: m1 ? m1[1] : (m2 ? m2[1] : null), len: d.length });
      });
    }).on('error', (e) => resolve({ method: 'scrape', ok: false, error: e.message }));
  });
}

const testChannels = [
  ['TRT', 'UCdcVT79d_8l3xzpBfhnYwJw', 'https://www.youtube.com/@trt'],
  ['CNN Turk', 'UCV6zcRug6Hqp1UX_FdyUeBg', 'https://www.youtube.com/@CNNTurk'],
  ['TV8', 'UCp4N3g1zcvp8WE2qJ_JKqBg', 'https://www.youtube.com/@tv8'],
];

async function main() {
  for (const [name, cid, url] of testChannels) {
    console.log('=== ' + name + ' ===');
    const rss = await testRSS(cid);
    console.log('  RSS:', rss.ok ? 'OK ' + rss.videoId : 'FAIL (' + rss.len + ' bytes, err: ' + (rss.error||'') + ')');
    const scrape = await testScrape(url);
    console.log('  Scrape:', scrape.ok ? 'OK ' + scrape.videoId : 'FAIL (' + scrape.len + ' bytes, err: ' + (scrape.error||'') + ')');
    console.log('');
  }
}
main();
