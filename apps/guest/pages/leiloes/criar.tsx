/**
 * Página: Criar Leilão
 * FASE 1.11: Página para hosts criarem novos leilões
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import { useAuth } from '../../context/AuthContext';
import { createAuction, CreateAuctionData } from '@shared/api/auctions';
import { getMyProperties, Property } from '@shared/api/properties';

// Importar ProtectedRoute com SSR desabilitado para evitar erros de SSR
const ProtectedRoute = dynamic(() => import('../../components/ProtectedRoute'), {
  ssr: false,
  loading: () => (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Carregando...</p>
      </div>
    </div>
  ),
});

// Componente interno que usa useAuth (só renderiza no cliente)
function CriarLeilaoContent() {
  const router = useRouter();
  const { user, hasPermission } = useAuth();
  const [formData, setFormData] = useState<CreateAuctionData>({
    property_id: 0,
    start_price: 0,
    min_increment: 0,
    start_time: '',
    end_time: '',
    check_in: '',
    check_out: '',
    max_guests: 2,
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);

  useEffect(() => {
    const loadProperties = async () => {
      try {
        setLoadingProperties(true);
        setPropertiesError(null);
        const response = await getMyProperties();
        setProperties(response.properties);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar propriedades';
        // Verificar se é erro de backend não disponível
        if (errorMessage.includes('Backend não disponível')) {
          setPropertiesError('Servidor não está respondendo. Verifique se o backend está rodando na porta 5000.');
        } else {
          setPropertiesError(errorMessage);
        }
        // Não logar erro se for apenas backend não disponível
        if (!errorMessage.includes('Backend não disponível')) {
          console.error('Erro ao carregar propriedades:', err);
        }
      } finally {
        setLoadingProperties(false);
      }
    };

    loadProperties();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'property_id' || name === 'max_guests' ? parseInt(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validações
      if (!formData.property_id) {
        throw new Error('Selecione uma propriedade');
      }
      if (formData.start_price <= 0) {
        throw new Error('Preço inicial deve ser maior que zero');
      }
      if (formData.min_increment <= 0) {
        throw new Error('Incremento mínimo deve ser maior que zero');
      }
      if (!formData.start_time || !formData.end_time) {
        throw new Error('Defina as datas de início e fim do leilão');
      }
      if (!formData.check_in || !formData.check_out) {
        throw new Error('Defina as datas de check-in e check-out');
      }

      // Validar que end_time > start_time
      if (new Date(formData.end_time) <= new Date(formData.start_time)) {
        throw new Error('Fim do leilão deve ser após o início');
      }

      // Validar que check_out > check_in
      if (new Date(formData.check_out) <= new Date(formData.check_in)) {
        throw new Error('Check-out deve ser após check-in');
      }

      // Converter formatos para ISO strings
      // datetime-local retorna YYYY-MM-DDTHH:mm, converter para ISO
      // date retorna YYYY-MM-DD, converter para ISO (adicionar T00:00:00.000Z)
      const auctionData: CreateAuctionData = {
        ...formData,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        // Converter date (YYYY-MM-DD) para ISO string
        check_in: new Date(formData.check_in + 'T00:00:00').toISOString(),
        check_out: new Date(formData.check_out + 'T00:00:00').toISOString(),
      };

      const auction = await createAuction(auctionData);
      router.push(`/leiloes/${auction.id}`);
    } catch (err) {
      if (err instanceof Error) {
        // Verificar se é erro de permissão
        if (err.message.includes('403') || err.message.includes('permissão') || err.message.includes('role')) {
          setError('Você não tem permissão para criar leilões. É necessário ser host ou admin.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Erro ao criar leilão');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calcular data mínima (hoje)
  const today = new Date().toISOString().split('T')[0];
  // Data máxima do leilão (30 dias a partir de hoje)
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  // Verificar permissões
  const isHostOrAdmin = hasPermission('host') || hasPermission('admin') || 
                        user?.permissions?.includes('host') || 
                        user?.permissions?.includes('admin');

  if (!isHostOrAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-bold text-yellow-800 mb-2">Acesso Restrito</h2>
            <p className="text-yellow-700">
              Você precisa ser um host ou administrador para criar leilões.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Criar Leilão | RSV360</title>
        <meta
          name="description"
          content="Crie um novo leilão para sua propriedade e maximize sua receita"
        />
        <link rel="canonical" href="https://www.reserveiviagens.com.br/leiloes/criar" />
      </Head>

      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs
          items={[
            { label: 'Leilões', href: '/leiloes' },
            { label: 'Criar Leilão', href: '/leiloes/criar' },
          ]}
        />

        <div className="mt-8 max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 font-display">Criar Novo Leilão</h1>

          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-6">
            {/* Propriedade */}
            <div>
              <label htmlFor="property_id" className="block text-sm font-semibold text-gray-700 mb-2">
                Propriedade *
              </label>
              {loadingProperties ? (
                <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
                  <span className="text-gray-500">Carregando propriedades...</span>
                </div>
              ) : propertiesError ? (
                <div className="w-full px-4 py-2 border border-red-300 rounded-lg bg-red-50">
                  <span className="text-red-600">{propertiesError}</span>
                </div>
              ) : properties.length === 0 ? (
                <div className="w-full px-4 py-2 border border-yellow-300 rounded-lg bg-yellow-50">
                  <span className="text-yellow-600">
                    Você não tem propriedades cadastradas. <a href="/properties/new" className="underline">Cadastrar propriedade</a>
                  </span>
                </div>
              ) : (
                <select
                  id="property_id"
                  name="property_id"
                  value={formData.property_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="0">Selecione uma propriedade</option>
                  {properties.map((prop) => (
                    <option key={prop.id} value={prop.id}>
                      {prop.title} - {prop.location}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Preço Inicial */}
            <div>
              <label htmlFor="start_price" className="block text-sm font-semibold text-gray-700 mb-2">
                Preço Inicial (R$) *
              </label>
              <input
                type="number"
                id="start_price"
                name="start_price"
                value={formData.start_price || ''}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Incremento Mínimo */}
            <div>
              <label
                htmlFor="min_increment"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Incremento Mínimo (R$) *
              </label>
              <input
                type="number"
                id="min_increment"
                name="min_increment"
                value={formData.min_increment || ''}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Valor mínimo que cada lance deve aumentar
              </p>
            </div>

            {/* Datas do Leilão */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="start_time"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Início do Leilão *
                </label>
                <input
                  type="datetime-local"
                  id="start_time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleChange}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="end_time" className="block text-sm font-semibold text-gray-700 mb-2">
                  Fim do Leilão *
                </label>
                <input
                  type="datetime-local"
                  id="end_time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleChange}
                  min={formData.start_time || new Date().toISOString().slice(0, 16)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Datas de Hospedagem */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="check_in" className="block text-sm font-semibold text-gray-700 mb-2">
                  Check-in *
                </label>
                <input
                  type="date"
                  id="check_in"
                  name="check_in"
                  value={formData.check_in}
                  onChange={handleChange}
                  min={today}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="check_out" className="block text-sm font-semibold text-gray-700 mb-2">
                  Check-out *
                </label>
                <input
                  type="date"
                  id="check_out"
                  name="check_out"
                  value={formData.check_out}
                  onChange={handleChange}
                  min={formData.check_in || today}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Número de Hóspedes */}
            <div>
              <label htmlFor="max_guests" className="block text-sm font-semibold text-gray-700 mb-2">
                Número Máximo de Hóspedes *
              </label>
              <input
                type="number"
                id="max_guests"
                name="max_guests"
                value={formData.max_guests}
                onChange={handleChange}
                min="1"
                max="20"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Descrição */}
            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
                Descrição (Opcional)
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Descreva a propriedade, amenidades, localização..."
              />
            </div>

            {/* Erro */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-6 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Criando Leilão...' : 'Criar Leilão'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// Componente principal que envolve com ProtectedRoute
export default function CriarLeilaoPage() {
  return (
    <ProtectedRoute
      fallback={
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando...</p>
          </div>
        </div>
      }
    >
      <CriarLeilaoContent />
    </ProtectedRoute>
  );
}

