import { getBible } from '@midvash/bible-data';

async function run() {
  const bible = getBible('web');
  console.log(Object.keys(bible));
}
run();
