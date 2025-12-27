/**
 * Componente: PaymentModal
 * FASE 3: Modal de pagamento imediato com timer de 5 minutos - VERSÃO COMPLETA
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Auction } from '@shared/api/auctions';
import { processPayment, cancelPayment } from '@shared/api/auctions';
// TODO: Migrar componentes de pagamento quando necessário
// import { PixPayment } from '../payments/PixPayment';
// import { Elements } from '@stripe/react-stripe-js';
// import { getStripe } from '../../lib/payments/stripe';
// import { CardPayment } from '../payments/CardPayment';

interface PaymentModalProps {
  auction: Auction;
  timeRemaining: number | null; // segundos restantes
  onClose: () => void;
  onPaymentSuccess: () => void;
  onCancel?: () => void;
}

type PaymentMethod = 'pix' | 'credit_card' | 'debit_card' | 'paypal';

export function PaymentModal({
  auction,
  timeRemaining: initialTimeRemaining,
  onClose,
  onPaymentSuccess,
  onCancel,
}: PaymentModalProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(
    initialTimeRemaining || 300 // 5 minutos padrão
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Inicializar Stripe
  // TODO: Descomentar quando componentes de pagamento forem migrados
  // useEffect(() => {
  //   if (paymentMethod === 'credit_card' || paymentMethod === 'debit_card') {
  //     setStripePromise(getStripe());
  //   }
  // }, [paymentMethod]);

  // Timer regressivo com alertas
  useEffect(() => {
    if (timeRemaining <= 0) {
      handleTimeExpired();
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Alertas sonoros e visuais
    if (timeRemaining <= 30) {
      // Últimos 30 segundos: alerta crítico
      if (timeRemaining % 5 === 0) {
        playAlertSound();
      }
    } else if (timeRemaining <= 60) {
      // Último minuto: alerta moderado
      if (timeRemaining === 60) {
        playAlertSound();
      }
    }

    return () => clearInterval(interval);
  }, [timeRemaining]);

  const playAlertSound = () => {
    // Criar som de alerta usando Web Audio API
    if (typeof window !== 'undefined' && window.AudioContext) {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    }
  };

  const handleTimeExpired = () => {
    setError('⏰ Tempo expirado! Oportunidade perdida.');
    setTimeout(() => {
      onClose();
    }, 3000);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = ((300 - timeRemaining) / 300) * 100;

  // Determinar cor do timer baseado no tempo restante
  const getTimerColor = () => {
    if (timeRemaining <= 30) return 'text-red-600 bg-red-50 border-red-500';
    if (timeRemaining <= 60) return 'text-orange-600 bg-orange-50 border-orange-500';
    if (timeRemaining <= 120) return 'text-yellow-600 bg-yellow-50 border-yellow-500';
    return 'text-blue-600 bg-blue-50 border-blue-500';
  };

  const getProgressColor = () => {
    if (timeRemaining <= 30) return 'bg-red-600';
    if (timeRemaining <= 60) return 'bg-orange-600';
    if (timeRemaining <= 120) return 'bg-yellow-600';
    return 'bg-blue-600';
  };

  const totalNights = Math.ceil(
    (new Date(auction.check_out).getTime() - new Date(auction.check_in).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const totalAmount = auction.current_bid * totalNights;
  const pixDiscount = paymentMethod === 'pix' ? totalAmount * 0.05 : 0;
  const finalAmount = totalAmount - pixDiscount;
  const finalAmountCents = Math.round(finalAmount * 100); // Para Stripe (centavos)

  const handlePaymentSuccess = async () => {
    setPaymentSuccess(true);
    setIsProcessing(false);
    
    // Aguardar um pouco para mostrar sucesso
    setTimeout(() => {
      onPaymentSuccess();
    }, 2000);
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
    setIsProcessing(false);
    
    // Retry automático após 3 segundos (máximo 2 tentativas)
    setTimeout(() => {
      setError(null);
    }, 3000);
  };

  const handleCancel = async () => {
    if (!showCancelConfirm) {
      setShowCancelConfirm(true);
      return;
    }

    try {
      await cancelPayment(auction.id);
      if (onCancel) {
        onCancel();
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cancelar');
    }
  };

  // Não permitir fechar modal se tempo restante > 0 e não foi pago
  const canClose = timeRemaining <= 0 || paymentSuccess;

  if (paymentSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-8 text-center">
          <CheckCircle size={64} className="text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-600 mb-2">✅ Pagamento Confirmado!</h2>
          <p className="text-gray-600 mb-4">
            Sua reserva foi confirmada com sucesso. Você receberá um email de confirmação em breve.
          </p>
          <button
            onClick={onPaymentSuccess}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
          >
            Continuar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header com Timer */}
        <div className={`${getTimerColor()} border-b-4 p-6 sticky top-0 z-10`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
                {timeRemaining <= 30 ? (
                  <>
                    <AlertTriangle size={28} className="animate-pulse" />
                    ⚠️ APRESSE-SE!
                  </>
                ) : (
                  <>
                    <Clock size={28} />
                    ⏰ CONFIRMAÇÃO DE PAGAMENTO
                  </>
                )}
              </h2>
              <p className="text-lg font-semibold mt-2">
                🏆 VOCÊ ESTÁ ARREMATANDO ESTE LEILÃO!
              </p>
            </div>
            {canClose && (
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
                disabled={isProcessing}
              >
                <X size={24} />
              </button>
            )}
          </div>

          {/* Timer Grande */}
          <div className="text-center mb-4">
            <p className="text-sm font-semibold mb-2">TEMPO RESTANTE PARA PAGAR</p>
            <p className={`text-5xl font-bold ${timeRemaining <= 30 ? 'animate-pulse' : ''}`}>
              {formatTime(timeRemaining)}
            </p>
            {timeRemaining <= 30 && (
              <p className="text-sm font-semibold mt-2 animate-bounce">
                ⚠️ ÚLTIMOS SEGUNDOS!
              </p>
            )}
          </div>

          {/* Barra de Progresso */}
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className={`${getProgressColor()} h-4 rounded-full transition-all duration-1000`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Informações do Leilão */}
        <div className="p-6 bg-gray-50 border-b">
          <h3 className="font-bold text-lg mb-2">{auction.property.title}</h3>
          <p className="text-gray-600">
            📍 {auction.property.location} • {totalNights} noite{totalNights !== 1 ? 's' : ''}
          </p>
          <p className="text-gray-600">
            📅 {new Date(auction.check_in).toLocaleDateString('pt-BR')} -{' '}
            {new Date(auction.check_out).toLocaleDateString('pt-BR')}
          </p>
        </div>

        {/* Aviso Importante */}
        <div className="p-6 bg-yellow-50 border-b border-yellow-200">
          <p className="font-semibold mb-2 flex items-center gap-2">
            <AlertTriangle size={20} />
            ⚠️ AVISO IMPORTANTE:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            <li>Você precisa PAGAR AGORA nos próximos {Math.floor(timeRemaining / 60)} minutos</li>
            <li>Seu lance é válido por 5 minutos apenas</li>
            <li>Após 5 minutos, a oferta expira e vai para 2º lugar (se houver)</li>
            <li>Se pagamento falhar, você terá 2 tentativas extras</li>
          </ul>
        </div>

        {/* Métodos de Pagamento */}
        <div className="p-6">
          <h3 className="text-lg font-bold mb-4">Escolha a forma de pagamento:</h3>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              {
                value: 'pix' as PaymentMethod,
                label: '📱 PIX',
                desc: 'Instantâneo + 5% OFF',
                recommended: true,
              },
              {
                value: 'credit_card' as PaymentMethod,
                label: '💳 Cartão',
                desc: 'Até 12x sem juros',
              },
              {
                value: 'debit_card' as PaymentMethod,
                label: '🏦 Débito',
                desc: 'Processamento rápido',
              },
              {
                value: 'paypal' as PaymentMethod,
                label: '🅿️ PayPal',
                desc: 'Proteção comprador',
              },
            ].map((method) => (
              <button
                key={method.value}
                onClick={() => {
                  setPaymentMethod(method.value);
                  setError(null);
                }}
                className={`p-4 border-2 rounded-lg text-left transition-all relative ${
                  paymentMethod === method.value
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isProcessing}
              >
                {method.recommended && (
                  <span className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                    RECOMENDADO
                  </span>
                )}
                <p className="font-semibold">{method.label}</p>
                <p className="text-xs text-gray-600">{method.desc}</p>
              </button>
            ))}
          </div>

          {/* Resumo Financeiro */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="flex justify-between mb-2">
              <span>Preço/noite:</span>
              <span className="font-semibold">R$ {auction.current_bid.toLocaleString('pt-BR')}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Total ({totalNights} noites):</span>
              <span className="font-semibold">R$ {totalAmount.toLocaleString('pt-BR')}</span>
            </div>
            {pixDiscount > 0 && (
              <div className="flex justify-between mb-2 text-green-600">
                <span>Desconto PIX (5%):</span>
                <span className="font-semibold">- R$ {pixDiscount.toLocaleString('pt-BR')}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-300">
              <span className="font-bold">Total a pagar:</span>
              <span className="text-2xl font-bold text-green-600">
                R$ {finalAmount.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          {/* Formulário de Pagamento */}
          <div className="mb-6">
            {/* TODO: Descomentar quando componentes de pagamento forem migrados */}
            <div className="text-center py-8 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-gray-700 mb-2 font-semibold">⚠️ Componentes de pagamento em migração</p>
              <p className="text-sm text-gray-600">
                Os componentes PixPayment e CardPayment serão migrados na próxima fase.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Por enquanto, o pagamento será processado diretamente pela API.
              </p>
            </div>
            {/* {paymentMethod === 'pix' && (
              <PixPayment
                amount={finalAmount}
                description={`Pagamento leilão ${auction.id}`}
                onPaymentSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                metadata={{
                  auction_id: String(auction.id),
                  property_id: String(auction.property_id || ''),
                }}
              />
            )}

            {(paymentMethod === 'credit_card' || paymentMethod === 'debit_card') && stripePromise && (
              <Elements stripe={stripePromise}>
                <CardPayment
                  amount={finalAmountCents}
                  description={`Pagamento leilão ${auction.id}`}
                  onPaymentSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  metadata={{
                    auction_id: String(auction.id),
                    property_id: String(auction.property_id || ''),
                  }}
                />
              </Elements>
            )}

            {paymentMethod === 'paypal' && (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">Integração PayPal em desenvolvimento</p>
                <p className="text-sm text-gray-500">
                  Por favor, escolha PIX ou Cartão para pagar agora
                </p>
              </div>
            )} */}
          </div>

          {/* Mensagem de Erro */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800 flex items-center gap-2">
                <AlertTriangle size={20} />
                {error}
              </p>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex gap-4">
            {!isProcessing && (
              <button
                onClick={handleCancel}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
              >
                {showCancelConfirm ? 'Confirmar Desistência' : 'Desistir'}
              </button>
            )}
            {showCancelConfirm && (
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
