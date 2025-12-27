/**
 * Página: Listagem de Leilões
 * FASE 1.9: Página principal de leilões ativos
 */

import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { AuctionCard } from '../components/auctions/AuctionCard';
import { WebSocketIndicator } from '../components/auctions/WebSocketIndicator';
import { AuctionFilters } from '@shared/api/auctions';
import { useAuctionsList } from '../hooks/useAuctionsList';

export default function LeiloesPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<AuctionFilters>({
    status: 'active',
    page: 1,
    limit: 20,
    sort_by: 'time',
    sort_order: 'asc',
  });

  // Usar hook para gerenciar leilões com WebSocket
  const { auctions, loading, error, pagination, wsConnected, refresh } = useAuctionsList({
    filters,
    autoRefresh: true,
    refreshInterval: 30000, // 30 segundos como fallback
  });

  const handleFilterChange = (newFilters: Partial<AuctionFilters>) => {
    setFilters({ ...filters, ...newFilters, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    setFilters({ ...filters, page: newPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    refresh(); // Forçar refresh ao mudar de página
  };

  return (
    <>
      <Head>
        <title>Leilões de Hospedagem | RSV360 - Participe e Economize</title>
        <meta
          name="description"
          content="Participe de leilões de hospedagem e economize até 50%. Leilões em tempo real com lances automáticos e pagamento seguro."
        />
        <meta
          name="keywords"
          content="leilão hospedagem, leilão hotel, leilão viagem, economizar hospedagem, lances automáticos"
        />
        <meta property="og:title" content="Leilões de Hospedagem | RSV360" />
        <meta
          property="og:description"
          content="Participe de leilões de hospedagem e economize até 50%"
        />
        <meta property="og:url" content="https://www.reserveiviagens.com.br/leiloes" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://www.reserveiviagens.com.br/leiloes" />
      </Head>

      <div className="container mx-auto px-4 py-8" id="main-content">
        <Breadcrumbs items={[{ label: 'Leilões', href: '/leiloes' }]} />

          <div className="mt-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-4xl font-bold mb-2 font-display">Leilões de Hospedagem</h1>
                  <p className="text-gray-600 text-lg">
                    Participe de leilões em tempo real e economize até 50% na sua hospedagem
                  </p>
                </div>
                <WebSocketIndicator connected={wsConnected} />
              </div>
            </div>

          {/* Filtros */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-lg font-bold mb-4">Filtros</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                <select
                  value={filters.status || 'all'}
                  onChange={(e) =>
                    handleFilterChange({
                      status: e.target.value === 'all' ? undefined : (e.target.value as any),
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos</option>
                  <option value="scheduled">Agendados</option>
                  <option value="active">Ativos</option>
                  <option value="ended">Encerrados</option>
                </select>
              </div>

              {/* Cidade */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Cidade</label>
                <input
                  type="text"
                  placeholder="Ex: Caldas Novas"
                  value={filters.city || ''}
                  onChange={(e) => handleFilterChange({ city: e.target.value || undefined })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Preço Mínimo */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Preço Mínimo
                </label>
                <input
                  type="number"
                  placeholder="R$ 0"
                  value={filters.min_price || ''}
                  onChange={(e) =>
                    handleFilterChange({
                      min_price: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Preço Máximo */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Preço Máximo
                </label>
                <input
                  type="number"
                  placeholder="R$ 1000"
                  value={filters.max_price || ''}
                  onChange={(e) =>
                    handleFilterChange({
                      max_price: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Ordenação */}
            <div className="mt-4 flex items-center gap-4">
              <label className="text-sm font-semibold text-gray-700">Ordenar por:</label>
              <select
                value={`${filters.sort_by}-${filters.sort_order}`}
                onChange={(e) => {
                  const [sort_by, sort_order] = e.target.value.split('-');
                  handleFilterChange({ sort_by: sort_by as any, sort_order: sort_order as any });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="time-asc">Tempo: Menor para Maior</option>
                <option value="time-desc">Tempo: Maior para Menor</option>
                <option value="price-asc">Preço: Menor para Maior</option>
                <option value="price-desc">Preço: Maior para Menor</option>
                <option value="popularity-desc">Mais Popular</option>
              </select>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin text-4xl">⏳</div>
              <p className="mt-4 text-gray-600">Carregando leilões...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
              <p className="text-red-800">{error}</p>
              <button
                onClick={refresh}
                className="mt-2 text-red-600 hover:text-red-800 underline"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {/* Lista de Leilões */}
          {!loading && !error && (
            <>
              {auctions.length === 0 ? (
                <div className="bg-gray-50 p-12 rounded-lg text-center">
                  <p className="text-xl text-gray-600 mb-2">Nenhum leilão encontrado</p>
                  <p className="text-gray-500">
                    Tente ajustar os filtros ou volte mais tarde
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {auctions.map((auction) => (
                      <AuctionCard key={auction.id} auction={auction} />
                    ))}
                  </div>

                  {/* Paginação */}
                  {pagination.totalPages > 1 && (
                    <nav 
                      className="flex items-center justify-center gap-2"
                      aria-label="Navegação de páginas"
                    >
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        aria-label="Página anterior"
                        aria-disabled={pagination.page === 1}
                      >
                        Anterior
                      </button>
                      <span className="px-4 py-2 text-gray-700" aria-current="page">
                        Página {pagination.page} de {pagination.totalPages}
                      </span>
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        aria-label="Próxima página"
                        aria-disabled={pagination.page === pagination.totalPages}
                      >
                        Próxima
                      </button>
                    </nav>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

