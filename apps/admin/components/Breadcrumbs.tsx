import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const router = useRouter();

  // Se não houver itens, gerar automaticamente baseado na rota
  const breadcrumbs = items || generateBreadcrumbsFromPath(router.pathname);

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav
      className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-lg text-sm mb-4"
      aria-label="Navegação de breadcrumb"
    >
      {/* Home */}
      <Link
        href="/"
        className="flex items-center gap-1 text-primary hover:text-primary-dark transition"
        aria-label="Ir para home"
      >
        <Home size={16} />
      </Link>

      {breadcrumbs.map((item, index) => (
        <div key={`${item.href}-${index}`} className="flex items-center gap-2">
          <ChevronRight size={16} className="text-gray-400" />
          {index === breadcrumbs.length - 1 ? (
            // Página atual (sem link)
            <span className="text-gray-900 font-semibold">{item.label}</span>
          ) : (
            // Link para página anterior
            <Link
              href={item.href}
              className="text-primary hover:text-primary-dark hover:underline transition"
            >
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}

// Função auxiliar para gerar breadcrumbs automaticamente
function generateBreadcrumbsFromPath(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  
  // Ignorar rotas dinâmicas e especiais
  if (segments.length === 0 || segments[0] === 'api' || segments[0] === '_app') {
    return [];
  }

  const breadcrumbs: BreadcrumbItem[] = [];

  segments.forEach((segment, index) => {
    // Ignorar IDs dinâmicos
    if (segment.startsWith('[') && segment.endsWith(']')) {
      return;
    }
    
    const href = '/' + segments.slice(0, index + 1).join('/');
    const label = formatSegmentToLabel(segment);
    breadcrumbs.push({ label, href });
  });

  return breadcrumbs;
}

function formatSegmentToLabel(segment: string): string {
  // Mapear rotas conhecidas para labels amigáveis
  const routeMap: Record<string, string> = {
    'group-travel': 'Group Travel',
    'smart-pricing': 'Smart Pricing',
    'top-hosts': 'Top Hosts',
    'sobre-nos': 'Sobre Nós',
    'como-funciona': 'Como Funciona',
    'trabalhe-conosco': 'Trabalhe Conosco',
    'termos-uso': 'Termos de Uso',
  };

  if (routeMap[segment]) {
    return routeMap[segment];
  }

  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

