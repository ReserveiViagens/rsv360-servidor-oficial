# RSV 360 - Shared Libraries

Código compartilhado entre sistemas (tipos, DTOs, utilitários, API clients).

## Estrutura

- `types/` - Tipos TypeScript compartilhados (será preenchido na Fase 2)
- `utils/` - Utilitários genéricos (será preenchido na Fase 2)
- `api-clients/` - Clients HTTP compartilhados (será preenchido na Fase 2)

## Uso

Este pacote será importado pelos outros apps (guest, admin, api, jobs).

### Importação de Tipos

```typescript
import { Booking } from '@shared/types/booking';
```

### Importação de Utils

```typescript
import { formatDate } from '@shared/utils/date';
```

### Importação de API Clients

```typescript
import { apiClient } from '@shared/api/clients';
```

## Configuração

Os paths `@shared/*` estão configurados nos `tsconfig.json` de cada app:
- `apps/guest/tsconfig.json`
- `apps/admin/tsconfig.json`

## Status

⚠️ **Fase 1:** Estrutura criada, aguardando migração de arquivos da Fase 2.

