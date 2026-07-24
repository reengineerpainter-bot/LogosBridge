async function run() {
  const urls = [
    'https://raw.githubusercontent.com/seven1m/bible_api/master/lib/bibles/bsb.json',
    'https://raw.githubusercontent.com/amir-hanna/bible/master/data/BSB.json',
    'https://raw.githubusercontent.com/jadenzaleski/bible-translations/master/json/BSB.json'
  ];
  for (const u of urls) {
    console.log(`Checking ${u}...`);
    try {
      const res = await fetch(u);
      console.log(`Status: ${res.status}`);
      if (res.status === 200) {
        console.log('Found it!');
        return;
      }
    } catch(e) {}
  }
}
run();
