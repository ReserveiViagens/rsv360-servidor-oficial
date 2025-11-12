// Página de visualização de orçamento conforme documentação (linha 507-534)
// Layout profissional, todas seções organizadas, botão impressão/PDF

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowLeft, Download, Printer, FileText, Share2, Edit } from 'lucide-react';
import { Budget } from '@/lib/types/budget';
import { budgetStorage } from '@/lib/budget-storage';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getStatusColor, getStatusLabel } from '@/lib/budget-utils';
import { Button } from '@/components/ui/button';
import { exportToPDF, exportToDOCX, generateQuoteHTML } from '@/lib/export-utils';
import { Badge } from '@/components/ui/badge';

export default function ViewBudgetPage() {
  const router = useRouter();
  const { id } = router.query;
  const [budget, setBudget] = useState<Budget | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Garantir execução apenas no cliente
    if (typeof window === 'undefined') return;

    setIsClient(true);
    // Extrai o id como string, mesmo se vindo como array do router
    const budgetId = typeof id === 'string' ? id : (Array.isArray(id) ? id[0] : null);
    if (budgetId) {
      const loaded = budgetStorage.getById(budgetId);
      if (loaded) {
        setBudget(loaded);
      } else {
        router.push('/cotacoes');
      }
    }
  }, [id, router]);

  const handlePrint = () => {
    if (!budget) return;
    const html = generateQuoteHTML(budget);
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => {
        w.print();
      }, 250);
    }
  };

  const handleExportPDF = () => {
    if (!budget) return;
    exportToPDF(budget);
  };

  const handleExportDOCX = () => {
    if (!budget) return;
    exportToDOCX(budget);
  };

  const handleEdit = () => {
    if (!budget) return;
    router.push(`/cotacoes/${id}/edit`);
  };

  if (!isClient || !budget) {
    return null;
  }

  const computeValidUntil = () => {
    if (budget.validUntil) {
      return new Date(budget.validUntil).toLocaleString('pt-BR');
    }
    const created = budget.createdAt ? new Date(budget.createdAt) : new Date();
    const d = new Date(created);
    d.setDate(d.getDate() + 30);
    return d.toLocaleString('pt-BR');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header com ações conforme documento (linha 514) */}
      <div className="bg-white border-b sticky top-0 z-10 no-print">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/cotacoes">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
              <Button variant="outline" onClick={handleExportPDF}>
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" onClick={handleExportDOCX}>
                <Download className="w-4 h-4 mr-2" />
                DOCX
              </Button>
              <Button variant="outline">
                <Share2 className="w-4 h-4 mr-2" />
                Compartilhar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal conforme documento (linha 515-526) */}
      <div className="max-w-5xl mx-auto p-8">
        {/* Cabeçalho com logo e informações da empresa (linha 516) */}
        {budget.companyHeader && (
          <div className="bg-white rounded-lg shadow p-6 mb-6" style={{ backgroundColor: budget.companyHeader.headerColor || '#f3f4f6' }}>
            <div className="flex items-center gap-4 mb-4">
              {budget.companyHeader.logoUrl && (
                <img src={budget.companyHeader.logoUrl} alt="Logo" className="w-20 h-20 object-contain" />
              )}
              <div>
                <h2 className="text-2xl font-bold">{budget.companyHeader.companyName || 'Reservei Viagens'}</h2>
                <p style={{ fontSize: '6px', color: '#6b7280', marginTop: '4px' }}>Parques Hoteis & Atrações</p>
              </div>
            </div>
            {budget.companyHeader.socialMedia && (
              <div className="flex gap-4 text-sm">
                {budget.companyHeader.socialMedia.facebook && (
                  <a href={budget.companyHeader.socialMedia.facebook} target="_blank" rel="noopener noreferrer">Facebook</a>
                )}
                {budget.companyHeader.socialMedia.instagram && (
                  <a href={budget.companyHeader.socialMedia.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>
                )}
                {budget.companyHeader.socialMedia.whatsapp && (
                  <a href={budget.companyHeader.socialMedia.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Título e descrição (linha 517) */}
        <div className="bg-white rounded-lg shadow p-6 mb-6 print-avoid-break">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{budget.title}</h1>
              {budget.description && (
                <p className="text-gray-600 text-lg">{budget.description}</p>
              )}
            </div>
            <Badge className={getStatusColor(budget.status)}>{getStatusLabel(budget.status)}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
            <div>
              <p className="text-sm text-gray-600">Cliente</p>
              <p className="font-semibold">{budget.clientName}</p>
              <p className="text-sm text-gray-500">{budget.clientEmail}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Data de Criação</p>
              <p className="font-semibold">{formatDate(budget.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Validade</p>
              <p className="font-semibold">{computeValidUntil()}</p>
            </div>
          </div>
        </div>

        {/* Mensagem de Urgência */}
        {budget.showUrgencyMessage && budget.urgencyMessage && (
          <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 mb-6 print-avoid-break">
            <p className="text-red-800 font-semibold">{budget.urgencyMessage}</p>
          </div>
        )}

        {/* Galeria de fotos (linha 518) */}
        {budget.photos && budget.photos.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6 print-avoid-break">
            <h2 className="text-xl font-semibold mb-4">Galeria de Fotos</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {budget.photos.filter(p => p.type !== 'video').map((photo, index) => (
                <div key={photo.id || index} className="relative aspect-square overflow-hidden rounded-lg">
                  <img
                    src={photo.url}
                    alt={photo.caption || `Foto ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-2">
                      {photo.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Destaques (linha 519) */}
        {budget.highlights && budget.highlights.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6 print-avoid-break">
            <h2 className="text-xl font-semibold mb-4">Destaques</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {budget.highlights.map((highlight, index) => (
                <div key={highlight.id || index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <span className="text-blue-600 font-semibold">✓</span>
                  <div>
                    <h3 className="font-semibold">{highlight.title}</h3>
                    {highlight.description && (
                      <p className="text-sm text-gray-600 mt-1">{highlight.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Roteiro detalhado (linha 520) */}
        {budget.detailedItinerary && budget.detailedItinerary.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6 print-avoid-break">
            <h2 className="text-xl font-semibold mb-4">Roteiro Detalhado</h2>
            <div className="space-y-4">
              {budget.detailedItinerary.map((day, index) => (
                <div key={day.day || index} className="border-l-4 border-teal-500 pl-4">
                  <h3 className="font-semibold text-lg mb-2">Dia {day.day}: {day.title}</h3>
                  {day.activities && day.activities.length > 0 && (
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      {day.activities.map((activity, i) => (
                        <li key={i}>{activity}</li>
                      ))}
                    </ul>
                  )}
                  {day.description && (
                    <p className="text-gray-600 mt-2">{day.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Benefícios incluídos (linha 521) */}
        {budget.benefits && budget.benefits.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6 print-avoid-break">
            <h2 className="text-xl font-semibold mb-4">Benefícios Inclusos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {budget.benefits.map((benefit, index) => (
                <div key={benefit.id || index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <span className="text-green-600 font-semibold">✓</span>
                  <p className="text-gray-700">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detalhes de acomodação (linha 522) */}
        {budget.accommodationDetails && budget.accommodationDetails.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6 print-avoid-break">
            <h2 className="text-xl font-semibold mb-4">Detalhes de Acomodação</h2>
            <div className="space-y-4">
              {budget.accommodationDetails.map((detail, index) => (
                <div key={detail.id || index} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">{detail.roomType || `Acomodação ${index + 1}`}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {detail.checkIn && <div><span className="font-medium">Check-in:</span> {detail.checkIn}</div>}
                    {detail.checkOut && <div><span className="font-medium">Check-out:</span> {detail.checkOut}</div>}
                    {detail.guests && <div><span className="font-medium">Hóspedes:</span> {detail.guests}</div>}
                    {detail.accommodationType && <div><span className="font-medium">Tipo:</span> {detail.accommodationType}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Informações de investimento (linha 523) */}
        <div className="bg-white rounded-lg shadow p-6 mb-6 print-avoid-break">
          <h2 className="text-xl font-semibold mb-4">Informações de Investimento</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="font-medium">Subtotal:</span>
              <span className="font-semibold">{formatCurrency(budget.subtotal || 0)}</span>
            </div>
            {budget.discount && budget.discount > 0 && (
              <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                <span className="font-medium">Desconto:</span>
                <span className="font-semibold text-green-600">-{formatCurrency(budget.discount)}</span>
              </div>
            )}
            {budget.taxes && budget.taxes > 0 && (
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                <span className="font-medium">Taxas:</span>
                <span className="font-semibold">{formatCurrency(budget.taxes)}</span>
              </div>
            )}
            <div className="flex justify-between items-center p-4 bg-teal-50 border-2 border-teal-500 rounded-lg">
              <span className="text-lg font-semibold">Total:</span>
              <span className="text-2xl font-bold text-teal-600">{formatCurrency(budget.total || 0)}</span>
            </div>
          </div>
        </div>

        {/* Itens detalhados */}
        {budget.items && budget.items.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6 print-avoid-break">
            <h2 className="text-xl font-semibold mb-4">Itens Detalhados</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Item</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Quantidade</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Preço Unitário</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {budget.items.map((item, index) => (
                    <tr key={item.id || index}>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.description && (
                            <p className="text-sm text-gray-600">{item.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="text-right py-3 px-4">{item.quantity}</td>
                      <td className="text-right py-3 px-4">{formatCurrency(item.unitPrice)}</td>
                      <td className="text-right py-3 px-4 font-semibold">{formatCurrency(item.quantity * item.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Notas importantes (linha 524) */}
        {budget.importantNotes && budget.importantNotes.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6 print-avoid-break">
            <h2 className="text-xl font-semibold mb-4">Notas Importantes</h2>
            <div className="space-y-3">
              {budget.importantNotes.map((note, index) => (
                <div key={note.id || index} className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                  <p className="text-gray-800">{note.note}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contatos e redes sociais (linha 525) */}
        {(budget.contacts || budget.companyHeader?.socialMedia) && (
          <div className="bg-white rounded-lg shadow p-6 mb-6 print-avoid-break">
            <h2 className="text-xl font-semibold mb-4">Contatos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {budget.contacts?.phone && (
                <div>
                  <p className="text-sm text-gray-600">Telefone</p>
                  <p className="font-semibold">{budget.contacts.phone}</p>
                </div>
              )}
              {budget.contacts?.whatsapp && (
                <div>
                  <p className="text-sm text-gray-600">WhatsApp</p>
                  <p className="font-semibold">{budget.contacts.whatsapp}</p>
                </div>
              )}
              {budget.contacts?.email && (
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold">{budget.contacts.email}</p>
                </div>
              )}
              {budget.contacts?.website && (
                <div>
                  <p className="text-sm text-gray-600">Website</p>
                  <a href={budget.contacts.website} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 hover:underline">
                    {budget.contacts.website}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rodapé personalizado (linha 526) */}
        <div 
          className="bg-white rounded-lg shadow p-6 print-avoid-break"
          style={{ backgroundColor: budget.companyHeader?.footerBackgroundColor || '#1f2937' }}
        >
          <div className="text-center text-white">
            <p className="font-bold text-lg mb-1">Reservei Viagens</p>
            <p style={{ fontSize: '6px', color: '#9ca3af', marginBottom: '8px' }}>Parques Hoteis & Atrações</p>
            {budget.validUntil && (
              <p className="text-sm mt-4">
                {budget.showUrgencyMessage && budget.urgencyMessage ? (
                  <span>{budget.urgencyMessage}</span>
                ) : (
                  <span>Orçamento válido sujeito a disponibilidade, não garantimos a disponibilidade de unidades sem a confirmação do pagamento da entrada, pois trabalhamos com valores promocionais.</span>
                )}
              </p>
            )}
            <p className="text-xs mt-4 opacity-75">
              Este documento foi gerado em {formatDate(budget.createdAt)} e atualizado em {formatDate(budget.updatedAt || budget.createdAt)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

