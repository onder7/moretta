import { prisma } from '../config/database';
import { seedDefaultRulesIfEmpty } from '../services/chatbotService';

// Varsayılan asistan kurallarını (boşsa) DB'ye ekler. Tek kaynak: chatbotService.
async function main() {
  const added = await seedDefaultRulesIfEmpty();
  if (added > 0) {
    console.log(`Chatbot rules seeded: ${added} kural eklendi.`);
  } else {
    console.log('Chatbot rules zaten mevcut, ekleme yapılmadı.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
