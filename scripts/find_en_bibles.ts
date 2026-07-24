import fs from 'fs';

async function run() {
  const response = await fetch('https://api.github.com/repos/thiagobodruk/bible/contents/json');
  const files = await response.json();
  const enFiles = files.filter((f: any) => f.name.startsWith('en_'));
  console.log(enFiles.map((f: any) => f.name));
}

run();
