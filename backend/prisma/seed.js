const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.capture.deleteMany();
  await prisma.researcher.deleteMany();

  console.log('✅ Cleared existing data');

  // Create 5 test researchers
  const researchers = [
    {
      email: 'pranav@mrm.io',
      name: 'Pranav (Mr.Vision)',
      apiKey: 'api_key_pranav_001'
    },
    {
      email: 'researcher1@mrm.io',
      name: 'Researcher 1',
      apiKey: 'api_key_researcher1_001'
    },
    {
      email: 'researcher2@mrm.io',
      name: 'Researcher 2',
      apiKey: 'api_key_researcher2_001'
    },
    {
      email: 'researcher3@mrm.io',
      name: 'Researcher 3',
      apiKey: 'api_key_researcher3_001'
    },
    {
      email: 'researcher4@mrm.io',
      name: 'Researcher 4',
      apiKey: 'api_key_researcher4_001'
    },
  ];

  console.log('\n📝 Creating researchers:\n');

  for (const researcher of researchers) {
    const created = await prisma.researcher.create({
      data: researcher,
    });
    console.log(`✓ ${created.name}`);
    console.log(`  Email: ${created.email}`);
    console.log(`  API Key: ${created.apiKey}`);
    console.log('');
  }

  console.log('✅ Database seeded successfully!');
  console.log('\n📋 Test Credentials Summary:\n');
  console.log('='.repeat(60));
  researchers.forEach((r, i) => {
    console.log(`${i + 1}. ${r.name}`);
    console.log(`   Email: ${r.email}`);
    console.log(`   API Key: ${r.apiKey}`);
    console.log('');
  });
  console.log('='.repeat(60));
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
