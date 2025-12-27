/**
 * 🖼️ Image Processing Utility
 * FASE C6: Processamento e otimização de imagens com Sharp
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

// Configurações padrão
const DEFAULT_OPTIONS = {
  maxWidth: parseInt(process.env.OPTIMIZED_IMAGE_WIDTH || '1920'),
  maxHeight: parseInt(process.env.OPTIMIZED_IMAGE_HEIGHT || '1920'),
  quality: parseInt(process.env.IMAGE_QUALITY || '85'),
  format: process.env.IMAGE_FORMAT || 'webp', // webp, jpeg, png
  createThumbnail: process.env.CREATE_THUMBNAILS === 'true',
  thumbnailWidth: parseInt(process.env.THUMBNAIL_WIDTH || '400'),
  thumbnailHeight: parseInt(process.env.THUMBNAIL_HEIGHT || '400'),
};

/**
 * Processar e otimizar imagem
 * @param {string} inputPath - Caminho da imagem original
 * @param {string} outputPath - Caminho de saída (opcional)
 * @param {Object} options - Opções de processamento
 * @returns {Promise<Object>} { path: string, metadata: Object, thumbnailPath?: string }
 */
async function processImage(inputPath, outputPath = null, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Gerar caminho de saída se não fornecido
  if (!outputPath) {
    const ext = path.extname(inputPath);
    const baseName = path.basename(inputPath, ext);
    const dir = path.dirname(inputPath);
    const formatExt = opts.format === 'webp' ? '.webp' : ext;
    outputPath = path.join(dir, `${baseName}_optimized${formatExt}`);
  }

  try {
    let image = sharp(inputPath);

    // Obter metadados originais
    const metadata = await image.metadata();

    // Redimensionar se necessário
    if (metadata.width > opts.maxWidth || metadata.height > opts.maxHeight) {
      image = image.resize(opts.maxWidth, opts.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Processar baseado no formato
    let processedImage;
    switch (opts.format) {
      case 'webp':
        processedImage = image.webp({ quality: opts.quality });
        break;
      case 'jpeg':
      case 'jpg':
        processedImage = image.jpeg({ quality: opts.quality, mozjpeg: true });
        break;
      case 'png':
        processedImage = image.png({ quality: opts.quality, compressionLevel: 9 });
        break;
      default:
        processedImage = image.webp({ quality: opts.quality });
    }

    // Salvar imagem otimizada
    await processedImage.toFile(outputPath);

    // Obter metadados da imagem processada
    const processedMetadata = await sharp(outputPath).metadata();

    const result = {
      path: outputPath,
      metadata: {
        original: {
          width: metadata.width,
          height: metadata.height,
          size: metadata.size,
          format: metadata.format,
        },
        processed: {
          width: processedMetadata.width,
          height: processedMetadata.height,
          size: processedMetadata.size,
          format: processedMetadata.format,
        },
        optimization: {
          sizeReduction: metadata.size - processedMetadata.size,
          sizeReductionPercent: ((metadata.size - processedMetadata.size) / metadata.size * 100).toFixed(2),
        },
      },
    };

    // Criar thumbnail se solicitado
    if (opts.createThumbnail) {
      const thumbnailPath = await createThumbnail(inputPath, opts);
      result.thumbnailPath = thumbnailPath;
    }

    return result;
  } catch (error) {
    throw new Error(`Erro ao processar imagem: ${error.message}`);
  }
}

/**
 * Criar thumbnail da imagem
 * @param {string} inputPath - Caminho da imagem original
 * @param {Object} options - Opções
 * @returns {Promise<string>} Caminho do thumbnail
 */
async function createThumbnail(inputPath, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const ext = path.extname(inputPath);
  const baseName = path.basename(inputPath, ext);
  const dir = path.dirname(inputPath);
  const thumbnailPath = path.join(dir, `${baseName}_thumb${ext}`);

  try {
    await sharp(inputPath)
      .resize(opts.thumbnailWidth, opts.thumbnailHeight, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: 80 })
      .toFile(thumbnailPath);

    return thumbnailPath;
  } catch (error) {
    throw new Error(`Erro ao criar thumbnail: ${error.message}`);
  }
}

/**
 * Processar múltiplas imagens
 * @param {Array} files - Array de arquivos
 * @param {Object} options - Opções de processamento
 * @returns {Promise<Array>} Array de resultados
 */
async function processImages(files, options = {}) {
  const results = [];

  for (const file of files) {
    try {
      const result = await processImage(file.path, null, options);
      results.push({
        original: file.originalname,
        ...result,
      });
    } catch (error) {
      results.push({
        original: file.originalname,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Remover arquivo original após processamento
 * @param {string} filePath - Caminho do arquivo
 * @returns {Promise<void>}
 */
async function removeOriginal(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // Ignorar erro se arquivo não existir
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

module.exports = {
  processImage,
  createThumbnail,
  processImages,
  removeOriginal,
  DEFAULT_OPTIONS,
};

