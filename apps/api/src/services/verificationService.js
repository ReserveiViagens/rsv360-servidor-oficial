/**
 * 🔐 Verification Service
 * FASE 1.1.4: Serviço de verificação de identidade e documentos
 * Integra com API Serasa para background checks e verificação de documentos
 */

const { db, withTransaction } = require("../config/database");
const { createLogger } = require("../utils/logger");
const https = require("https");
const http = require("http");

const logger = createLogger({ service: 'verificationService' });

// Configuração da API Serasa
const SERASA_API_BASE_URL = process.env.SERASA_API_BASE_URL || 'https://api.serasa.com.br/v1';
const SERASA_API_KEY = process.env.SERASA_API_KEY;
const SERASA_API_SECRET = process.env.SERASA_API_SECRET;
const SERASA_USE_MOCK = process.env.SERASA_USE_MOCK === 'true' || !SERASA_API_KEY;

/**
 * Cliente HTTP para API Serasa com retry logic
 */
async function callSerasaAPI(endpoint, method = 'GET', data = null, retries = 3) {
  if (SERASA_USE_MOCK) {
    logger.info('Usando mock da API Serasa (SERASA_USE_MOCK=true ou credenciais não configuradas)');
    return mockSerasaResponse(endpoint, method, data);
  }

  const url = new URL(`${SERASA_API_BASE_URL}${endpoint}`);
  const isHttps = url.protocol === 'https:';
  const httpModule = isHttps ? https : http;

  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logger.info(`Chamando API Serasa (tentativa ${attempt}/${retries})`, { endpoint, method });
      
      const requestData = data ? JSON.stringify(data) : null;
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERASA_API_KEY}`,
          'X-API-Secret': SERASA_API_SECRET,
        },
        timeout: 30000,
      };

      if (requestData) {
        options.headers['Content-Length'] = Buffer.byteLength(requestData);
      }

      const response = await new Promise((resolve, reject) => {
        const req = httpModule.request(options, (res) => {
          let responseData = '';
          
          res.on('data', (chunk) => {
            responseData += chunk;
          });
          
          res.on('end', () => {
            try {
              const parsed = JSON.parse(responseData);
              resolve({ status: res.statusCode, data: parsed });
            } catch (error) {
              reject(new Error(`Erro ao parsear resposta: ${error.message}`));
            }
          });
        });

        req.on('error', (error) => {
          reject(error);
        });

        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Timeout na requisição'));
        });

        if (requestData) {
          req.write(requestData);
        }
        
        req.end();
      });

      // Verificar status code
      if (response.status >= 200 && response.status < 300) {
        logger.info('Resposta da API Serasa recebida', { endpoint, status: response.status });
        return response.data;
      } else {
        const error = new Error(`API Serasa retornou status ${response.status}`);
        error.status = response.status;
        error.data = response.data;
        throw error;
      }
    } catch (error) {
      lastError = error;
      const status = error.status || error.response?.status;
      const message = error.data?.message || error.message;

      // Não retry em erros 4xx (exceto 429 - rate limit)
      if (status >= 400 && status < 500 && status !== 429) {
        logger.error('Erro do cliente na API Serasa (não será retentado)', { 
          endpoint, 
          status, 
          message 
        });
        throw new Error(`Erro na API Serasa: ${message || 'Requisição inválida'}`);
      }

      // Retry em erros 5xx ou 429
      if (attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff
        logger.warn(`Erro na API Serasa, tentando novamente em ${delay}ms`, { 
          endpoint, 
          attempt, 
          status, 
          message 
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        logger.error('Falha ao chamar API Serasa após todas as tentativas', { 
          endpoint, 
          status, 
          message 
        });
      }
    }
  }

  // Se chegou aqui, todas as tentativas falharam
  throw new Error(`Falha ao chamar API Serasa após ${retries} tentativas: ${lastError?.message || 'Erro desconhecido'}`);
}

/**
 * Mock da API Serasa para desenvolvimento e testes
 */
function mockSerasaResponse(endpoint, method, data) {
  // Simular delay de rede
  return new Promise((resolve) => {
    setTimeout(() => {
      if (endpoint.includes('/cpf/consulta')) {
        // Mock de consulta CPF
        resolve({
          cpf: data?.cpf || '00000000000',
          nome: 'MOCK USER',
          situacao: 'REGULAR',
          score: 750,
          restricoes: [],
          consulta_realizada: false,
          mock: true,
        });
      } else if (endpoint.includes('/cnpj/consulta')) {
        // Mock de consulta CNPJ
        resolve({
          cnpj: data?.cnpj || '00000000000000',
          razao_social: 'MOCK COMPANY LTDA',
          situacao: 'ATIVA',
          score: 800,
          restricoes: [],
          consulta_realizada: false,
          mock: true,
        });
      } else if (endpoint.includes('/background-check')) {
        // Mock de background check
        resolve({
          request_id: `mock_${Date.now()}`,
          status: 'completed',
          resultado: 'APROVADO',
          detalhes: {
            cpf_valido: true,
            nome_verificado: true,
            restricoes_encontradas: 0,
          },
          consulta_realizada: false,
          mock: true,
        });
      } else {
        resolve({
          success: true,
          message: 'Mock response',
          mock: true,
        });
      }
    }, 500); // Simular 500ms de delay
  });
}

/**
 * Verificar identidade por CPF
 * 
 * @param {string} cpf - CPF a ser verificado (apenas números)
 * @param {string} nome - Nome completo para validação
 * @param {string} dataNascimento - Data de nascimento (YYYY-MM-DD)
 * @returns {Promise<Object>} Resultado da verificação
 */
async function verifyIdentity(cpf, nome, dataNascimento) {
  try {
    // Validar CPF
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      throw new Error('CPF inválido: deve conter 11 dígitos');
    }

    // Chamar API Serasa
    const result = await callSerasaAPI('/cpf/consulta', 'POST', {
      cpf: cleanCpf,
      nome,
      data_nascimento: dataNascimento,
    });

    // Salvar resultado no banco (cache)
    const cacheKey = `verification:cpf:${cleanCpf}`;
    await db('verification_requests').insert({
      type: 'cpf',
      document: cleanCpf,
      request_data: JSON.stringify({ nome, dataNascimento }),
      response_data: JSON.stringify(result),
      status: result.situacao === 'REGULAR' ? 'approved' : 'rejected',
      created_at: new Date(),
    }).onConflict('document').merge({
      response_data: JSON.stringify(result),
      status: result.situacao === 'REGULAR' ? 'approved' : 'rejected',
      updated_at: new Date(),
    });

    logger.info('Verificação de identidade concluída', { cpf: cleanCpf, status: result.situacao });

    return {
      success: result.situacao === 'REGULAR',
      cpf: cleanCpf,
      nome: result.nome,
      situacao: result.situacao,
      score: result.score,
      restricoes: result.restricoes || [],
      mock: result.mock || false,
    };
  } catch (error) {
    logger.error('Erro ao verificar identidade', { cpf, error: error.message });
    throw error;
  }
}

/**
 * Realizar background check completo
 * 
 * @param {string} cpf - CPF a ser verificado
 * @param {string} nome - Nome completo
 * @param {string} dataNascimento - Data de nascimento
 * @returns {Promise<Object>} Resultado do background check
 */
async function performBackgroundCheck(cpf, nome, dataNascimento) {
  try {
    const cleanCpf = cpf.replace(/\D/g, '');
    
    // Verificar se já existe verificação recente (cache de 30 dias)
    const existing = await db('verification_requests')
      .where({ type: 'background_check', document: cleanCpf })
      .where('created_at', '>', db.raw("NOW() - INTERVAL '30 days'"))
      .orderBy('created_at', 'desc')
      .first();

    if (existing) {
      logger.info('Usando verificação em cache', { cpf: cleanCpf });
      return JSON.parse(existing.response_data);
    }

    // Chamar API Serasa
    const result = await callSerasaAPI('/background-check', 'POST', {
      cpf: cleanCpf,
      nome,
      data_nascimento: dataNascimento,
    });

    // Salvar resultado
    await db('verification_requests').insert({
      type: 'background_check',
      document: cleanCpf,
      request_data: JSON.stringify({ nome, dataNascimento }),
      response_data: JSON.stringify(result),
      status: result.resultado === 'APROVADO' ? 'approved' : 'rejected',
      created_at: new Date(),
    });

    logger.info('Background check concluído', { cpf: cleanCpf, resultado: result.resultado });

    return {
      success: result.resultado === 'APROVADO',
      request_id: result.request_id,
      resultado: result.resultado,
      detalhes: result.detalhes,
      mock: result.mock || false,
    };
  } catch (error) {
    logger.error('Erro ao realizar background check', { cpf, error: error.message });
    throw error;
  }
}

/**
 * Validar documento (CPF ou CNPJ)
 * 
 * @param {string} document - CPF ou CNPJ
 * @param {string} type - 'cpf' ou 'cnpj'
 * @returns {Promise<Object>} Resultado da validação
 */
async function validateDocument(document, type = 'cpf') {
  try {
    const cleanDoc = document.replace(/\D/g, '');
    
    if (type === 'cpf' && cleanDoc.length !== 11) {
      throw new Error('CPF inválido: deve conter 11 dígitos');
    }
    
    if (type === 'cnpj' && cleanDoc.length !== 14) {
      throw new Error('CNPJ inválido: deve conter 14 dígitos');
    }

    // Validar dígitos verificadores (algoritmo básico)
    let isValid = false;
    if (type === 'cpf') {
      isValid = validateCPF(cleanDoc);
    } else {
      isValid = validateCNPJ(cleanDoc);
    }

    if (!isValid) {
      return {
        valid: false,
        document: cleanDoc,
        type,
        message: `${type.toUpperCase()} inválido (dígitos verificadores incorretos)`,
      };
    }

    // Se tiver credenciais, consultar API Serasa
    if (!SERASA_USE_MOCK) {
      const endpoint = type === 'cpf' ? '/cpf/consulta' : '/cnpj/consulta';
      const result = await callSerasaAPI(endpoint, 'POST', {
        [type]: cleanDoc,
      });

      return {
        valid: true,
        document: cleanDoc,
        type,
        situacao: result.situacao,
        score: result.score,
        restricoes: result.restricoes || [],
        mock: false,
      };
    }

    return {
      valid: true,
      document: cleanDoc,
      type,
      message: 'Documento válido (validação local)',
      mock: true,
    };
  } catch (error) {
    logger.error('Erro ao validar documento', { document, type, error: error.message });
    throw error;
  }
}

/**
 * Validar CPF (algoritmo de dígitos verificadores)
 */
function validateCPF(cpf) {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cpf.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cpf.charAt(10))) return false;

  return true;
}

/**
 * Validar CNPJ (algoritmo de dígitos verificadores)
 */
function validateCNPJ(cnpj) {
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }

  let length = cnpj.length - 2;
  let numbers = cnpj.substring(0, length);
  const digits = cnpj.substring(length);
  let sum = 0;
  let pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += numbers.charAt(length - i) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  length = length + 1;
  numbers = cnpj.substring(0, length);
  sum = 0;
  pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += numbers.charAt(length - i) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
}

/**
 * Obter histórico de verificações
 * 
 * @param {string} document - CPF ou CNPJ
 * @param {string} [type] - Tipo de verificação (opcional)
 * @returns {Promise<Array>} Histórico de verificações
 */
async function getVerificationHistory(document, type = null) {
  try {
    const cleanDoc = document.replace(/\D/g, '');
    
    let query = db('verification_requests')
      .where('document', cleanDoc)
      .orderBy('created_at', 'desc');

    if (type) {
      query = query.where('type', type);
    }

    const history = await query;

    return history.map(item => ({
      id: item.id,
      type: item.type,
      document: item.document,
      status: item.status,
      request_data: item.request_data ? JSON.parse(item.request_data) : null,
      response_data: item.response_data ? JSON.parse(item.response_data) : null,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
  } catch (error) {
    logger.error('Erro ao obter histórico de verificações', { document, error: error.message });
    throw error;
  }
}

module.exports = {
  verifyIdentity,
  performBackgroundCheck,
  validateDocument,
  getVerificationHistory,
};

