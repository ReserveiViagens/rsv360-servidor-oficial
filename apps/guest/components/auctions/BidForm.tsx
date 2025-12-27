/**
 * Componente: BidForm
 * FASE 1.6: Formulário de lances
 */

import React, { useState, useEffect, memo } from 'react';
import { createBid } from '@shared/api/auctions';
import { Auction } from '@shared/api/auctions';

interface BidFormProps {
  auction: Auction;
  onBidCreated?: (bid: any) => void;
  onError?: (error: Error) => void;
}

export const BidForm = memo(function BidForm({ auction, onBidCreated, onError }: BidFormProps) {
  const [amount, setAmount] = useState<number>(auction.current_bid + auction.min_increment);
  const [isAutoBid, setIsAutoBid] = useState(false);
  const [maxAmount, setMaxAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minBidAmount = auction.current_bid + auction.min_increment;

  useEffect(() => {
    setAmount(minBidAmount);
  }, [auction.current_bid, auction.min_increment, minBidAmount]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= minBidAmount) {
      setAmount(value);
      setError(null);
    } else if (value < minBidAmount) {
      setError(`O lance mínimo é R$ ${minBidAmount.toLocaleString('pt-BR')}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (amount < minBidAmount) {
        throw new Error(`O lance mínimo é R$ ${minBidAmount.toLocaleString('pt-BR')}`);
      }

      if (isAutoBid && maxAmount < amount) {
        throw new Error('O valor máximo deve ser maior ou igual ao lance inicial');
      }

      const bid = await createBid(
        auction.id,
        amount,
        isAutoBid,
        isAutoBid ? maxAmount : undefined
      );

      onBidCreated?.(bid);
      
      // Reset form
      setAmount(minBidAmount);
      setIsAutoBid(false);
      setMaxAmount(0);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao criar lance');
      setError(error.message);
      onError?.(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (auction.status !== 'active') {
    return (
      <div className="bg-gray-100 p-4 rounded-lg text-center text-gray-600">
        Leilão não está ativo. Não é possível fazer lances.
      </div>
    );
  }

  return (
    <form 
      onSubmit={handleSubmit} 
      className="bg-white p-6 rounded-lg shadow-md"
      aria-label="Formulário de lance"
    >
      <h3 className="text-xl font-bold mb-4" id="bid-form-title">Fazer um Lance</h3>

      {/* Lance Atual */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-gray-600">Lance Atual</p>
        <p className="text-2xl font-bold text-blue-600">
          R$ {auction.current_bid.toLocaleString('pt-BR')}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Incremento mínimo: R$ {auction.min_increment.toLocaleString('pt-BR')}
        </p>
      </div>

      {/* Input de Valor */}
      <div className="mb-4">
        <label htmlFor="bid-amount" className="block text-sm font-semibold text-gray-700 mb-2">
          Seu Lance
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
            R$
          </span>
          <input
            id="bid-amount"
            type="number"
            step={auction.min_increment}
            min={minBidAmount}
            value={amount}
            onChange={handleAmountChange}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
            placeholder={`Mínimo: R$ ${minBidAmount.toLocaleString('pt-BR')}`}
            required
            disabled={isSubmitting}
            aria-label={`Valor do lance. Mínimo: R$ ${minBidAmount.toLocaleString('pt-BR')}`}
            aria-describedby="bid-amount-help bid-amount-error"
            aria-invalid={error ? 'true' : 'false'}
          />
        </div>
        {error && (
          <p id="bid-amount-error" className="mt-1 text-sm text-red-600" role="alert" aria-live="polite">
            {error}
          </p>
        )}
        <p id="bid-amount-help" className="mt-1 text-xs text-gray-500">
          Lance mínimo: R$ {minBidAmount.toLocaleString('pt-BR')}
        </p>
      </div>

      {/* Lance Automático */}
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isAutoBid}
            onChange={(e) => setIsAutoBid(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            disabled={isSubmitting}
          />
          <span className="text-sm font-semibold text-gray-700">
            Lance Automático
          </span>
        </label>
        <p className="text-xs text-gray-500 ml-6 mt-1">
          O sistema fará lances automaticamente até o valor máximo que você definir
        </p>

        {isAutoBid && (
          <div className="mt-3 ml-6">
            <label htmlFor="max-amount" className="block text-sm font-semibold text-gray-700 mb-2">
              Valor Máximo
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                R$
              </span>
              <input
                id="max-amount"
                type="number"
                step={auction.min_increment}
                min={amount}
                value={maxAmount || ''}
                onChange={(e) => setMaxAmount(parseFloat(e.target.value) || 0)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Valor máximo para lances automáticos"
                required={isAutoBid}
                disabled={isSubmitting}
              />
            </div>
          </div>
        )}
      </div>

      {/* Botão de Submit */}
      <button
        type="submit"
        disabled={isSubmitting || amount < minBidAmount || (isAutoBid && maxAmount < amount)}
        className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label={`Fazer lance de R$ ${amount.toLocaleString('pt-BR')}`}
        aria-describedby="bid-submit-help"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span>
            Processando...
          </span>
        ) : (
          `Fazer Lance de R$ ${amount.toLocaleString('pt-BR')}`
        )}
      </button>

      {/* Aviso */}
      <p id="bid-submit-help" className="mt-3 text-xs text-gray-500 text-center">
        Ao fazer um lance, você concorda com os termos e condições do leilão
      </p>
    </form>
  );
});

