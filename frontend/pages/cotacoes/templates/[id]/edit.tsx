// Página de edição de template conforme documentação (linha 546-555)
// 5 abas: Básico, Itens, Galeria, Conteúdo, Contatos

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { BudgetTemplate, BudgetItem } from '@/lib/types/budget';
import { templateStorage } from '@/lib/template-storage';
import { generateId } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PhotoGalleryManager } from '@/components/photo-gallery-manager';
import { MAIN_CATEGORIES, SUB_CATEGORIES } from '@/lib/budget-types';

export default function EditTemplatePage() {
  const router = useRouter();
  const { id } = router.query;
  const [template, setTemplate] = useState<BudgetTemplate | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    if (id && typeof id === 'string') {
      const loaded = templateStorage.getById(id);
      if (loaded) {
        setTemplate(loaded);
      } else {
        router.push('/cotacoes/templates');
      }
    }
  }, [id, router]);

  const updateTemplate = (field: string, value: any) => {
    if (!template) return;
    setTemplate({
      ...template,
      [field]: value,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSave = () => {
    if (!template) return;
    
    templateStorage.save(template);
    alert('Template atualizado com sucesso!');
    router.push('/cotacoes/templates');
  };

  const addItem = () => {
    if (!template) return;
    const newItem: BudgetItem = {
      id: generateId(),
      name: '',
      description: '',
      category: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
    };
    updateTemplate('items', [...(template.items || []), newItem]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    if (!template) return;
    const newItems = [...(template.items || [])];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
      totalPrice: field === 'quantity' || field === 'unitPrice' 
        ? newItems[index].quantity * newItems[index].unitPrice 
        : newItems[index].totalPrice,
    };
    updateTemplate('items', newItems);
  };

  const removeItem = (index: number) => {
    if (!template) return;
    updateTemplate('items', (template.items || []).filter((_, i) => i !== index));
  };

  if (!isClient || !template) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
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
              <h1 className="text-3xl font-bold text-gray-900">Editar Template</h1>
              <p className="text-gray-600 mt-2">{template.name}</p>
            </div>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </Button>
          </div>
        </div>

        {/* Tabs com 5 abas conforme documento (linha 549-554) */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Básico</TabsTrigger>
            <TabsTrigger value="items">Itens</TabsTrigger>
            <TabsTrigger value="gallery">Galeria</TabsTrigger>
            <TabsTrigger value="content">Conteúdo</TabsTrigger>
            <TabsTrigger value="contacts">Contatos</TabsTrigger>
          </TabsList>

          {/* Aba 1: Básico (linha 550) */}
          <TabsContent value="basic" className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Informações Gerais</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome do Template *</Label>
                  <Input
                    id="name"
                    value={template.name || ''}
                    onChange={(e) => updateTemplate('name', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="title">Título da Cotação *</Label>
                  <Input
                    id="title"
                    value={template.title || ''}
                    onChange={(e) => updateTemplate('title', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="mainCategory">Categoria Principal *</Label>
                  <Select value={template.mainCategory || 'Hotéis'} onValueChange={(value) => {
                    updateTemplate('mainCategory', value);
                    updateTemplate('subCategory', '');
                  }}>
                    <SelectTrigger id="mainCategory">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MAIN_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="subCategory">Subcategoria</Label>
                  <Select 
                    value={template.subCategory || ''} 
                    onValueChange={(value) => updateTemplate('subCategory', value)}
                  >
                    <SelectTrigger id="subCategory">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {template.mainCategory && SUB_CATEGORIES[template.mainCategory]?.map((sub) => (
                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="thumbnailUrl">URL da Imagem de Capa</Label>
                  <Input
                    id="thumbnailUrl"
                    type="url"
                    value={template.thumbnailUrl || ''}
                    onChange={(e) => updateTemplate('thumbnailUrl', e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="description">Descrição do Template</Label>
                  <Textarea
                    id="description"
                    value={template.description || ''}
                    onChange={(e) => updateTemplate('description', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Aba 2: Itens (linha 551) */}
          <TabsContent value="items" className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Itens Padrão do Template</h2>
                <Button onClick={addItem}>+ Adicionar Item</Button>
              </div>
              <div className="space-y-4">
                {template.items?.map((item, index) => (
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
                      <span className="font-semibold">Total: R$ {(item.quantity * item.unitPrice).toFixed(2)}</span>
                      <Button variant="destructive" size="sm" onClick={() => removeItem(index)}>
                        Remover
                      </Button>
                    </div>
                  </div>
                ))}
                {(!template.items || template.items.length === 0) && (
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

          {/* Aba 3: Galeria (linha 552) */}
          <TabsContent value="gallery" className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Galeria de Fotos</h2>
              <PhotoGalleryManager
                photos={template.photos || []}
                onChange={(photos) => updateTemplate('photos', photos)}
              />
            </div>
          </TabsContent>

          {/* Aba 4: Conteúdo (linha 553) */}
          <TabsContent value="content" className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Destaques</h2>
              <div className="space-y-3">
                {(template.highlights || []).map((highlight, index) => (
                  <div key={highlight.id || index} className="flex items-center gap-3 p-3 border rounded">
                    <Input
                      value={highlight.title || ''}
                      onChange={(e) => {
                        const newHighlights = [...(template.highlights || [])];
                        newHighlights[index] = { ...highlight, title: e.target.value };
                        updateTemplate('highlights', newHighlights);
                      }}
                      placeholder="Título do destaque"
                      className="flex-1"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        updateTemplate('highlights', (template.highlights || []).filter((_, i) => i !== index));
                      }}
                    >
                      Remover
                    </Button>
                  </div>
                ))}
                <Button onClick={() => {
                  updateTemplate('highlights', [...(template.highlights || []), { id: generateId(), title: '', description: '', checked: true }]);
                }}>
                  + Adicionar Destaque
                </Button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Benefícios Inclusos</h2>
              <div className="space-y-3">
                {(template.benefits || []).map((benefit, index) => (
                  <div key={benefit.id || index} className="flex items-center gap-3 p-3 border rounded">
                    <Input
                      value={benefit.description || ''}
                      onChange={(e) => {
                        const newBenefits = [...(template.benefits || [])];
                        newBenefits[index] = { ...benefit, description: e.target.value };
                        updateTemplate('benefits', newBenefits);
                      }}
                      placeholder="Descrição do benefício"
                      className="flex-1"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        updateTemplate('benefits', (template.benefits || []).filter((_, i) => i !== index));
                      }}
                    >
                      Remover
                    </Button>
                  </div>
                ))}
                <Button onClick={() => {
                  updateTemplate('benefits', [...(template.benefits || []), { id: generateId(), description: '', icon: '' }]);
                }}>
                  + Adicionar Benefício
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Aba 5: Contatos (linha 554) */}
          <TabsContent value="contacts" className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Informações de Contato Padrão</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contactPhone">Telefone</Label>
                  <Input
                    id="contactPhone"
                    value={template.contacts?.phone || ''}
                    onChange={(e) => updateTemplate('contacts', { ...template.contacts, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="contactWhatsApp">WhatsApp</Label>
                  <Input
                    id="contactWhatsApp"
                    value={template.contacts?.whatsapp || ''}
                    onChange={(e) => updateTemplate('contacts', { ...template.contacts, whatsapp: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="contactEmail">Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={template.contacts?.email || ''}
                    onChange={(e) => updateTemplate('contacts', { ...template.contacts, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="contactWebsite">Website</Label>
                  <Input
                    id="contactWebsite"
                    value={template.contacts?.website || ''}
                    onChange={(e) => updateTemplate('contacts', { ...template.contacts, website: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

