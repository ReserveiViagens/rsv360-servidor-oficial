/**
 * 🖼️ Image Validation Utility
 * FASE C6: Validação completa de imagens (formato, tamanho, dimensões)
 */

const fs = require('fs').promises;
const sharp = require('sharp');

// Configurações padrão
const DEFAULT_CONFIG = {
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  maxWidth: parseInt(process.env.MAX_IMAGE_WIDTH || '4000'),
  maxHeight: parseInt(process.env.MAX_IMAGE_HEIGHT || '4000'),
  minWidth: parseInt(process.env.MIN_IMAGE_WIDTH || '100'),
  minHeight: parseInt(process.env.MIN_IMAGE_HEIGHT || '100'),
  allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
};

/**
 * Validar formato de arquivo
 * @param {string} filename - Nome do arquivo
 * @param {string} mimeType - MIME type do arquivo
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateFormat(filename, mimeType) {
  // Validar extensão
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  if (!DEFAULT_CONFIG.allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `Formato não suportado. Formatos permitidos: ${DEFAULT_CONFIG.allowedExtensions.join(', ')}`,
    };
  }

  // Validar MIME type
  if (!DEFAULT_CONFIG.allowedMimeTypes.includes(mimeType)) {
    return {
      valid: false,
      error: `Tipo MIME não suportado. Tipos permitidos: ${DEFAULT_CONFIG.allowedMimeTypes.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Validar tamanho do arquivo
 * @param {number} fileSize - Tamanho em bytes
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateFileSize(fileSize) {
  if (fileSize > DEFAULT_CONFIG.maxFileSize) {
    const maxSizeMB = (DEFAULT_CONFIG.maxFileSize / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`,
    };
  }

  if (fileSize === 0) {
    return {
      valid: false,
      error: 'Arquivo vazio',
    };
  }

  return { valid: true };
}

/**
 * Validar dimensões da imagem
 * @param {string} filePath - Caminho do arquivo
 * @returns {Promise<Object>} { valid: boolean, error?: string, metadata?: Object }
 */
async function validateDimensions(filePath) {
  try {
    const metadata = await sharp(filePath).metadata();

    // Validar largura
    if (metadata.width < DEFAULT_CONFIG.minWidth) {
      return {
        valid: false,
        error: `Largura muito pequena. Mínimo: ${DEFAULT_CONFIG.minWidth}px`,
        metadata,
      };
    }

    if (metadata.width > DEFAULT_CONFIG.maxWidth) {
      return {
        valid: false,
        error: `Largura muito grande. Máximo: ${DEFAULT_CONFIG.maxWidth}px`,
        metadata,
      };
    }

    // Validar altura
    if (metadata.height < DEFAULT_CONFIG.minHeight) {
      return {
        valid: false,
        error: `Altura muito pequena. Mínimo: ${DEFAULT_CONFIG.minHeight}px`,
        metadata,
      };
    }

    if (metadata.height > DEFAULT_CONFIG.maxHeight) {
      return {
        valid: false,
        error: `Altura muito grande. Máximo: ${DEFAULT_CONFIG.maxHeight}px`,
        metadata,
      };
    }

    return {
      valid: true,
      metadata,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Erro ao validar dimensões: ${error.message}`,
    };
  }
}

/**
 * Validar imagem completa (formato, tamanho, dimensões)
 * @param {Object} file - Objeto do arquivo (multer)
 * @returns {Promise<Object>} { valid: boolean, error?: string, metadata?: Object }
 */
async function validateImage(file) {
  // Validar formato
  const formatValidation = validateFormat(file.originalname, file.mimetype);
  if (!formatValidation.valid) {
    return formatValidation;
  }

  // Validar tamanho
  const sizeValidation = validateFileSize(file.size);
  if (!sizeValidation.valid) {
    return sizeValidation;
  }

  // Validar dimensões
  const dimensionsValidation = await validateDimensions(file.path);
  if (!dimensionsValidation.valid) {
    // Remover arquivo inválido
    try {
      await fs.unlink(file.path);
    } catch (e) {
      // Ignorar erro ao remover
    }
    return dimensionsValidation;
  }

  return {
    valid: true,
    metadata: dimensionsValidation.metadata,
  };
}

/**
 * Validar múltiplas imagens
 * @param {Array} files - Array de arquivos
 * @returns {Promise<Object>} { valid: boolean, errors?: Array, validFiles?: Array }
 */
async function validateImages(files) {
  const errors = [];
  const validFiles = [];

  for (const file of files) {
    const validation = await validateImage(file);
    if (validation.valid) {
      validFiles.push(file);
    } else {
      errors.push({
        filename: file.originalname,
        error: validation.error,
      });
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      validFiles,
    };
  }

  return {
    valid: true,
    validFiles,
  };
}

module.exports = {
  validateFormat,
  validateFileSize,
  validateDimensions,
  validateImage,
  validateImages,
  DEFAULT_CONFIG,
};

