import fs from 'fs';
import https from 'https';
import path from 'path';

async function run() {
  const url = 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_bbe.json';
  const dest = path.resolve('node_modules/.cache/temp_bbe.json');
  
  console.log('Downloading BBE JSON...');
  
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Status Code: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('Downloaded successfully.');
        resolve(null);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

run().catch(console.error);
