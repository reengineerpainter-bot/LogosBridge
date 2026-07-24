import fs from 'fs';
import https from 'https';
import path from 'path';

// BSB has a common download link on their site
const bsbUrl = 'https://berean.bible/bsb.tsv'; // Wait, let's try this
// another URL: 'https://raw.githubusercontent.com/openbible-io/bsb/master/bsb.txt'

async function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    };
    https.get(url, options, (response) => {
      // follow redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        if (response.headers.location) {
          download(response.headers.location, dest).then(resolve).catch(reject);
          return;
        }
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function run() {
  try {
    const dest = path.resolve('node_modules/.cache/bsb.tsv');
    console.log('Downloading BSB TSV...');
    await download('https://berean.bible/bsb.tsv', dest);
    console.log('BSB downloaded successfully.');
  } catch (e) {
    console.error('Failed to download from berean.bible, trying openbible-io...', e);
    try {
      const dest = path.resolve('node_modules/.cache/bsb.txt');
      await download('https://raw.githubusercontent.com/openbible-io/bsb/master/bsb.txt', dest);
      console.log('BSB txt downloaded successfully.');
    } catch (e2) {
      console.error('Failed both.', e2);
    }
  }
}

run();
