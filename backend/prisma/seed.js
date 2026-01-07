const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding MRM Platform database...');

  // Create users with different roles
  const passwordHash = await bcrypt.hash('Password123!', 12);

  const users = await Promise.all([
    // Admin
    prisma.user.upsert({
      where: { email: 'admin@mrm.io' },
      update: {},
      create: {
        email: 'admin@mrm.io',
        passwordHash,
        firstName: 'System',
        lastName: 'Administrator',
        role: 'ADMIN',
        status: 'ACTIVE',
        department: 'IT',
        title: 'Platform Administrator',
      },
    }),
    // Executive
    prisma.user.upsert({
      where: { email: 'cro@mrm.io' },
      update: {},
      create: {
        email: 'cro@mrm.io',
        passwordHash,
        firstName: 'Sarah',
        lastName: 'Chen',
        role: 'EXECUTIVE',
        status: 'ACTIVE',
        department: 'Executive',
        title: 'Chief Risk Officer',
      },
    }),
    // Risk Manager
    prisma.user.upsert({
      where: { email: 'risk.manager@mrm.io' },
      update: {},
      create: {
        email: 'risk.manager@mrm.io',
        passwordHash,
        firstName: 'Michael',
        lastName: 'Rodriguez',
        role: 'RISK_MANAGER',
        status: 'ACTIVE',
        department: 'Risk Management',
        title: 'Senior Risk Manager',
      },
    }),
    // Model Validator
    prisma.user.upsert({
      where: { email: 'validator@mrm.io' },
      update: {},
      create: {
        email: 'validator@mrm.io',
        passwordHash,
        firstName: 'Emily',
        lastName: 'Johnson',
        role: 'MODEL_VALIDATOR',
        status: 'ACTIVE',
        department: 'Model Validation',
        title: 'Lead Model Validator',
      },
    }),
    // Model Developer
    prisma.user.upsert({
      where: { email: 'developer@mrm.io' },
      update: {},
      create: {
        email: 'developer@mrm.io',
        passwordHash,
        firstName: 'Alex',
        lastName: 'Thompson',
        role: 'MODEL_DEVELOPER',
        status: 'ACTIVE',
        department: 'Quantitative Analytics',
        title: 'Senior Quantitative Analyst',
      },
    }),
    // Compliance Officer
    prisma.user.upsert({
      where: { email: 'compliance@mrm.io' },
      update: {},
      create: {
        email: 'compliance@mrm.io',
        passwordHash,
        firstName: 'Robert',
        lastName: 'Brown',
        role: 'COMPLIANCE_OFFICER',
        status: 'ACTIVE',
        department: 'Compliance',
        title: 'Compliance Manager',
      },
    }),
  ]);

  console.log(`✅ Created/updated ${users.length} users`);

  const [admin, cro, riskManager, validator, developer] = users;

  // Create models
  const models = await Promise.all([
    prisma.model.upsert({
      where: { modelId: 'MDL-2024-001' },
      update: {},
      create: {
        modelId: 'MDL-2024-001',
        name: 'Credit Scoring Model - Consumer',
        description: 'Machine learning model for consumer credit risk assessment',
        version: '2.1.0',
        status: 'IN_PRODUCTION',
        tier: 'TIER_1_CRITICAL',
        type: 'CREDIT_RISK',
        ownerId: developer.id,
        developerId: developer.id,
        businessUnit: 'Consumer Banking',
        algorithm: 'XGBoost',
        programmingLanguage: 'Python',
        framework: 'scikit-learn',
        businessPurpose: 'Automated credit decisioning for consumer loan applications',
        materialityScore: 95,
        annualRevenue: 50000000,
        portfolioExposure: 2500000000,
        productionDate: new Date('2023-06-01'),
        lastValidationDate: new Date('2024-01-15'),
        nextValidationDate: new Date('2025-01-15'),
        tags: ['credit-risk', 'consumer', 'ml', 'production'],
      },
    }),
    prisma.model.upsert({
      where: { modelId: 'MDL-2024-002' },
      update: {},
      create: {
        modelId: 'MDL-2024-002',
        name: 'Commercial Real Estate PD Model',
        description: 'Probability of Default model for commercial real estate loans',
        version: '1.5.0',
        status: 'IN_PRODUCTION',
        tier: 'TIER_1_CRITICAL',
        type: 'CREDIT_RISK',
        ownerId: developer.id,
        businessUnit: 'Commercial Lending',
        algorithm: 'Logistic Regression',
        programmingLanguage: 'Python',
        materialityScore: 90,
        productionDate: new Date('2022-09-01'),
        nextValidationDate: new Date('2024-09-15'),
        tags: ['credit-risk', 'cre', 'production'],
      },
    }),
    prisma.model.upsert({
      where: { modelId: 'MDL-2024-003' },
      update: {},
      create: {
        modelId: 'MDL-2024-003',
        name: 'VaR Model - Trading Book',
        description: 'Historical simulation VaR model for trading book',
        version: '3.0.0',
        status: 'IN_PRODUCTION',
        tier: 'TIER_1_CRITICAL',
        type: 'MARKET_RISK',
        ownerId: developer.id,
        businessUnit: 'Trading',
        algorithm: 'Historical Simulation',
        programmingLanguage: 'C++',
        materialityScore: 98,
        productionDate: new Date('2021-01-01'),
        nextValidationDate: new Date('2025-02-01'),
        tags: ['market-risk', 'var', 'regulatory'],
      },
    }),
    prisma.model.upsert({
      where: { modelId: 'MDL-2024-004' },
      update: {},
      create: {
        modelId: 'MDL-2024-004',
        name: 'Transaction Fraud Detection',
        description: 'Real-time neural network model for detecting fraud',
        version: '4.2.1',
        status: 'IN_PRODUCTION',
        tier: 'TIER_2_HIGH',
        type: 'FRAUD_DETECTION',
        ownerId: developer.id,
        businessUnit: 'Fraud Prevention',
        algorithm: 'Deep Neural Network',
        programmingLanguage: 'Python',
        framework: 'TensorFlow',
        materialityScore: 85,
        productionDate: new Date('2023-03-01'),
        nextValidationDate: new Date('2025-03-01'),
        tags: ['fraud', 'ml', 'real-time'],
      },
    }),
    prisma.model.upsert({
      where: { modelId: 'MDL-2024-005' },
      update: {},
      create: {
        modelId: 'MDL-2024-005',
        name: 'LGD Model - Unsecured',
        description: 'Loss Given Default model for unsecured consumer loans',
        version: '1.0.0',
        status: 'PENDING_VALIDATION',
        tier: 'TIER_2_HIGH',
        type: 'CREDIT_RISK',
        ownerId: developer.id,
        businessUnit: 'Consumer Banking',
        algorithm: 'Random Forest',
        programmingLanguage: 'Python',
        tags: ['credit-risk', 'lgd', 'development'],
      },
    }),
  ]);

  console.log(`✅ Created/updated ${models.length} models`);

  // Create legacy researchers for backward compatibility
  const researchers = [
    { email: 'pranav@mrm.io', name: 'Pranav (Mr.Vision)', apiKey: 'api_key_pranav_001' },
    { email: 'researcher1@mrm.io', name: 'Researcher 1', apiKey: 'api_key_researcher1_001' },
    { email: 'researcher2@mrm.io', name: 'Researcher 2', apiKey: 'api_key_researcher2_001' },
    { email: 'researcher3@mrm.io', name: 'Researcher 3', apiKey: 'api_key_researcher3_001' },
    { email: 'researcher4@mrm.io', name: 'Researcher 4', apiKey: 'api_key_researcher4_001' },
  ];

  for (const r of researchers) {
    await prisma.researcher.upsert({
      where: { email: r.email },
      update: {},
      create: r,
    });
  }

  console.log('✅ Created legacy researchers');

  console.log('\n🎉 Seeding completed successfully!');
  console.log('\n📋 MRM Platform Test Accounts:');
  console.log('----------------------------------------');
  console.log('Admin:          admin@mrm.io');
  console.log('Executive:      cro@mrm.io');
  console.log('Risk Manager:   risk.manager@mrm.io');
  console.log('Validator:      validator@mrm.io');
  console.log('Developer:      developer@mrm.io');
  console.log('Compliance:     compliance@mrm.io');
  console.log('----------------------------------------');
  console.log('Password for all: Password123!');
  console.log('\n📋 Legacy Researchers:');
  researchers.forEach((r) => {
    console.log(`  ${r.name}: ${r.email} (API Key: ${r.apiKey})`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
