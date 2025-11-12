// Página de customização de template conforme documentação (linha 421-438)
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowLeft, Save, Eye, Calculator } from 'lucide-react';
import { Budget, BudgetTemplate } from '@/lib/types/budget';
import { templateStorage } from '@/lib/template-storage';
import { budgetStorage } from '@/lib/budget-storage';
import { generateId, formatCurrency, calculateTotal } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { QuotePreview } from '@/components/QuotePreview';
import { exportToPDF, exportToDOCX } from '@/lib/export-utils';

export default function FromTemplatePage() {
  const router = useRouter();
  const { templateId } = router.query;
  const [template, setTemplate] = useState<BudgetTemplate | null>(null);
  const [budget, setBudget] = useState<Partial<Budget>>({});
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    if (templateId && typeof templateId === 'string') {
      const loadedTemplate = templateStorage.getById(templateId);
      if (loadedTemplate) {
        setTemplate(loadedTemplate);
        // Converter template para Budget conforme documento (linha 425-438)
        const budgetFromTemplate: Partial<Budget> = {
          id: generateId(),
          type: loadedTemplate.mainCategory?.toLowerCase() as Budget['type'] || 'personalizado',
          mainCategory: loadedTemplate.mainCategory,
          title: loadedTemplate.title || '',
          description: loadedTemplate.templateDescription || '',
          clientName: '',
          clientEmail: '',
          clientPhone: '',
          currency: 'BRL',
          items: loadedTemplate.items || [],
          photos: loadedTemplate.photos || [],
          highlights: loadedTemplate.highlights || [],
          benefits: loadedTemplate.benefits || [],
          accommodationDetails: loadedTemplate.accommodationDetails || [],
          importantNotes: loadedTemplate.importantNotes || [],
          status: 'draft',
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // Campos específicos do template
          ...(loadedTemplate.hotelName && { hotelName: loadedTemplate.hotelName }),
          ...(loadedTemplate.hotelId && { hotelId: loadedTemplate.hotelId }),
          ...(loadedTemplate.hotelCity && { hotelCity: loadedTemplate.hotelCity }),
          ...(loadedTemplate.hotelState && { hotelState: loadedTemplate.hotelState }),
          ...(loadedTemplate.companyHeader && { companyHeader: loadedTemplate.companyHeader }),
        };
        setBudget(budgetFromTemplate);
      }
    }
  }, [templateId]);

  // Verificar se template foi carregado corretamente (para debug/testes)
  useEffect(() => {
    if (template && isClient) {
      console.log('Template carregado:', {
        id: template.id,
        name: template.name,
        mainCategory: template.mainCategory,
        itemsCount: template.items?.length || 0,
        photosCount: template.photos?.length || 0,
      });
    }
  }, [template, isClient]);

  const handleSave = () => {
    if (!budget.clientName || !budget.title) {
      alert('Por favor, preencha pelo menos o nome do cliente e o título da cotação');
      return;
    }

    // Fluxo completo conforme documento (linha 808-822):
    // 1. Calcular total automaticamente
    const calculatedTotal = calculateTotal(budget as Budget);
    const subtotal = budget.items?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) || 0;
    
    // 2. Criar Budget final com ID único
    const finalBudget: Budget = {
      ...budget,
      id: budget.id || generateId(),
      total: calculatedTotal,
      subtotal,
      status: 'draft',
      createdAt: budget.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Budget;

    // 3. Salvar no localStorage conforme documento (linha 811)
    budgetStorage.save(finalBudget);
    
    // 4. Redirecionar para visualização
    alert('Cotação salva com sucesso!');
    router.push(`/cotacoes/${finalBudget.id}`);
  };

  if (!isClient) {
    return null;
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Template não encontrado</h2>
            <p className="text-gray-600 mb-6">O template solicitado não foi encontrado ou foi removido.</p>
            <Link href="/cotacoes/templates">
              <Button>Voltar para Templates</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/cotacoes/templates">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Templates
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Personalizar Template</h1>
              <p className="text-gray-600 mt-2">{template.name}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setIsPreviewOpen(true)}>
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Salvar Cotação
              </Button>
            </div>
          </div>
        </div>

        {/* Formulário de Personalização */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Informações do Cliente</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="clientName">Nome do Cliente *</Label>
              <Input
                id="clientName"
                value={budget.clientName || ''}
                onChange={(e) => setBudget({ ...budget, clientName: e.target.value })}
                placeholder="Nome completo do cliente"
              />
            </div>
            <div>
              <Label htmlFor="clientEmail">Email do Cliente *</Label>
              <Input
                id="clientEmail"
                type="email"
                value={budget.clientEmail || ''}
                onChange={(e) => setBudget({ ...budget, clientEmail: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <Label htmlFor="clientPhone">Telefone do Cliente</Label>
              <Input
                id="clientPhone"
                value={budget.clientPhone || ''}
                onChange={(e) => setBudget({ ...budget, clientPhone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Informações da Cotação</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Título da Cotação *</Label>
              <Input
                id="title"
                value={budget.title || ''}
                onChange={(e) => setBudget({ ...budget, title: e.target.value })}
                placeholder="Título da cotação"
              />
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={budget.description || ''}
                onChange={(e) => setBudget({ ...budget, description: e.target.value })}
                placeholder="Descrição detalhada da cotação"
                rows={4}
              />
            </div>
          </div>
        </div>

        {/* Resumo dos Itens do Template */}
        {budget.items && budget.items.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Itens do Template</h2>
            <div className="space-y-3">
              {budget.items.map((item, index) => (
                <div key={item.id || index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.name}</h3>
                    {item.description && (
                      <p className="text-sm text-gray-600">{item.description}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      {item.quantity} x {formatCurrency(item.unitPrice)} = {formatCurrency(item.quantity * item.unitPrice)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total:</span>
                <span className="text-2xl font-bold text-teal-600">
                  {formatCurrency(calculateTotal(budget as Budget))}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {isPreviewOpen && budget && (
          <QuotePreview
            budget={budget as Budget}
            onClose={() => setIsPreviewOpen(false)}
            onExportPDF={() => exportToPDF(budget as Budget)}
            onExportDOCX={() => exportToDOCX(budget as Budget)}
          />
        )}
      </div>
    </div>
  );
}

