/**
 * Script para gerar relatório de cobertura de testes
 * e identificar arquivos abaixo de 80%
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projects = [
  { name: 'root', path: '.' },
  { name: 'backend', path: 'backend' },
  { name: 'hotel-main', path: 'Hotel-com-melhor-preco-main' },
];

const report = {
  timestamp: new Date().toISOString(),
  projects: [],
  summary: {
    totalFiles: 0,
    filesBelow80: 0,
    averageCoverage: 0,
  },
};

async function generateCoverageReport(project) {
  const projectPath = path.resolve(__dirname, '..', project.path);
  const packageJsonPath = path.join(projectPath, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }

  try {
    process.chdir(projectPath);
    console.log(`\n📊 Gerando relatório para ${project.name}...`);

    // Executar testes com cobertura
    execSync('npm run test:coverage -- --json > coverage-report.json 2>&1 || true', {
      stdio: 'inherit',
    });

    // Ler relatório JSON
    const reportPath = path.join(projectPath, 'coverage-report.json');
    if (fs.existsSync(reportPath)) {
      const coverageData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      
      const files = [];
      let totalCoverage = 0;
      let fileCount = 0;

      if (coverageData.coverageMap) {
        Object.entries(coverageData.coverageMap).forEach(([file, data]) => {
          const coverage = data.s?.pct || 0;
          totalCoverage += coverage;
          fileCount++;

          if (coverage < 80) {
            files.push({
              file,
              coverage: coverage.toFixed(2),
              statements: data.s?.pct || 0,
              branches: data.b?.pct || 0,
              functions: data.f?.pct || 0,
              lines: data.l?.pct || 0,
            });
          }
        });
      }

      return {
        name: project.name,
        path: project.path,
        averageCoverage: fileCount > 0 ? (totalCoverage / fileCount).toFixed(2) : 0,
        totalFiles: fileCount,
        filesBelow80: files.length,
        files: files.sort((a, b) => parseFloat(a.coverage) - parseFloat(b.coverage)),
      };
    }
  } catch (error) {
    console.error(`Erro ao gerar relatório para ${project.name}:`, error.message);
  }

  return null;
}

async function main() {
  console.log('🔍 Gerando relatório de cobertura de testes...\n');

  for (const project of projects) {
    const projectReport = await generateCoverageReport(project);
    if (projectReport) {
      report.projects.push(projectReport);
      report.summary.totalFiles += projectReport.totalFiles;
      report.summary.filesBelow80 += projectReport.filesBelow80;
    }
  }

  // Calcular média geral
  const totalCoverage = report.projects.reduce((sum, p) => sum + parseFloat(p.averageCoverage || 0), 0);
  report.summary.averageCoverage = report.projects.length > 0
    ? (totalCoverage / report.projects.length).toFixed(2)
    : 0;

  // Salvar relatório
  const reportPath = path.join(__dirname, '..', 'test-coverage-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Gerar relatório em texto
  console.log('\n' + '='.repeat(60));
  console.log('📊 RELATÓRIO DE COBERTURA DE TESTES');
  console.log('='.repeat(60));
  console.log(`\n📈 Cobertura Média: ${report.summary.averageCoverage}%`);
  console.log(`📁 Total de Arquivos: ${report.summary.totalFiles}`);
  console.log(`⚠️  Arquivos abaixo de 80%: ${report.summary.filesBelow80}\n`);

  report.projects.forEach(p => {
    console.log(`\n📦 ${p.name}:`);
    console.log(`   Cobertura média: ${p.averageCoverage}%`);
    console.log(`   Arquivos abaixo de 80%: ${p.filesBelow80}`);
    if (p.filesBelow80 > 0) {
      console.log(`\n   Arquivos que precisam de atenção:`);
      p.files.slice(0, 10).forEach(f => {
        console.log(`   - ${f.file}: ${f.coverage}%`);
      });
      if (p.files.length > 10) {
        console.log(`   ... e mais ${p.files.length - 10} arquivos`);
      }
    }
  });

  console.log(`\n📄 Relatório completo salvo em: ${reportPath}`);
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);

