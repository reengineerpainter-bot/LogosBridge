import https from 'https';
import fs from 'fs';

const files = [
  { id: 'ASV', url: 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_asv.json' },
  { id: 'BBE', url: 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_bbe.json' },
  { id: 'WEB', url: 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_web.json' },
  { id: 'YLT', url: 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_ylt.json' }
];

async function download(url: string, dest: string) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function run() {
  for (const f of files) {
    console.log(`Downloading ${f.id}...`);
    try {
      await download(f.url, `node_modules/.cache/temp_${f.id.toLowerCase()}.json`);
      console.log(`Successfully downloaded ${f.id}`);
    } catch (e) {
      console.error(`Failed to download ${f.id}`, e);
    }
  }
}

run();
