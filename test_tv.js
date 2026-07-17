const https = require('https');

function fetchFeed(cid) {
  return new Promise(resolve => {
    https.get('https://www.youtube.com/feeds/videos.xml?channel_id=' + cid, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        const titleMatch = d.match(/<name>(.*?)<\/name>/);
        const vidMatch = d.match(/<yt:videoId>([\w-]+)<\/yt:videoId>/);
        resolve({ title: titleMatch ? titleMatch[1] : '?', videoId: vidMatch ? vidMatch[1] : null });
      });
    }).on('error', () => resolve({ title: 'error', videoId: null }));
  });
}

const channels = {
  'TRT': 'UCdcVT79d_8l3xzpBfhnYwJw',
  'CNN Türk': 'UCV6zcRug6Hqp1UX_FdyUeBg',
  'TRT Haber': 'UCBgTP2LOFVPmq15W-RH-WXA',
  'A Haber': 'UCKQhfw-lzz0uKnE1fY1PsAA',
  'TV8': 'UCp4N3g1zcvp8WE2qJ_JKqBg',
  '24 TV': 'UCN7VYCsI4Lx1-J4_BtjoWUA',
  'Habertürk TV': 'UCn6dNfiRE_Xunu7iMyvD7AA',
  'Show TV': 'UC9JMe_We017gYrRc7kZHgmg',
  'NTV': 'UCGMghpDmBAqhz2p7eLHX-eg',
};

async function main() {
  for (const [name, cid] of Object.entries(channels)) {
    const info = await fetchFeed(cid);
    console.log(name, '|', cid, '|', info.title, '|', info.videoId || 'NO VIDEO');
  }
}
main();
