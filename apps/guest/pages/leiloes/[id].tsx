/**
 * Página: Detalhes do Leilão
 * FASE 1.10: Página de detalhes com timer, lances e pagamento
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import { AuctionTimer } from '../../components/auctions/AuctionTimer';
import { AuctionStatus } from '../../components/auctions/AuctionStatus';
import { BidForm } from '../../components/auctions/BidForm';
import { BidHistory } from '../../components/auctions/BidHistory';
import { PaymentModal } from '../../components/auctions/PaymentModal';
import { checkPaymentRequired } from '@shared/api/auctions';
import { useAuction } from '../../hooks/useAuction';

export default function LeilaoDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTimeRemaining, setPaymentTimeRemaining] = useState<number | null>(null);

  // Usar hook para gerenciar leilão com WebSocket
  const { auction, bids, loading, error, wsConnected, refresh } = useAuction({
    auctionId: id as string | undefined,
    autoRefresh: true,
    refreshInterval: 10000, // 10 segundos como fallback
  });

  // Verificar se precisa pagar
  useEffect(() => {
    if (id && typeof id === 'string' && auction) {
      checkPayment();
    }
  }, [id, auction]);

  const checkPayment = async () => {
    if (!id || typeof id !== 'string') return;

    try {
      const result = await checkPaymentRequired(id);
      if (result.requires_payment) {
        setShowPaymentModal(true);
        setPaymentTimeRemaining(result.time_remaining || null);
      }
    } catch (err) {
      // Silenciar erro - pode ser que não seja vencedor
      console.error('Erro ao verificar pagamento:', err);
    }
  };

  const handleBidCreated = () => {
    // Hook já atualiza automaticamente via WebSocket
    // Mas podemos forçar refresh se necessário
    refresh();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin text-4xl">⏳</div>
          <p className="mt-4 text-gray-600">Carregando leilão...</p>
        </div>
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800 text-lg font-semibold mb-2">
            {error || 'Leilão não encontrado'}
          </p>
          <button
            onClick={() => router.push('/leiloes')}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Voltar para leilões
          </button>
        </div>
      </div>
    );
  }

  const mainImage = auction.property.images?.[0] || '/placeholder-property.jpg';
  const otherImages = auction.property.images?.slice(1, 5) || [];

  return (
    <>
      <Head>
        <link rel="preload" href={mainImage} as="image" />
        <title>{auction.property.title} - Leilão | RSV360</title>
        <meta
          name="description"
          content={`Leilão de ${auction.property.title} em ${auction.property.location}. Lance atual: R$ ${auction.current_bid.toLocaleString('pt-BR')}/noite`}
        />
        <meta property="og:title" content={`${auction.property.title} - Leilão | RSV360`} />
        <meta property="og:description" content={`Participe do leilão e economize na sua hospedagem`} />
        <meta property="og:url" content={`https://www.reserveiviagens.com.br/leiloes/${id}`} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={`https://www.reserveiviagens.com.br/leiloes/${id}`} />
      </Head>

      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs
          items={[
            { label: 'Leilões', href: '/leiloes' },
            { label: auction.property.title, href: `/leiloes/${id}` },
          ]}
        />

        <div className="mt-8">
          {/* Header com Status e Timer */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2 font-display">{auction.property.title}</h1>
                <p className="text-gray-600 flex items-center gap-1">
                  <span>📍</span>
                  <span>{auction.property.location}</span>
                </p>
              </div>
              <AuctionStatus status={auction.status} winnerName={auction.winner?.name} />
            </div>

            {auction.status === 'active' && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <AuctionTimer
                    endTime={auction.end_time}
                    extendedTime={auction.extended_time}
                    status={auction.status}
                    size="large"
                  />
                  <div className="flex items-center gap-2 text-sm">
                    {wsConnected ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Tempo Real
                      </span>
                    ) : (
                      <span className="text-gray-500 flex items-center gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                        Atualizando...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna Principal */}
            <div className="lg:col-span-2 space-y-6">
              {/* Galeria de Imagens */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="relative h-96 bg-gray-200">
                  <Image
                    src={mainImage}
                    alt={auction.property.title}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
                {otherImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 p-2">
                    {otherImages.map((img, idx) => (
                      <div key={idx} className="relative h-20 bg-gray-200 rounded overflow-hidden">
                        <Image
                          src={img}
                          alt={`${auction.property.title} - Imagem ${idx + 2}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Descrição */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-4">Sobre a Propriedade</h2>
                {auction.description ? (
                  <p className="text-gray-700 whitespace-pre-line">{auction.description}</p>
                ) : (
                  <p className="text-gray-500">Sem descrição disponível.</p>
                )}

                {/* Amenidades */}
                {auction.property.amenities && auction.property.amenities.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3">Amenidades</h3>
                    <div className="flex flex-wrap gap-2">
                      {auction.property.amenities.map((amenity, idx) => (
                        <span
                          key={idx}
                          className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detalhes */}
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {auction.property.bedrooms && (
                    <div>
                      <p className="text-sm text-gray-600">Quartos</p>
                      <p className="text-lg font-semibold">{auction.property.bedrooms}</p>
                    </div>
                  )}
                  {auction.property.bathrooms && (
                    <div>
                      <p className="text-sm text-gray-600">Banheiros</p>
                      <p className="text-lg font-semibold">{auction.property.bathrooms}</p>
                    </div>
                  )}
                  {auction.property.max_guests && (
                    <div>
                      <p className="text-sm text-gray-600">Hóspedes</p>
                      <p className="text-lg font-semibold">{auction.property.max_guests}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Datas</p>
                    <p className="text-lg font-semibold">
                      {new Date(auction.check_in).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                      })}{' '}
                      -{' '}
                      {new Date(auction.check_out).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Histórico de Lances */}
              <BidHistory bids={bids} />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Formulário de Lance */}
              {auction.status === 'active' && (
                <BidForm auction={auction} onBidCreated={handleBidCreated} />
              )}

              {/* Informações do Leilão */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-bold mb-4">Informações do Leilão</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Preço Inicial</p>
                    <p className="text-xl font-bold text-gray-900">
                      R$ {auction.start_price.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Lance Atual</p>
                    <p className="text-2xl font-bold text-blue-600">
                      R$ {auction.current_bid.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Incremento Mínimo</p>
                    <p className="text-lg font-semibold">
                      R$ {auction.min_increment.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600">Total de Lances</p>
                    <p className="text-lg font-semibold">{auction.bids_count}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Participantes</p>
                    <p className="text-lg font-semibold">{auction.participants_count}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Pagamento */}
      {showPaymentModal && auction && (
        <PaymentModal
          auction={auction}
          timeRemaining={paymentTimeRemaining}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSuccess={() => {
            setShowPaymentModal(false);
            router.push('/dashboard/minhas-reservas');
          }}
        />
      )}
    </>
  );
}

