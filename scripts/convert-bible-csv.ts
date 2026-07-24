import fs from 'fs';
import path from 'path';
import https from 'https';

async function download(url: string, dest: string): Promise<void> {
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
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let inQuotes = false;
  let currentWord = '';
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i+1] === '"') {
        currentWord += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(currentWord);
      currentWord = '';
    } else {
      currentWord += char;
    }
  }
  result.push(currentWord);
  return result;
}

function convertScrollmapperCsv(csvPath: string, jsonPath: string) {
  const data = fs.readFileSync(csvPath, 'utf8');
  const lines = data.split(/\r?\n/);
  
  const booksMap = new Map<string, string[][]>();
  const bookOrder: string[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;
    
    const parts = parseCSVLine(line);
    if (parts.length < 4) continue;
    
    const bookName = parts[0];
    const cId = parseInt(parts[1]);
    const vId = parseInt(parts[2]);
    const text = parts.slice(3).join(','); // in case of extra commas? parseCSVLine handles commas inside quotes correctly, so it should be exactly 4 parts
    
    if (isNaN(cId) || isNaN(vId)) continue;
    
    if (!booksMap.has(bookName)) {
      booksMap.set(bookName, []);
      bookOrder.push(bookName);
    }
    
    const chapters = booksMap.get(bookName)!;
    while (chapters.length < cId) {
      chapters.push([]);
    }
    
    const verses = chapters[cId - 1];
    while (verses.length < vId) {
      verses.push("");
    }
    
    verses[vId - 1] = parts[3];
  }
  
  const output = [];
  for (const name of bookOrder) {
    output.push({
      name: name,
      abbrev: name,
      chapters: booksMap.get(name)
    });
  }
  
  fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2));
  console.log(`Saved JSON: ${jsonPath} with ${output.length} books`);
}

async function run() {
  const versions = [
    { id: 'ASV', url: 'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/csv/ASV.csv' },
    { id: 'YLT', url: 'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/csv/YLT.csv' },
    { id: 'BSB', url: 'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/csv/BSB.csv' },
    // Wait! Scrollmapper does not have WEB. It has NHEB, OEB. I will use the free API for WEB, or just wait.
  ];
  
  for (const v of versions) {
    const csvDest = `node_modules/.cache/${v.id}.csv`;
    const jsonDest = `node_modules/.cache/temp_${v.id.toLowerCase()}.json`;
    console.log(`Downloading ${v.id}...`);
    try {
       await download(v.url, csvDest);
       console.log(`Converting ${v.id}...`);
       convertScrollmapperCsv(csvDest, jsonDest);
    } catch(e) {
       console.error(`Failed ${v.id}`, e);
    }
  }
}

run().catch(console.error);
