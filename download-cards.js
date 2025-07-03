const fs = require('fs');
const https = require('https');

const bulkDataUrl = 'https://api.scryfall.com/bulk-data';
const output = 'scryfall-cards.json';

console.log('🚀 Fetching latest bulk data metadata from Scryfall...');

https.get(
  bulkDataUrl,
  {
    headers: {
      'User-Agent': 'CardRankerBot/1.0 (contact: dsfloren28@gmail.com)',
      'Accept': 'application/json',
    }
  },
  res => {
    let data = '';

    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);

        if (!parsed || !parsed.data || !Array.isArray(parsed.data)) {
          console.error('❌ Unexpected response format from Scryfall.');
          console.log('🔎 Raw response:', data.slice(0, 500));
          return;
        }

        const defaultCards = parsed.data.find(item => item.type === 'default_cards');

        if (!defaultCards || !defaultCards.download_uri) {
          console.error('❌ Could not find default_cards download URI.');
          return;
        }

        const downloadUrl = defaultCards.download_uri;
        console.log(`📦 Downloading from: ${downloadUrl}`);

        https.get(downloadUrl, downloadRes => {
          if (downloadRes.statusCode !== 200) {
            console.error(`❌ Failed to download. Status: ${downloadRes.statusCode}`);
            return;
          }

          const file = fs.createWriteStream(output);
          downloadRes.pipe(file);

          file.on('finish', () => {
            file.close();
            console.log(`✅ Download complete! Saved to "${output}"`);
          });
        }).on('error', err => {
          console.error('🚨 Download error:', err.message);
        });

      } catch (err) {
        console.error('❌ Failed to parse bulk metadata:', err.message);
      }
    });
  }
).on('error', err => {
  console.error('🚨 Metadata fetch error:', err.message);
});




