/**
 * Script de Validação Final do Projeto
 * 
 * Valida se todas as metas foram atingidas:
 * - Cobertura de testes > 80%
 * - Todos os testes passando
 * - CI/CD configurado
 * - Migrations validadas
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const checks = {
  migrations: false,
  tests: false,
  coverage: false,
  cicd: false,
  pwa: false,
};

async function checkMigrations() {
  console.log('🔍 Verificando migrations...');
  try {
    // Tentar obter DATABASE_URL do argumento ou variável de ambiente
    const databaseUrl = process.argv[2] || process.env.DATABASE_URL;
    const command = databaseUrl 
      ? `node scripts/validate-all-migrations.js "${databaseUrl}"`
      : 'node scripts/validate-all-migrations.js';
    
    const result = execSync(command, {
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: process.cwd(),
    });
    
    // Verificar se todas as migrations estão sincronizadas
    const isSynchronized = result.includes('TODAS AS MIGRATIONS ESTÃO SINCRONIZADAS') || 
                          (result.includes('Migrations pendentes: 0') && !result.includes('Migrations pendentes:'));
    
    checks.migrations = isSynchronized;
    if (isSynchronized) {
      console.log('   ✅ Todas as migrations estão sincronizadas');
    } else {
      console.log('   ⚠️  Há migrations pendentes');
    }
    return checks.migrations;
  } catch (error) {
    // Se o erro for de conexão, mas o script existe, considerar como pendente
    if (error.message.includes('autenticação') || error.message.includes('connection')) {
      console.log('   ⚠️  Não foi possível conectar ao banco (verifique DATABASE_URL)');
    } else {
      console.log('   ⚠️  Erro ao verificar migrations:', error.message.split('\n')[0]);
    }
    return false;
  }
}

async function checkTests() {
  console.log('🧪 Verificando testes...');
  try {
    execSync('npm test -- --passWithNoTests', {
      encoding: 'utf8',
      stdio: 'pipe',
    });
    checks.tests = true;
    return true;
  } catch (error) {
    console.log('⚠️  Alguns testes falharam');
    return false;
  }
}

async function checkCoverage() {
  console.log('📊 Verificando cobertura...');
  try {
    execSync('npm run test:coverage', {
      encoding: 'utf8',
      stdio: 'pipe',
    });
    
    // Ler relatório de cobertura
    const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
    if (fs.existsSync(coveragePath)) {
      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      const total = coverage.total;
      const coveragePercent = total.lines.pct;
      
      checks.coverage = coveragePercent >= 80;
      console.log(`   Cobertura atual: ${coveragePercent.toFixed(2)}%`);
      return checks.coverage;
    }
    return false;
  } catch (error) {
    console.log('⚠️  Erro ao verificar cobertura');
    return false;
  }
}

async function checkCI() {
  console.log('🔄 Verificando CI/CD...');
  const ciPath = path.join(process.cwd(), '.github', 'workflows', 'ci.yml');
  const testPath = path.join(process.cwd(), '.github', 'workflows', 'test.yml');
  
  checks.cicd = fs.existsSync(ciPath) && fs.existsSync(testPath);
  return checks.cicd;
}

async function checkPWA() {
  console.log('📱 Verificando PWA...');
  const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
  const nextConfigPath = path.join(process.cwd(), 'next.config.optimized.js');
  
  checks.pwa = fs.existsSync(manifestPath) || fs.existsSync(nextConfigPath);
  return checks.pwa;
}

async function main() {
  console.log('🎯 VALIDAÇÃO FINAL DO PROJETO\n');
  console.log('='.repeat(60));

  await checkMigrations();
  await checkTests();
  await checkCoverage();
  await checkCI();
  await checkPWA();

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DA VALIDAÇÃO');
  console.log('='.repeat(60));
  console.log(`✅ Migrations: ${checks.migrations ? 'OK' : 'PENDENTE'}`);
  console.log(`✅ Testes: ${checks.tests ? 'OK' : 'FALHANDO'}`);
  console.log(`✅ Cobertura > 80%: ${checks.coverage ? 'OK' : 'PENDENTE'}`);
  console.log(`✅ CI/CD: ${checks.cicd ? 'OK' : 'PENDENTE'}`);
  console.log(`✅ PWA: ${checks.pwa ? 'OK' : 'PENDENTE'}`);
  console.log('='.repeat(60));

  const allPassed = Object.values(checks).every(v => v === true);
  
  if (allPassed) {
    console.log('\n🎉 TODAS AS VALIDAÇÕES PASSARAM!');
    console.log('✅ Projeto pronto para produção!');
    process.exit(0);
  } else {
    console.log('\n⚠️  ALGUMAS VALIDAÇÕES FALHARAM');
    console.log('📋 Revise os itens pendentes acima');
    process.exit(1);
  }
}

main().catch(console.error);

