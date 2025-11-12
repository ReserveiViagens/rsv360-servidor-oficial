import { logger } from '../utils/logger';
import { cacheService } from './cache.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface CDNAsset {
  id: string;
  originalPath: string;
  cdnUrl: string;
  contentType: string;
  size: number;
  hash: string;
  lastModified: Date;
  cacheControl: string;
  expires?: Date;
}

export interface CDNConfig {
  baseUrl: string;
  cacheDirectory: string;
  maxFileSize: number; // bytes
  allowedTypes: string[];
  compressionEnabled: boolean;
  versioningEnabled: boolean;
}

export class CDNService {
  private config: CDNConfig;
  private assets: Map<string, CDNAsset> = new Map();
  private compressionCache: Map<string, Buffer> = new Map();

  constructor(config?: Partial<CDNConfig>) {
    this.config = {
      baseUrl: process.env['CDN_BASE_URL'] || 'http://localhost:3000/cdn',
      cacheDirectory: process.env['CDN_CACHE_DIR'] || './public/cdn',
      maxFileSize: parseInt(process.env['CDN_MAX_FILE_SIZE'] || '10485760'), // 10MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'text/css', 'application/javascript', 'application/json'],
      compressionEnabled: process.env['CDN_COMPRESSION'] === 'true',
      versioningEnabled: process.env['CDN_VERSIONING'] === 'true',
      ...config
    };

    this.initializeCDN();
  }

  private async initializeCDN(): Promise<void> {
    try {
      // Criar diretório de cache se não existir
      if (!fs.existsSync(this.config.cacheDirectory)) {
        fs.mkdirSync(this.config.cacheDirectory, { recursive: true });
      }

      // Carregar assets existentes
      await this.loadExistingAssets();
      
      logger.info('CDN service initialized', {
        baseUrl: this.config.baseUrl,
        cacheDirectory: this.config.cacheDirectory,
        assetsCount: this.assets.size
      });
    } catch (error) {
      logger.error('Error initializing CDN service:', error);
    }
  }

  private async loadExistingAssets(): Promise<void> {
    try {
      const files = fs.readdirSync(this.config.cacheDirectory);
      
      for (const file of files) {
        const filePath = path.join(this.config.cacheDirectory, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile()) {
          const asset: CDNAsset = {
            id: file,
            originalPath: filePath,
            cdnUrl: `${this.config.baseUrl}/${file}`,
            contentType: this.getContentType(file),
            size: stats.size,
            hash: await this.calculateFileHash(filePath),
            lastModified: stats.mtime,
            cacheControl: this.getCacheControl(file)
          };
          
          this.assets.set(file, asset);
        }
      }
    } catch (error) {
      logger.error('Error loading existing assets:', error);
    }
  }

  async uploadAsset(filePath: string, originalName?: string): Promise<CDNAsset> {
    try {
      // Verificar se o arquivo existe
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const stats = fs.statSync(filePath);
      
      // Verificar tamanho do arquivo
      if (stats.size > this.config.maxFileSize) {
        throw new Error(`File too large: ${stats.size} bytes (max: ${this.config.maxFileSize})`);
      }

      // Verificar tipo de arquivo
      const contentType = this.getContentType(filePath);
      if (!this.config.allowedTypes.includes(contentType)) {
        throw new Error(`File type not allowed: ${contentType}`);
      }

      // Gerar ID único para o arquivo
      const fileHash = await this.calculateFileHash(filePath);
      const fileExtension = path.extname(filePath);
      const assetId = this.config.versioningEnabled 
        ? `${fileHash}${fileExtension}`
        : `${originalName || path.basename(filePath, fileExtension)}_${Date.now()}${fileExtension}`;

      // Copiar arquivo para o diretório CDN
      const cdnPath = path.join(this.config.cacheDirectory, assetId);
      fs.copyFileSync(filePath, cdnPath);

      // Criar asset metadata
      const asset: CDNAsset = {
        id: assetId,
        originalPath: filePath,
        cdnUrl: `${this.config.baseUrl}/${assetId}`,
        contentType,
        size: stats.size,
        hash: fileHash,
        lastModified: new Date(),
        cacheControl: this.getCacheControl(filePath),
        expires: this.getExpirationDate(filePath)
      };

      // Salvar no cache
      this.assets.set(assetId, asset);
      await cacheService.set(`cdn_asset:${assetId}`, asset, 86400); // 24 horas

      logger.info(`Asset uploaded to CDN: ${assetId}`, {
        size: asset.size,
        contentType: asset.contentType,
        cdnUrl: asset.cdnUrl
      });

      return asset;

    } catch (error) {
      logger.error(`Error uploading asset ${filePath}:`, error);
      throw error;
    }
  }

  async getAsset(assetId: string): Promise<CDNAsset | null> {
    try {
      // Verificar cache primeiro
      const cached = await cacheService.get<CDNAsset>(`cdn_asset:${assetId}`);
      if (cached) {
        return cached;
      }

      // Verificar se existe no mapa de assets
      const asset = this.assets.get(assetId);
      if (asset) {
        // Verificar se o arquivo ainda existe
        if (fs.existsSync(asset.originalPath)) {
          await cacheService.set(`cdn_asset:${assetId}`, asset, 3600); // 1 hora
          return asset;
        } else {
          // Arquivo foi removido, limpar do mapa
          this.assets.delete(assetId);
        }
      }

      return null;
    } catch (error) {
      logger.error(`Error getting asset ${assetId}:`, error);
      return null;
    }
  }

  async getAssetContent(assetId: string): Promise<Buffer | null> {
    try {
      const asset = await this.getAsset(assetId);
      if (!asset) {
        return null;
      }

      // Verificar se precisa comprimir
      if (this.config.compressionEnabled && this.isCompressible(asset.contentType)) {
        const compressed = await this.getCompressedContent(asset);
        if (compressed) {
          return compressed;
        }
      }

      // Retornar conteúdo original
      return fs.readFileSync(asset.originalPath);
    } catch (error) {
      logger.error(`Error getting asset content ${assetId}:`, error);
      return null;
    }
  }

  private async getCompressedContent(asset: CDNAsset): Promise<Buffer | null> {
    try {
      // Verificar cache de compressão
      const cached = this.compressionCache.get(asset.id);
      if (cached) {
        return cached;
      }

      // Comprimir conteúdo
      const originalContent = fs.readFileSync(asset.originalPath);
      const compressed = await this.compressContent(originalContent, asset.contentType);
      
      if (compressed && compressed.length < originalContent.length) {
        this.compressionCache.set(asset.id, compressed);
        return compressed;
      }

      return null;
    } catch (error) {
      logger.error(`Error compressing asset ${asset.id}:`, error);
      return null;
    }
  }

  private async compressContent(content: Buffer, contentType: string): Promise<Buffer | null> {
    try {
      const zlib = require('zlib');
      
      switch (contentType) {
        case 'text/css':
        case 'application/javascript':
        case 'application/json':
          return new Promise((resolve, reject) => {
            zlib.gzip(content, (err: Error | null, result: Buffer) => {
              if (err) reject(err);
              else resolve(result);
            });
          });
        default:
          return null;
      }
    } catch (error) {
      logger.error('Error compressing content:', error);
      return null;
    }
  }

  private isCompressible(contentType: string): boolean {
    return [
      'text/css',
      'application/javascript',
      'application/json',
      'text/html',
      'text/plain'
    ].includes(contentType);
  }

  async deleteAsset(assetId: string): Promise<boolean> {
    try {
      const asset = this.assets.get(assetId);
      if (!asset) {
        return false;
      }

      // Remover arquivo físico
      if (fs.existsSync(asset.originalPath)) {
        fs.unlinkSync(asset.originalPath);
      }

      // Limpar caches
      this.assets.delete(assetId);
      this.compressionCache.delete(assetId);
      await cacheService.del(`cdn_asset:${assetId}`);

      logger.info(`Asset deleted from CDN: ${assetId}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting asset ${assetId}:`, error);
      return false;
    }
  }

  async listAssets(limit: number = 50, offset: number = 0): Promise<CDNAsset[]> {
    const assets = Array.from(this.assets.values())
      .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
      .slice(offset, offset + limit);

    return assets;
  }

  async getAssetStats(): Promise<any> {
    const assets = Array.from(this.assets.values());
    const totalSize = assets.reduce((sum, asset) => sum + asset.size, 0);
    const typeStats = new Map<string, { count: number; size: number }>();

    for (const asset of assets) {
      const existing = typeStats.get(asset.contentType) || { count: 0, size: 0 };
      existing.count++;
      existing.size += asset.size;
      typeStats.set(asset.contentType, existing);
    }

    return {
      totalAssets: assets.length,
      totalSize,
      averageSize: assets.length > 0 ? Math.round(totalSize / assets.length) : 0,
      typeBreakdown: Object.fromEntries(typeStats),
      compressionCacheSize: this.compressionCache.size,
      timestamp: new Date().toISOString()
    };
  }

  // Métodos auxiliares
  private async calculateFileHash(filePath: string): Promise<string> {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.html': 'text/html',
      '.txt': 'text/plain'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  private getCacheControl(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      return 'public, max-age=31536000'; // 1 ano para imagens
    } else if (['.css', '.js'].includes(ext)) {
      return 'public, max-age=86400'; // 1 dia para CSS/JS
    } else {
      return 'public, max-age=3600'; // 1 hora para outros
    }
  }

  private getExpirationDate(filePath: string): Date {
    const ext = path.extname(filePath).toLowerCase();
    const now = new Date();
    
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 ano
    } else if (['.css', '.js'].includes(ext)) {
      return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 dia
    } else {
      return new Date(now.getTime() + 60 * 60 * 1000); // 1 hora
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; assetsCount: number; cacheSize: number }> {
    return {
      status: 'healthy',
      assetsCount: this.assets.size,
      cacheSize: this.compressionCache.size
    };
  }

  // Configuração
  updateConfig(newConfig: Partial<CDNConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('CDN configuration updated', newConfig);
  }

  getConfig(): CDNConfig {
    return { ...this.config };
  }
}

// Singleton instance
export const cdnService = new CDNService();
