/**
 * Componente: AuctionCard
 * FASE 1.4 + FASE 5.1: Card de leilão com otimizações de performance
 */

import React, { memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Auction } from '@shared/api/auctions';
import { AuctionTimer } from './AuctionTimer';
import { AuctionStatus } from './AuctionStatus';

interface AuctionCardProps {
  auction: Auction;
  className?: string;
}

export const AuctionCard = memo(function AuctionCard({ auction, className = '' }: AuctionCardProps) {
  const mainImage = auction.property.images?.[0] || '/placeholder-property.jpg';
  const priceDifference = auction.current_bid - auction.start_price;
  const priceDifferencePercent = ((priceDifference / auction.start_price) * 100).toFixed(0);

  return (
    <Link href={`/leiloes/${auction.id}`} aria-label={`Ver detalhes do leilão: ${auction.property.title}`}>
      <div 
        className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all transform hover:scale-105 ${className}`}
        role="article"
        aria-labelledby={`auction-title-${auction.id}`}
      >
        {/* Imagem da Propriedade */}
        <div className="relative h-48 bg-gray-200">
          <Image
            src={mainImage}
            alt={`Imagem da propriedade: ${auction.property.title}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            loading="lazy"
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
          />
          
          {/* Badge de Status */}
          <div className="absolute top-2 right-2" role="status" aria-label={`Status: ${auction.status}`}>
            <AuctionStatus status={auction.status} />
          </div>

          {/* Badge de Economia (se houver promoção) */}
          {priceDifference > 0 && (
            <div 
              className="absolute top-2 left-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold"
              role="status"
              aria-label={`Economia de ${priceDifferencePercent}% acima do preço mínimo`}
            >
              +{priceDifferencePercent}% acima do mínimo
            </div>
          )}
        </div>

        {/* Conteúdo */}
        <div className="p-4">
          {/* Título e Localização */}
          <h3 
            id={`auction-title-${auction.id}`}
            className="text-lg font-bold text-gray-900 mb-1 line-clamp-1"
          >
            {auction.property.title}
          </h3>
          <p className="text-sm text-gray-600 mb-3 flex items-center gap-1" aria-label={`Localização: ${auction.property.location}`}>
            <span aria-hidden="true">📍</span>
            <span>{auction.property.location}</span>
          </p>

          {/* Timer */}
          <div className="mb-3" role="timer" aria-live="polite">
            <AuctionTimer
              endTime={auction.end_time}
              extendedTime={auction.extended_time}
              status={auction.status}
              size="small"
            />
          </div>

          {/* Preços */}
          <div className="mb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-gray-500 text-sm line-through" aria-label={`Preço inicial: R$ ${auction.start_price.toLocaleString('pt-BR')}`}>
                R$ {auction.start_price.toLocaleString('pt-BR')}
              </span>
              <span className="text-2xl font-bold text-blue-600" aria-label={`Lance atual: R$ ${auction.current_bid.toLocaleString('pt-BR')}`}>
                R$ {auction.current_bid.toLocaleString('pt-BR')}
              </span>
              <span className="text-sm text-gray-600">/noite</span>
            </div>
            <p className="text-xs text-gray-500 mt-1" aria-label={`Incremento mínimo: R$ ${auction.min_increment.toLocaleString('pt-BR')}`}>
              Incremento mínimo: R$ {auction.min_increment.toLocaleString('pt-BR')}
            </p>
          </div>

          {/* Estatísticas */}
          <div className="flex items-center justify-between text-sm text-gray-600 mb-3" role="group" aria-label="Estatísticas do leilão">
            <div className="flex items-center gap-1" aria-label={`${auction.bids_count} lances`}>
              <span aria-hidden="true">🎯</span>
              <span>{auction.bids_count} lances</span>
            </div>
            <div className="flex items-center gap-1" aria-label={`${auction.participants_count} participantes`}>
              <span aria-hidden="true">👥</span>
              <span>{auction.participants_count} participantes</span>
            </div>
          </div>

          {/* Datas */}
          <div className="text-xs text-gray-500 mb-3" role="group" aria-label="Datas de check-in e check-out">
            <p>Check-in: {new Date(auction.check_in).toLocaleDateString('pt-BR')}</p>
            <p>Check-out: {new Date(auction.check_out).toLocaleDateString('pt-BR')}</p>
          </div>

          {/* Botão de Ação */}
          <button
            className={`w-full py-2 px-4 rounded-lg font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              auction.status === 'active'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : auction.status === 'ended'
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-gray-200 text-gray-600 cursor-not-allowed'
            }`}
            disabled={auction.status !== 'active'}
            onClick={(e) => {
              if (auction.status !== 'active') {
                e.preventDefault();
              }
            }}
            aria-label={
              auction.status === 'active'
                ? 'Participar do leilão'
                : auction.status === 'ended'
                ? 'Leilão encerrado'
                : auction.status === 'scheduled'
                ? 'Leilão agendado'
                : 'Leilão cancelado'
            }
          >
            {auction.status === 'active' && 'Participar do Leilão'}
            {auction.status === 'ended' && 'Leilão Encerrado'}
            {auction.status === 'scheduled' && 'Leilão Agendado'}
            {auction.status === 'cancelled' && 'Leilão Cancelado'}
          </button>
        </div>
      </div>
    </Link>
  );
});
