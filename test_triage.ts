import { buildIntelligentRuleBasedTriage, enforceTriageConsistency } from './src/lib/universalTriage';

const query = '我在睡覺時，我老婆佩容拿走我的錢包並刷卡';
const result = buildIntelligentRuleBasedTriage(query);
console.log("Rule-based:", JSON.stringify(result, null, 2));
