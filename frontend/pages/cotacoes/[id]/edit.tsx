// Página de edição de orçamento conforme documentação (linha 449-506)
// 8 abas: Básico, Itens, Financeiro, Galeria, Vídeos, Conteúdo, Contatos, Cabeçalho

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowLeft, Save, Eye, DollarSign, Image, Video, FileText, Phone, Settings } from 'lucide-react';
import { Budget, BudgetItem, Photo, Highlight, Benefit, AccommodationDetail, ImportantNote, ContactInfo, CompanyHeader } from '@/lib/types/budget';
import { budgetStorage } from '@/lib/budget-storage';
import { generateId, formatCurrency, calculateSubtotal, calculateDiscount, calculateTax, calculateTotal } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PhotoGalleryManager } from '@/components/photo-gallery-manager';
import { VideoGalleryManager } from '@/components/video-gallery-manager';
import { NoteTemplatesManager } from '@/components/note-templates-manager';
import { QuotePreview } from '@/components/QuotePreview';
import { exportToPDF, exportToDOCX } from '@/lib/export-utils';
import { getStatusColor, getStatusLabel } from '@/lib/budget-utils';

export default function EditBudgetPage() {
  const router = useRouter();
  const { id } = router.query;
  const [budget, setBudget] = useState<Budget | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    setIsClient(true);
    
    if (id && typeof id === 'string') {
      const loaded = budgetStorage.getById(id);
      if (loaded) {
        setBudget(loaded);
      } else {
        router.push('/cotacoes');
      }
    }
  }, [id, router]);

  const updateBudget = (field: string, value: any) => {
    if (!budget) return;
    setBudget({
      ...budget,
      [field]: value,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSave = () => {
    if (!budget) return;
    
    // Recalcular total
    const subtotal = calculateSubtotal(budget.items || []);
    const discountValue = calculateDiscount(subtotal, budget.discount || 0, budget.discountType || 'percentage');
    const taxValue = calculateTax(subtotal - discountValue, budget.taxes || budget.tax || 0, budget.taxType || 'percentage');
    const total = subtotal - discountValue + taxValue;
    
    const updated: Budget = {
      ...budget,
      subtotal,
      total,
      updatedAt: new Date().toISOString(),
    };
    
    budgetStorage.save(updated);
    alert('Orçamento atualizado com sucesso!');
    router.push(`/cotacoes/${budget.type}?view=${budget.id}`);
  };

  const addItem = () => {
    if (!budget) return;
    const newItem: BudgetItem = {
      id: generateId(),
      name: '',
      description: '',
      category: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
    };
    setBudget({
      ...budget,
      items: [...(budget.items || []), newItem],
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    if (!budget) return;
    const newItems = [...(budget.items || [])];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
      totalPrice: field === 'quantity' || field === 'unitPrice' 
        ? newItems[index].quantity * newItems[index].unitPrice 
        : newItems[index].totalPrice,
    };
    setBudget({
      ...budget,
      items: newItems,
      updatedAt: new Date().toISOString(),
    });
  };

  const removeItem = (index: number) => {
    if (!budget) return;
    setBudget({
      ...budget,
      items: (budget.items || []).filter((_, i) => i !== index),
      updatedAt: new Date().toISOString(),
    });
  };

  if (!isClient || !budget) {
    return null;
  }

  const subtotal = calculateSubtotal(budget.items || []);
  const discountValue = calculateDiscount(subtotal, budget.discount || 0, budget.discountType || 'percentage');
  const taxValue = calculateTax(subtotal - discountValue, budget.taxes || budget.tax || 0, budget.taxType || 'percentage');
  const total = subtotal - discountValue + taxValue;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/cotacoes">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Cotações
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Editar Orçamento</h1>
              <p className="text-gray-600 mt-2">{budget.title || 'Sem título'}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setIsPreviewOpen(true)}>
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Salvar Alterações
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs com 8 abas conforme documento (linha 453-506) */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="basic">Básico</TabsTrigger>
            <TabsTrigger value="items">Itens</TabsTrigger>
            <TabsTrigger value="financial">Financeiro</TabsTrigger>
            <TabsTrigger value="gallery">Galeria</TabsTrigger>
            <TabsTrigger value="videos">Vídeos</TabsTrigger>
            <TabsTrigger value="content">Conteúdo</TabsTrigger>
            <TabsTrigger value="contacts">Contatos</TabsTrigger>
            <TabsTrigger value="header">Cabeçalho</TabsTrigger>
          </TabsList>

          {/* Aba 1: Básico (linha 455-461) */}
          <TabsContent value="basic" className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Informações do Cliente</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientName">Nome do Cliente *</Label>
                  <Input
                    id="clientName"
                    value={budget.clientName || ''}
                    onChange={(e) => updateBudget('clientName', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="clientEmail">Email do Cliente *</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={budget.clientEmail || ''}
                    onChange={(e) => updateBudget('clientEmail', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="clientPhone">Telefone do Cliente</Label>
                  <Input
                    id="clientPhone"
                    value={budget.clientPhone || ''}
                    onChange={(e) => updateBudget('clientPhone', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Informações da Cotação</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={budget.title || ''}
                    onChange={(e) => updateBudget('title', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={budget.description || ''}
                    onChange={(e) => updateBudget('description', e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Tipo de Orçamento</Label>
                    <Select value={budget.type || 'personalizado'} onValueChange={(value) => updateBudget('type', value)}>
                      <SelectTrigger id="type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hotel">Hotel</SelectItem>
                        <SelectItem value="parque">Parque</SelectItem>
                        <SelectItem value="atracao">Atração</SelectItem>
                        <SelectItem value="passeio">Passeio</SelectItem>
                        <SelectItem value="personalizado">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={budget.status || 'draft'} onValueChange={(value) => updateBudget('status', value)}>
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Rascunho</SelectItem>
                        <SelectItem value="sent">Enviado</SelectItem>
                        <SelectItem value="approved">Aprovado</SelectItem>
                        <SelectItem value="rejected">Rejeitado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="validUntil">Validade</Label>
                  <Input
                    id="validUntil"
                    type="datetime-local"
                    value={budget.validUntil ? new Date(budget.validUntil).toISOString().slice(0, 16) : ''}
                    onChange={(e) => updateBudget('validUntil', new Date(e.target.value).toISOString())}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Aba 2: Itens (linha 462-467) */}
          <TabsContent value="items" className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Itens do Orçamento</h2>
                <Button onClick={addItem}>
                  <span>+</span> Adicionar Item
                </Button>
              </div>
              <div className="space-y-4">
                {budget.items?.map((item, index) => (
                  <div key={item.id || index} className="border rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Nome do Item *</Label>
                        <Input
                          value={item.name || ''}
                          onChange={(e) => updateItem(index, 'name', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Categoria</Label>
                        <Input
                          value={item.category || ''}
                          onChange={(e) => updateItem(index, 'category', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Quantidade</Label>
                        <Input
                          type="number"
                          value={item.quantity || 1}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div>
                        <Label>Preço Unitário</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unitPrice || 0}
                          onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Descrição</Label>
                        <Textarea
                          value={item.description || ''}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          rows={2}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Total: {formatCurrency(item.quantity * item.unitPrice)}</span>
                      <Button variant="destructive" size="sm" onClick={() => removeItem(index)}>
                        Remover
                      </Button>
                    </div>
                  </div>
                ))}
                {(!budget.items || budget.items.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <p>Nenhum item adicionado ainda</p>
                    <Button onClick={addItem} className="mt-4">
                      Adicionar Primeiro Item
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Aba 3: Financeiro (linha 468-473) */}
          <TabsContent value="financial" className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Cálculos Financeiros</h2>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Subtotal:</span>
                    <span className="text-lg font-semibold">{formatCurrency(subtotal)}</span>
                  </div>
                  <p className="text-sm text-gray-600">Calculado automaticamente dos itens</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="discount">Desconto</Label>
                    <div className="flex gap-2">
                      <Input
                        id="discount"
                        type="number"
                        step="0.01"
                        value={budget.discount || 0}
                        onChange={(e) => updateBudget('discount', parseFloat(e.target.value) || 0)}
                        className="flex-1"
                      />
                      <Select value={budget.discountType || 'percentage'} onValueChange={(value) => updateBudget('discountType', value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">%</SelectItem>
                          <SelectItem value="fixed">Fixo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Valor: {formatCurrency(discountValue)}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="tax">Taxa</Label>
                    <div className="flex gap-2">
                      <Input
                        id="tax"
                        type="number"
                        step="0.01"
                        value={budget.taxes || budget.tax || 0}
                        onChange={(e) => {
                          updateBudget('taxes', parseFloat(e.target.value) || 0);
                          updateBudget('tax', parseFloat(e.target.value) || 0);
                        }}
                        className="flex-1"
                      />
                      <Select value={budget.taxType || 'percentage'} onValueChange={(value) => updateBudget('taxType', value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">%</SelectItem>
                          <SelectItem value="fixed">Fixo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Valor: {formatCurrency(taxValue)}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-teal-50 border-2 border-teal-500 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total Final:</span>
                    <span className="text-2xl font-bold text-teal-600">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Aba 4: Galeria (linha 474-480) */}
          <TabsContent value="gallery" className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Galeria de Fotos</h2>
              <PhotoGalleryManager
                photos={budget.photos || []}
                onChange={(photos) => updateBudget('photos', photos)}
              />
            </div>
          </TabsContent>

          {/* Aba 5: Vídeos (linha 481-485) */}
          <TabsContent value="videos" className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Vídeos do YouTube</h2>
              <VideoGalleryManager
                videos={(budget.photos || []).filter(p => p.type === 'video')}
                onChange={(videos) => {
                  const photos = (budget.photos || []).filter(p => p.type !== 'video');
                  updateBudget('photos', [...photos, ...videos]);
                }}
              />
            </div>
          </TabsContent>

          {/* Aba 6: Conteúdo (linha 486-493) */}
          <TabsContent value="content" className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Destaques</h2>
              <div className="space-y-3">
                {(budget.highlights || []).map((highlight, index) => (
                  <div key={highlight.id || index} className="flex items-center gap-3 p-3 border rounded">
                    <Input
                      value={highlight.title || ''}
                      onChange={(e) => {
                        const newHighlights = [...(budget.highlights || [])];
                        newHighlights[index] = { ...highlight, title: e.target.value };
                        updateBudget('highlights', newHighlights);
                      }}
                      placeholder="Título do destaque"
                      className="flex-1"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        updateBudget('highlights', (budget.highlights || []).filter((_, i) => i !== index));
                      }}
                    >
                      Remover
                    </Button>
                  </div>
                ))}
                <Button onClick={() => {
                  updateBudget('highlights', [...(budget.highlights || []), { id: generateId(), title: '', description: '', checked: true }]);
                }}>
                  + Adicionar Destaque
                </Button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Benefícios Inclusos</h2>
              <div className="space-y-3">
                {(budget.benefits || []).map((benefit, index) => (
                  <div key={benefit.id || index} className="flex items-center gap-3 p-3 border rounded">
                    <Input
                      value={benefit.description || ''}
                      onChange={(e) => {
                        const newBenefits = [...(budget.benefits || [])];
                        newBenefits[index] = { ...benefit, description: e.target.value };
                        updateBudget('benefits', newBenefits);
                      }}
                      placeholder="Descrição do benefício"
                      className="flex-1"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        updateBudget('benefits', (budget.benefits || []).filter((_, i) => i !== index));
                      }}
                    >
                      Remover
                    </Button>
                  </div>
                ))}
                <Button onClick={() => {
                  updateBudget('benefits', [...(budget.benefits || []), { id: generateId(), description: '', icon: '' }]);
                }}>
                  + Adicionar Benefício
                </Button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Notas Importantes</h2>
              {/* Integrar NoteTemplatesManager conforme documento (linha 648-656) */}
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Templates de Notas Reutilizáveis</h3>
                  <NoteTemplatesManager
                    onSelect={(template) => {
                      // Aplicar template de nota aos importantNotes
                      const newNote: ImportantNote = {
                        id: generateId(),
                        note: template.content,
                        checked: true,
                      };
                      updateBudget('importantNotes', [...(budget.importantNotes || []), newNote]);
                    }}
                  />
                </div>
                <div className="space-y-3 pt-4 border-t">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Notas do Orçamento</h3>
                  {(budget.importantNotes || []).map((note, index) => (
                    <div key={note.id || index} className="flex items-center gap-3 p-3 border rounded">
                      <Textarea
                        value={note.note || ''}
                        onChange={(e) => {
                          const newNotes = [...(budget.importantNotes || [])];
                          newNotes[index] = { ...note, note: e.target.value };
                          updateBudget('importantNotes', newNotes);
                        }}
                        placeholder="Conteúdo da nota"
                        rows={2}
                        className="flex-1"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          updateBudget('importantNotes', (budget.importantNotes || []).filter((_, i) => i !== index));
                        }}
                      >
                        Remover
                      </Button>
                    </div>
                  ))}
                  <Button onClick={() => {
                    updateBudget('importantNotes', [...(budget.importantNotes || []), { id: generateId(), note: '', checked: true }]);
                  }}>
                    + Adicionar Nota Manualmente
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Aba 7: Contatos (linha 494-500) */}
          <TabsContent value="contacts" className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Informações de Contato</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contactPhone">Telefone</Label>
                  <Input
                    id="contactPhone"
                    value={budget.contacts?.phone || ''}
                    onChange={(e) => updateBudget('contacts', { ...budget.contacts, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="contactWhatsApp">WhatsApp</Label>
                  <Input
                    id="contactWhatsApp"
                    value={budget.contacts?.whatsapp || ''}
                    onChange={(e) => updateBudget('contacts', { ...budget.contacts, whatsapp: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="contactEmail">Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={budget.contacts?.email || ''}
                    onChange={(e) => updateBudget('contacts', { ...budget.contacts, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="contactWebsite">Website</Label>
                  <Input
                    id="contactWebsite"
                    value={budget.contacts?.website || ''}
                    onChange={(e) => updateBudget('contacts', { ...budget.contacts, website: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Aba 8: Cabeçalho (linha 501-506) */}
          <TabsContent value="header" className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Cabeçalho da Empresa</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="companyName">Nome da Empresa</Label>
                  <Input
                    id="companyName"
                    value={budget.companyHeader?.companyName || 'Reservei Viagens'}
                    onChange={(e) => updateBudget('companyHeader', {
                      ...budget.companyHeader,
                      companyName: e.target.value,
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="logoUrl">URL do Logo</Label>
                  <Input
                    id="logoUrl"
                    value={budget.companyHeader?.logoUrl || ''}
                    onChange={(e) => updateBudget('companyHeader', {
                      ...budget.companyHeader,
                      logoUrl: e.target.value,
                    })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="headerColor">Cor do Cabeçalho</Label>
                    <Input
                      id="headerColor"
                      type="color"
                      value={budget.companyHeader?.headerColor || '#10b981'}
                      onChange={(e) => updateBudget('companyHeader', {
                        ...budget.companyHeader,
                        headerColor: e.target.value,
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="footerColor">Cor do Rodapé</Label>
                    <Input
                      id="footerColor"
                      type="color"
                      value={budget.companyHeader?.footerColor || '#1f2937'}
                      onChange={(e) => updateBudget('companyHeader', {
                        ...budget.companyHeader,
                        footerColor: e.target.value,
                      })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Preview Modal */}
        {isPreviewOpen && (
          <QuotePreview
            budget={budget}
            onClose={() => setIsPreviewOpen(false)}
            onExportPDF={() => exportToPDF(budget)}
            onExportDOCX={() => exportToDOCX(budget)}
          />
        )}
      </div>
    </div>
  );
}

