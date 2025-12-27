/**
 * Script para gerar templates de testes faltantes
 * baseado no relatório de cobertura
 */

const fs = require('fs');
const path = require('path');

const testTemplates = {
  service: `import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('{{serviceName}}', () => {
  beforeEach(() => {
    // Setup antes de cada teste
  });

  it('should {{testDescription}}', () => {
    // Teste aqui
    expect(true).toBe(true);
  });
});`,

  component: `import { render, screen } from '@testing-library/react';
import { {{componentName}} } from './{{componentName}}';

describe('{{componentName}}', () => {
  it('should render correctly', () => {
    render(<{{componentName}} />);
    expect(screen.getByText(/test/i)).toBeInTheDocument();
  });
});`,
};

function createTestFile(filePath, type = 'service') {
  const fileName = path.basename(filePath, path.extname(filePath));
  const dir = path.dirname(filePath);
  const testDir = path.join(dir, '__tests__');
  const testFile = path.join(testDir, `${fileName}.test${path.extname(filePath)}`);

  // Criar diretório se não existir
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // Verificar se arquivo já existe
  if (fs.existsSync(testFile)) {
    console.log(`⏭️  Teste já existe: ${testFile}`);
    return;
  }

  // Determinar tipo de template
  const template = type === 'component' ? testTemplates.component : testTemplates.service;
  
  // Substituir placeholders
  const content = template
    .replace(/{{serviceName}}/g, fileName)
    .replace(/{{componentName}}/g, fileName)
    .replace(/{{testDescription}}/g, 'work correctly');

  // Criar arquivo
  fs.writeFileSync(testFile, content);
  console.log(`✅ Teste criado: ${testFile}`);
}

// Serviços críticos que precisam de testes
const criticalServices = [
  { path: 'backend/src/services/bookingService.js', type: 'service' },
  { path: 'backend/src/services/propertyService.js', type: 'service' },
  { path: 'backend/src/services/paymentService.js', type: 'service' },
  { path: 'backend/src/services/notificationService.js', type: 'service' },
  { path: 'backend/src/services/analyticsService.js', type: 'service' },
  { path: 'backend/src/services/crmService.js', type: 'service' },
];

function main() {
  console.log('📝 Criando templates de testes faltantes...\n');

  criticalServices.forEach(service => {
    const fullPath = path.join(__dirname, '..', service.path);
    if (fs.existsSync(fullPath)) {
      createTestFile(fullPath, service.type);
    } else {
      console.log(`⚠️  Arquivo não encontrado: ${service.path}`);
    }
  });

  console.log('\n✅ Templates de testes criados!');
}

main();

