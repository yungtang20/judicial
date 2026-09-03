import { retrieve } from './server/services/legalRetrieval';

async function test() {
  const query = '我在睡覺時，我老婆佩容拿走我的錢包並刷卡';
  const docs = await retrieve(query);
  console.log(docs.map(d => d.citation));
}
test();
