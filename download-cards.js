const fs = require('fs');
const https = require('https');
const path = require('path');

const bulkDataUrl = 'https://api.scryfall.com/bulk-data';
const outputFile = path.join(__dirname, 'scryfall-cards.json');

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

        if (!parsed?.data?.length) {
          console.error('❌ Unexpected response format from Scryfall.');
          console.log('🔎 Raw response:', data.slice(0, 500));
          return;
        }

        const defaultCards = parsed.data.find(item => item.type === 'default_cards');

        if (!defaultCards?.download_uri) {
          console.error('❌ Could not find default_cards download URI.');
          return;
        }

        const downloadUrl = defaultCards.download_uri;
        console.log(`📦 Downloading card data from: ${downloadUrl}`);

        https.get(downloadUrl, downloadRes => {
          if (downloadRes.statusCode !== 200) {
            console.error(`❌ Download failed. Status: ${downloadRes.statusCode}`);
            return;
          }

          const file = fs.createWriteStream(outputFile);
          let downloaded = 0;

          downloadRes.on('data', chunk => {
            downloaded += chunk.length;
            process.stdout.write(`\r⬇️  Downloaded: ${(downloaded / 1024 / 1024).toFixed(2)} MB`);
          });

          downloadRes.pipe(file);

          file.on('finish', () => {
            file.close();
            console.log(`\n✅ Download complete! Saved to "${outputFile}"`);
          });
        }).on('error', err => {
          console.error('🚨 Error during card download:', err.message);
        });

      } catch (err) {
        console.error('❌ Failed to parse metadata:', err.message);
      }
    });
  }
).on('error', err => {
  console.error('🚨 Error fetching metadata:', err.message);
});





