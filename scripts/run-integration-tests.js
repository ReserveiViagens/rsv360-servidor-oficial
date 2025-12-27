/**
 * Script para executar testes de integração
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const testTypes = {
  unit: 'npm run test:unit',
  integration: 'npm run test:integration',
  e2e: 'npm run test:e2e',
  all: 'npm run test:all',
};

async function runTests(type = 'all') {
  console.log(`🧪 Executando testes: ${type}\n`);

  try {
    const command = testTypes[type] || testTypes.all;
    execSync(command, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    console.log(`\n✅ Testes ${type} concluídos com sucesso!`);
    return true;
  } catch (error) {
    console.error(`\n❌ Testes ${type} falharam`);
    return false;
  }
}

// Executar baseado no argumento
const testType = process.argv[2] || 'all';
runTests(testType)
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Erro:', error);
    process.exit(1);
  });

