/**
 * 🏠 Property Service Tests
 * Testes unitários para propertyService
 */

jest.mock('../../src/services/availabilityService', () => ({
  checkAvailability: jest.fn(),
  isPeriodBlocked: jest.fn(),
  clearAvailabilityCache: jest.fn(),
}));

jest.mock('../../src/services/advancedCacheService', () => ({
  cacheAside: jest.fn(),
  invalidateCache: jest.fn(),
  getCacheKey: jest.fn((...args) => args.join(':')),
  writeThrough: jest.fn(),
  writeBack: jest.fn(),
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

const availabilityService = require('../../src/services/availabilityService');
const advancedCacheService = require('../../src/services/advancedCacheService');
const database = require('../../src/config/database');
const propertyService = require('../../src/services/propertyService');

const { checkAvailability } = availabilityService;
const { cacheAside, invalidateCache, getCacheKey } = advancedCacheService;
const { db } = database;

// Helper para criar builder do Knex
function createBuilder() {
  const builder = {
    where: jest.fn().mockReturnThis(),
    whereRaw: jest.fn().mockReturnThis(),
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

describe('propertyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPropertyById', () => {
    it('deve retornar propriedade quando encontrada', async () => {
      const propertyId = 1;
      const mockProperty = {
        id: propertyId,
        title: 'Casa na Praia',
        type: 'house',
        amenities: '["wifi","pool"]',
        images: '["image1.jpg","image2.jpg"]',
        owner_name: 'João Silva',
        owner_email: 'joao@example.com',
      };

      cacheAside.mockResolvedValue({
        ...mockProperty,
        amenities: ['wifi', 'pool'],
        images: ['image1.jpg', 'image2.jpg'],
      });

      const result = await propertyService.getPropertyById(propertyId);

      expect(cacheAside).toHaveBeenCalledWith(
        expect.stringContaining('property:1'),
        expect.any(Function),
        3600,
      );
      expect(result).toEqual({
        ...mockProperty,
        amenities: ['wifi', 'pool'],
        images: ['image1.jpg', 'image2.jpg'],
      });
    });

    it('deve retornar null quando propriedade não encontrada', async () => {
      cacheAside.mockResolvedValue(null);

      const result = await propertyService.getPropertyById(999);

      expect(result).toBeNull();
    });

    it('deve lançar erro quando ocorre erro no banco', async () => {
      cacheAside.mockRejectedValue(new Error('Database error'));

      await expect(propertyService.getPropertyById(1)).rejects.toThrow('Database error');
    });
  });

  describe('searchProperties', () => {
    it('deve buscar propriedades com filtros básicos', async () => {
      const filters = {
        type: 'apartment',
        city: 'São Paulo',
        page: 1,
        limit: 20,
      };

      const mockProperties = [
        {
          id: 1,
          title: 'Apartamento Centro',
          amenities: '[]',
          images: '[]',
        },
      ];

      cacheAside.mockResolvedValue(mockProperties);

      const builder = createBuilder();
      builder.count.mockReturnValue({ first: jest.fn().mockResolvedValue({ count: 1 }) });
      db.mockReturnValue(builder);

      const result = await propertyService.searchProperties(filters);

      expect(cacheAside).toHaveBeenCalled();
      expect(result.properties).toEqual(mockProperties);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('deve filtrar por disponibilidade quando check_in e check_out fornecidos', async () => {
      const filters = {
        check_in: '2025-02-01',
        check_out: '2025-02-05',
        page: 1,
        limit: 20,
      };

      const mockProperties = [
        { id: 1, amenities: '[]', images: '[]' },
        { id: 2, amenities: '[]', images: '[]' },
      ];

      checkAvailability
        .mockResolvedValueOnce({ available: true })
        .mockResolvedValueOnce({ available: false });

      cacheAside.mockImplementation(async (key, fn) => {
        return await fn();
      });

      // Mock para query principal (dentro do cacheAside)
      const selectBuilder = createBuilder();
      selectBuilder.limit.mockReturnValue(selectBuilder);
      selectBuilder.offset.mockReturnValue(selectBuilder);
      selectBuilder.orderBy.mockResolvedValue(mockProperties);
      
      // Mock para query de contagem (fora do cacheAside)
      const countBuilder = createBuilder();
      const countResult = { first: jest.fn().mockResolvedValue({ count: 1 }) };
      countBuilder.count.mockReturnValue(countResult);
      countBuilder.where.mockReturnValue(countBuilder);
      
      // Mock db para retornar builders diferentes conforme necessário
      let dbCallCount = 0;
      db.mockImplementation((table) => {
        if (table === 'properties') {
          dbCallCount++;
          if (dbCallCount === 1) {
            // Primeira chamada: query principal dentro do cacheAside
            const mainBuilder = createBuilder();
            mainBuilder.where.mockReturnValue(selectBuilder);
            return mainBuilder;
          } else {
            // Segunda chamada: query de contagem
            return countBuilder;
          }
        }
        return countBuilder;
      });

      const result = await propertyService.searchProperties(filters);

      expect(checkAvailability).toHaveBeenCalledTimes(2);
      expect(result.properties.length).toBe(1);
      expect(result.properties[0].id).toBe(1);
    });

    it('deve retornar paginação correta', async () => {
      const filters = { page: 2, limit: 10 };

      cacheAside.mockResolvedValue([]);

      const builder = createBuilder();
      builder.count.mockReturnValue({ first: jest.fn().mockResolvedValue({ count: 25 }) });
      db.mockReturnValue(builder);

      const result = await propertyService.searchProperties(filters);

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(25);
      expect(result.pagination.totalPages).toBe(3);
    });
  });

  describe('createProperty', () => {
    it('deve criar propriedade com sucesso', async () => {
      const propertyData = {
        owner_id: 1,
        type: 'apartment',
        title: 'Novo Apartamento',
        address_street: 'Rua Teste',
        address_city: 'São Paulo',
        address_state: 'SP',
        address_country: 'Brasil',
        max_guests: 4,
        base_price: 200,
        amenities: ['wifi'],
        images: ['image1.jpg'],
      };

      const mockInserted = {
        id: 1,
        ...propertyData,
        amenities: JSON.stringify(propertyData.amenities),
        images: JSON.stringify(propertyData.images),
        status: 'pending',
      };

      const builder = createBuilder();
      builder.insert.mockReturnValue({
        returning: jest.fn().mockResolvedValue([mockInserted]),
      });
      db.mockReturnValue(builder);

      invalidateCache.mockResolvedValue();

      const result = await propertyService.createProperty(propertyData);

      expect(db).toHaveBeenCalledWith('properties');
      expect(invalidateCache).toHaveBeenCalledWith('property:*');
      expect(invalidateCache).toHaveBeenCalledWith('properties:list:*');
      expect(result.id).toBe(1);
      expect(result.status).toBe('pending');
    });

    it('deve usar valores padrão quando não fornecidos', async () => {
      const propertyData = {
        type: 'house',
        title: 'Casa',
        address_street: 'Rua',
        address_city: 'Cidade',
        address_state: 'SP',
        address_country: 'Brasil',
        max_guests: 2,
        base_price: 100,
      };

      const builder = createBuilder();
      builder.insert.mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 1, ...propertyData }]),
      });
      db.mockReturnValue(builder);

      invalidateCache.mockResolvedValue();

      await propertyService.createProperty(propertyData);

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          cleaning_fee: 0,
          min_stay: 1,
          check_in_time: '14:00',
          check_out_time: '11:00',
        }),
      );
    });
  });

  describe('updateProperty', () => {
    it('deve atualizar propriedade com campos válidos', async () => {
      const propertyId = 1;
      const updates = {
        title: 'Título Atualizado',
        base_price: 300,
        amenities: ['wifi', 'pool'],
      };

      const mockUpdated = {
        id: propertyId,
        title: updates.title,
        base_price: updates.base_price,
        amenities: JSON.stringify(updates.amenities),
        images: '[]',
      };

      const builder = createBuilder();
      builder.update.mockResolvedValue(1);
      builder.first.mockResolvedValue(mockUpdated);
      db.mockReturnValue(builder);

      invalidateCache.mockResolvedValue();

      const result = await propertyService.updateProperty(propertyId, updates);

      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          title: updates.title,
          base_price: updates.base_price,
          amenities: JSON.stringify(updates.amenities),
          updated_at: expect.any(Date),
        }),
      );
      expect(invalidateCache).toHaveBeenCalledWith(`property:${propertyId}*`);
      expect(result.id).toBe(propertyId);
    });

    it('deve lançar erro quando nenhum campo válido fornecido', async () => {
      const propertyId = 1;
      const updates = {
        invalid_field: 'value',
      };

      await expect(propertyService.updateProperty(propertyId, updates)).rejects.toThrow(
        'Nenhum campo válido para atualizar',
      );
    });

    it('deve ignorar campos não permitidos', async () => {
      const propertyId = 1;
      const updates = {
        title: 'Título',
        invalid_field: 'value',
        id: 999, // Não deve ser atualizado
      };

      const builder = createBuilder();
      builder.update.mockResolvedValue(1);
      builder.first.mockResolvedValue({ id: propertyId, title: updates.title, amenities: '[]', images: '[]' });
      db.mockReturnValue(builder);

      invalidateCache.mockResolvedValue();

      await propertyService.updateProperty(propertyId, updates);

      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          title: updates.title,
        }),
      );
      expect(builder.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          invalid_field: 'value',
          id: 999,
        }),
      );
    });
  });

  describe('deleteProperty', () => {
    it('deve fazer soft delete da propriedade', async () => {
      const propertyId = 1;

      const builder = createBuilder();
      builder.update.mockResolvedValue(1);
      db.mockReturnValue(builder);

      invalidateCache.mockResolvedValue();

      const result = await propertyService.deleteProperty(propertyId);

      expect(builder.update).toHaveBeenCalledWith({
        status: 'deleted',
        updated_at: expect.any(Date),
      });
      expect(invalidateCache).toHaveBeenCalledWith(`property:${propertyId}*`);
      expect(result).toBe(true);
    });
  });

  describe('getPropertyCalendar', () => {
    it('deve retornar calendário de disponibilidade', async () => {
      const propertyId = 1;
      const year = 2025;
      const month = 2;

      const mockAvailability = [
        { date: '2025-02-01', available: true, price: 200, min_stay: 1 },
        { date: '2025-02-02', available: false, price: 200, min_stay: 1 },
      ];

      const builder = createBuilder();
      builder.orderBy.mockResolvedValue(mockAvailability);
      db.mockReturnValue(builder);

      const result = await propertyService.getPropertyCalendar(propertyId, year, month);

      expect(builder.whereRaw).toHaveBeenCalledWith('EXTRACT(YEAR FROM date) = ?', [year]);
      expect(builder.whereRaw).toHaveBeenCalledWith('EXTRACT(MONTH FROM date) = ?', [month]);
      expect(result.property_id).toBe(propertyId);
      expect(result.year).toBe(year);
      expect(result.month).toBe(month);
      expect(result.availability).toHaveLength(2);
    });

    it('deve usar ano e mês atual quando não fornecidos', async () => {
      const propertyId = 1;
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;

      const builder = createBuilder();
      builder.orderBy.mockResolvedValue([]);
      db.mockReturnValue(builder);

      await propertyService.getPropertyCalendar(propertyId);

      expect(builder.whereRaw).toHaveBeenCalledWith('EXTRACT(YEAR FROM date) = ?', [currentYear]);
      expect(builder.whereRaw).toHaveBeenCalledWith('EXTRACT(MONTH FROM date) = ?', [currentMonth]);
    });
  });

  describe('checkPropertyAvailability', () => {
    it('deve verificar disponibilidade usando availabilityService', async () => {
      const propertyId = 1;
      const checkIn = '2025-02-01';
      const checkOut = '2025-02-05';

      const mockAvailability = {
        available: true,
        price: 200,
        nights: 4,
      };

      checkAvailability.mockResolvedValue(mockAvailability);

      const result = await propertyService.checkPropertyAvailability(propertyId, checkIn, checkOut);

      expect(checkAvailability).toHaveBeenCalledWith(propertyId, checkIn, checkOut);
      expect(result).toEqual(mockAvailability);
    });

    it('deve propagar erros do availabilityService', async () => {
      const propertyId = 1;
      const checkIn = '2025-02-01';
      const checkOut = '2025-02-05';

      checkAvailability.mockRejectedValue(new Error('Availability check failed'));

      await expect(
        propertyService.checkPropertyAvailability(propertyId, checkIn, checkOut),
      ).rejects.toThrow('Availability check failed');
    });
  });
});

