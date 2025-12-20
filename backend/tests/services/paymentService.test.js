/**
 * 💳 Payment Service Tests
 * Testes unitários para paymentService
 */

jest.mock('../../src/services/paymentGatewayFactory', () => ({
  createGateway: jest.fn(),
  isGatewaySupported: jest.fn(),
}));

jest.mock('../../src/services/notificationService', () => ({
  notifyPaymentConfirmed: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../src/config/database', () => ({
  db: jest.fn(),
  withTransaction: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

const paymentGatewayFactory = require('../../src/services/paymentGatewayFactory');
const notificationService = require('../../src/services/notificationService');
const database = require('../../src/config/database');
const paymentService = require('../../src/services/paymentService');

const { createGateway, isGatewaySupported } = paymentGatewayFactory;
const { notifyPaymentConfirmed } = notificationService;
const { db, withTransaction } = database;

// Helper para criar builder do Knex
function createBuilder() {
  const builder = {
    where: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    first: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  };
  return builder;
}

describe('paymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processPayment', () => {
    it('deve processar pagamento com sucesso', async () => {
      const paymentData = {
        booking_id: 1,
        user_id: 101,
        amount: 500,
        currency: 'BRL',
        payment_method: 'credit_card',
        gateway: 'stripe',
        card_data: {
          number: '4242424242424242',
          exp_month: 12,
          exp_year: 2025,
          cvv: '123',
          holder_name: 'John Doe',
        },
      };

      const mockBooking = {
        id: 1,
        booking_number: 'BK001',
        customer_email: 'customer@example.com',
      };

      const mockPayment = {
        id: 1,
        booking_id: paymentData.booking_id,
        amount: paymentData.amount,
        status: 'processing',
        transaction_id: 'txn_123',
        gateway_provider: paymentData.gateway,
      };

      const mockGateway = {
        createPayment: jest.fn().mockResolvedValue({
          transaction_id: 'txn_123',
          status: 'processing',
        }),
      };

      // Mock database
      const bookingBuilder = createBuilder();
      bookingBuilder.first.mockResolvedValue(mockBooking);
      db.mockReturnValueOnce(bookingBuilder);

      // Mock transaction - trx precisa ser uma função que retorna um builder
      const trxMock = jest.fn((table) => {
        if (table === 'payments') {
          const paymentBuilder = createBuilder();
          paymentBuilder.insert.mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: 1, ...mockPayment }]),
          });
          paymentBuilder.update.mockResolvedValue(1);
          paymentBuilder.first.mockResolvedValue(mockPayment);
          paymentBuilder.where.mockReturnValue(paymentBuilder);
          return paymentBuilder;
        }
        return createBuilder();
      });

      withTransaction.mockImplementation(async (callback) => {
        return await callback(trxMock);
      });

      // Mock gateway
      isGatewaySupported.mockReturnValue(true);
      createGateway.mockReturnValue(mockGateway);

      // Mock booking update
      const updateBuilder = createBuilder();
      updateBuilder.update.mockResolvedValue(1);
      db.mockReturnValueOnce(updateBuilder);

      const result = await paymentService.processPayment(paymentData);

      expect(isGatewaySupported).toHaveBeenCalledWith('stripe');
      expect(createGateway).toHaveBeenCalledWith('stripe');
      expect(mockGateway.createPayment).toHaveBeenCalled();
      expect(result.id).toBe(1);
      expect(result.status).toBe('processing');
    });

    it('deve lançar erro quando booking não encontrado', async () => {
      const paymentData = {
        booking_id: 999,
        user_id: 101,
        amount: 500,
        currency: 'BRL',
        payment_method: 'credit_card',
        gateway: 'stripe',
      };

      const builder = createBuilder();
      builder.first.mockResolvedValue(null);
      db.mockReturnValue(builder);

      await expect(paymentService.processPayment(paymentData)).rejects.toThrow('Reserva não encontrada');
    });

    it('deve validar splits quando fornecidos', async () => {
      const paymentData = {
        booking_id: 1,
        user_id: 101,
        amount: 500,
        currency: 'BRL',
        payment_method: 'credit_card',
        gateway: 'stripe',
        splits: [
          { recipient_id: 1, percentage: 60, split_type: 'percentage' },
          { recipient_id: 2, percentage: 50, split_type: 'percentage' }, // Total > 100%
        ],
      };

      const mockBooking = { id: 1, booking_number: 'BK001' };

      const builder = createBuilder();
      builder.first.mockResolvedValue(mockBooking);
      db.mockReturnValue(builder);

      await expect(paymentService.processPayment(paymentData)).rejects.toThrow(
        'Soma dos splits não pode exceder o valor total',
      );
    });

    it('deve lançar erro quando gateway não suportado', async () => {
      const paymentData = {
        booking_id: 1,
        user_id: 101,
        amount: 500,
        currency: 'BRL',
        payment_method: 'credit_card',
        gateway: 'unsupported',
      };

      const mockBooking = { id: 1, booking_number: 'BK001' };

      const bookingBuilder = createBuilder();
      bookingBuilder.first.mockResolvedValue(mockBooking);
      db.mockReturnValue(bookingBuilder);

      isGatewaySupported.mockReturnValue(false);

      const trxMock = jest.fn((table) => {
        if (table === 'payments') {
          const paymentBuilder = createBuilder();
          paymentBuilder.insert.mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: 1 }]),
          });
          paymentBuilder.update.mockResolvedValue(1);
          paymentBuilder.where.mockReturnValue(paymentBuilder);
          return paymentBuilder;
        }
        return createBuilder();
      });

      withTransaction.mockImplementation(async (callback) => {
        return await callback(trxMock);
      });

      await expect(paymentService.processPayment(paymentData)).rejects.toThrow(
        "Gateway 'unsupported' não é suportado",
      );
    });
  });

  describe('getPaymentById', () => {
    it('deve retornar pagamento quando encontrado', async () => {
      const paymentId = 1;
      const mockPayment = {
        id: paymentId,
        booking_id: 1,
        amount: 500,
        metadata: '{"key":"value"}',
        gateway_response: '{"status":"completed"}',
        booking_number: 'BK001',
        booking_total: 500,
      };

      const builder = createBuilder();
      builder.first.mockResolvedValue(mockPayment);
      db.mockReturnValue(builder);

      const result = await paymentService.getPaymentById(paymentId);

      expect(result.id).toBe(paymentId);
      expect(result.metadata).toEqual({ key: 'value' });
      expect(result.gateway_response).toEqual({ status: 'completed' });
      expect(result.splits).toEqual([]);
    });

    it('deve retornar null quando pagamento não encontrado', async () => {
      const builder = createBuilder();
      builder.first.mockResolvedValue(null);
      db.mockReturnValue(builder);

      const result = await paymentService.getPaymentById(999);

      expect(result).toBeNull();
    });
  });

  describe('searchPayments', () => {
    it('deve buscar pagamentos com filtros', async () => {
      const filters = {
        booking_id: 1,
        status: 'completed',
        gateway: 'stripe',
        page: 1,
        limit: 20,
      };

      const mockPayments = [
        { id: 1, booking_id: 1, amount: 500, status: 'completed' },
        { id: 2, booking_id: 1, amount: 300, status: 'completed' },
      ];

      // Mock para query principal
      const mainBuilder = createBuilder();
      mainBuilder.where.mockReturnValue(mainBuilder);
      mainBuilder.leftJoin.mockReturnValue(mainBuilder);
      mainBuilder.select.mockReturnValue(mainBuilder);
      mainBuilder.orderBy.mockReturnValue(mainBuilder);
      mainBuilder.limit.mockReturnValue(mainBuilder);
      mainBuilder.offset.mockResolvedValue(mockPayments);
      
      // Mock para query de contagem
      const countBuilder = createBuilder();
      countBuilder.where.mockReturnValue(countBuilder);
      const countResult = { first: jest.fn().mockResolvedValue({ count: 2 }) };
      countBuilder.count.mockReturnValue(countResult);
      
      // Mock db para retornar builders diferentes
      let callCount = 0;
      db.mockImplementation(() => {
        callCount++;
        // Primeira chamada é para a query principal, segunda para contagem
        return callCount === 1 ? mainBuilder : countBuilder;
      });

      const result = await paymentService.searchPayments(filters);

      expect(result.payments).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.total).toBe(2);
    });

    it('deve retornar paginação correta', async () => {
      const filters = { page: 2, limit: 10 };

      // Mock para query principal
      const mainBuilder = createBuilder();
      mainBuilder.where.mockReturnValue(mainBuilder);
      mainBuilder.leftJoin.mockReturnValue(mainBuilder);
      mainBuilder.select.mockReturnValue(mainBuilder);
      mainBuilder.orderBy.mockReturnValue(mainBuilder);
      mainBuilder.limit.mockReturnValue(mainBuilder);
      mainBuilder.offset.mockResolvedValue([]);
      
      // Mock para query de contagem
      const countBuilder = createBuilder();
      countBuilder.where.mockReturnValue(countBuilder);
      const countResult = { first: jest.fn().mockResolvedValue({ count: 25 }) };
      countBuilder.count.mockReturnValue(countResult);
      
      // Mock db para retornar builders diferentes
      let callCount = 0;
      db.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? mainBuilder : countBuilder;
      });

      const result = await paymentService.searchPayments(filters);

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(25);
      expect(result.pagination.totalPages).toBe(3);
    });
  });

  describe('getPaymentsByBooking', () => {
    it('deve retornar pagamentos de uma reserva', async () => {
      const bookingId = 1;
      const mockPayments = [
        { id: 1, booking_id: bookingId, amount: 500 },
        { id: 2, booking_id: bookingId, amount: 300 },
      ];

      const builder = createBuilder();
      builder.orderBy.mockResolvedValue(mockPayments);
      db.mockReturnValue(builder);

      const result = await paymentService.getPaymentsByBooking(bookingId);

      expect(result).toHaveLength(2);
      expect(result[0].booking_id).toBe(bookingId);
    });
  });

  describe('confirmPayment', () => {
    it('deve confirmar pagamento com gateway', async () => {
      const paymentId = 1;
      const mockPayment = {
        id: paymentId,
        booking_id: 1,
        amount: 500,
        gateway_transaction_id: 'txn_123',
        gateway_provider: 'stripe',
      };

      const mockGateway = {
        confirmPayment: jest.fn().mockResolvedValue({
          status: 'confirmed',
        }),
      };

      // Mock para buscar pagamento inicial
      const getBuilder = createBuilder();
      getBuilder.first.mockResolvedValue(mockPayment);
      
      // Mock para atualizar pagamento
      const updateBuilder = createBuilder();
      updateBuilder.update.mockResolvedValue(1);
      updateBuilder.where.mockReturnValue(updateBuilder);
      
      // Mock para atualizar booking
      const bookingBuilder = createBuilder();
      bookingBuilder.update.mockResolvedValue(1);
      bookingBuilder.where.mockReturnValue(bookingBuilder);
      
      // Mock para buscar pagamento atualizado
      const finalBuilder = createBuilder();
      finalBuilder.first.mockResolvedValue({ ...mockPayment, status: 'confirmed' });
      
      // Mock db para retornar builders diferentes conforme necessário
      let callCount = 0;
      db.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return getBuilder; // Buscar pagamento
        if (callCount === 2) return updateBuilder; // Atualizar pagamento
        if (callCount === 3) return bookingBuilder; // Atualizar booking
        return finalBuilder; // Buscar pagamento atualizado
      });

      isGatewaySupported.mockReturnValue(true);
      createGateway.mockReturnValue(mockGateway);

      await paymentService.confirmPayment(paymentId);

      expect(mockGateway.confirmPayment).toHaveBeenCalledWith('txn_123');
      expect(notifyPaymentConfirmed).toHaveBeenCalledWith(paymentId);
    });

    it('deve lançar erro quando pagamento não encontrado', async () => {
      const builder = createBuilder();
      builder.first.mockResolvedValue(null);
      db.mockReturnValue(builder);

      await expect(paymentService.confirmPayment(999)).rejects.toThrow('Pagamento não encontrado');
    });
  });

  describe('refundPayment', () => {
    it('deve reembolsar pagamento com gateway', async () => {
      const paymentId = 1;
      const refundAmount = 500;
      const reason = 'customer_request';

      const mockPayment = {
        id: paymentId,
        booking_id: 1,
        amount: 500,
        status: 'completed',
        gateway_transaction_id: 'txn_123',
        gateway_provider: 'stripe',
      };

      const mockGateway = {
        refundPayment: jest.fn().mockResolvedValue({
          refund_id: 'refund_123',
          status: 'refunded',
        }),
      };

      // Mock para buscar pagamento inicial
      const getBuilder = createBuilder();
      getBuilder.where.mockReturnValue(getBuilder);
      getBuilder.first.mockResolvedValue(mockPayment);
      
      // Mock para atualizar pagamento
      const updateBuilder = createBuilder();
      updateBuilder.where.mockReturnValue(updateBuilder);
      updateBuilder.update.mockResolvedValue(1);
      
      // Mock para atualizar booking
      const bookingBuilder = createBuilder();
      bookingBuilder.where.mockReturnValue(bookingBuilder);
      bookingBuilder.update.mockResolvedValue(1);
      
      // Mock para buscar pagamento atualizado (chamado por getPaymentById no final)
      const finalBuilder = createBuilder();
      finalBuilder.where.mockReturnValue(finalBuilder);
      finalBuilder.leftJoin.mockReturnValue(finalBuilder);
      finalBuilder.select.mockReturnValue(finalBuilder);
      finalBuilder.first.mockResolvedValue({ 
        ...mockPayment, 
        status: 'refunded',
        booking_number: 'BK001',
        booking_total: 500,
        metadata: null,
        gateway_response: null,
      });
      
      // Mock db para retornar builders diferentes conforme necessário
      let callCount = 0;
      db.mockImplementation((table) => {
        callCount++;
        if (table === 'payments') {
          if (callCount === 1) return getBuilder; // Buscar pagamento inicial
          if (callCount === 2) return updateBuilder; // Atualizar pagamento
          return finalBuilder; // Buscar pagamento atualizado
        }
        if (table === 'bookings') {
          return bookingBuilder; // Atualizar booking
        }
        return createBuilder();
      });

      isGatewaySupported.mockReturnValue(true);
      createGateway.mockReturnValue(mockGateway);

      const result = await paymentService.refundPayment(paymentId, refundAmount, reason);

      expect(mockGateway.refundPayment).toHaveBeenCalledWith('txn_123', {
        amount: refundAmount,
        reason: reason,
      });
      expect(result.success).toBe(true);
      expect(result.refund_amount).toBe(refundAmount);
    });

    it('deve lançar erro quando pagamento não está completo', async () => {
      const paymentId = 1;
      const mockPayment = {
        id: paymentId,
        status: 'pending',
      };

      const builder = createBuilder();
      builder.where.mockReturnValue(builder);
      builder.first.mockResolvedValue(mockPayment);
      db.mockReturnValue(builder);

      await expect(paymentService.refundPayment(paymentId)).rejects.toThrow(
        'Apenas pagamentos completos podem ser reembolsados',
      );
    });

    it('deve usar valor total quando amount não fornecido', async () => {
      const paymentId = 1;
      const mockPayment = {
        id: paymentId,
        booking_id: 1,
        amount: 500,
        status: 'completed',
        gateway_transaction_id: 'txn_123',
        gateway_provider: 'stripe',
      };

      const mockGateway = {
        refundPayment: jest.fn().mockResolvedValue({ status: 'refunded' }),
      };

      // Mock para buscar pagamento inicial
      const getBuilder = createBuilder();
      getBuilder.where.mockReturnValue(getBuilder);
      getBuilder.first.mockResolvedValue(mockPayment);
      
      // Mock para atualizar pagamento
      const updateBuilder = createBuilder();
      updateBuilder.update.mockResolvedValue(1);
      updateBuilder.where.mockReturnValue(updateBuilder);
      
      // Mock para atualizar booking
      const bookingBuilder = createBuilder();
      bookingBuilder.update.mockResolvedValue(1);
      bookingBuilder.where.mockReturnValue(bookingBuilder);
      
      // Mock para buscar pagamento atualizado
      const finalBuilder = createBuilder();
      finalBuilder.where.mockReturnValue(finalBuilder);
      finalBuilder.first.mockResolvedValue({ ...mockPayment, status: 'refunded' });
      
      // Mock db para retornar builders diferentes conforme necessário
      let callCount = 0;
      db.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return getBuilder; // Buscar pagamento
        if (callCount === 2) return updateBuilder; // Atualizar pagamento
        if (callCount === 3) return bookingBuilder; // Atualizar booking
        return finalBuilder; // Buscar pagamento atualizado
      });

      isGatewaySupported.mockReturnValue(true);
      createGateway.mockReturnValue(mockGateway);

      await paymentService.refundPayment(paymentId);

      expect(mockGateway.refundPayment).toHaveBeenCalledWith('txn_123', {
        amount: 500, // Valor total do pagamento
        reason: 'requested_by_customer',
      });
    });
  });

  describe('updatePaymentStatus', () => {
    it('deve atualizar status do pagamento', async () => {
      const paymentId = 1;
      const newStatus = 'completed';

      // Mock para atualizar pagamento
      const updateBuilder = createBuilder();
      updateBuilder.where.mockReturnValue(updateBuilder);
      updateBuilder.update.mockResolvedValue(1);
      
      // Mock para buscar pagamento atualizado (chamado por getPaymentById)
      const getBuilder = createBuilder();
      getBuilder.where.mockReturnValue(getBuilder);
      getBuilder.leftJoin.mockReturnValue(getBuilder);
      getBuilder.select.mockReturnValue(getBuilder);
      getBuilder.first.mockResolvedValue({ 
        id: paymentId, 
        status: newStatus,
        booking_id: 1,
        booking_number: 'BK001',
        booking_total: 500,
        metadata: null,
        gateway_response: null,
      });
      
      // Mock db para retornar builders diferentes
      let callCount = 0;
      db.mockImplementation((table) => {
        callCount++;
        if (callCount === 1) return updateBuilder; // Atualizar pagamento
        return getBuilder; // Buscar pagamento atualizado
      });

      const result = await paymentService.updatePaymentStatus(paymentId, newStatus);

      expect(updateBuilder.update).toHaveBeenCalledWith({
        status: newStatus,
        updated_at: expect.any(Date),
      });
      expect(result.status).toBe(newStatus);
    });
  });
});

