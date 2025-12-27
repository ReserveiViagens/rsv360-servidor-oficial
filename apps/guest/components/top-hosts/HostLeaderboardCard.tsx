/**
 * 🏆 HostLeaderboardCard Component
 * FASE 4.4: Card para exibir host no leaderboard
 */

import Link from 'next/link';
import { HostLeaderboard } from '../../lib/top-hosts/types';

interface HostLeaderboardCardProps {
  host: HostLeaderboard;
  rank: number;
}

export function HostLeaderboardCard({ host, rank }: HostLeaderboardCardProps) {
  const getRankBadge = () => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getRankColor = () => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (rank === 2) return 'bg-gray-100 text-gray-800 border-gray-300';
    if (rank === 3) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-white text-gray-800 border-gray-200';
  };

  return (
    <Link href={`/hosts/${host.host_id}`}>
      <div className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-2 ${getRankColor()}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${getRankColor()}`}>
              {getRankBadge()}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {host.host?.name || `Host #${host.host_id}`}
              </h3>
              {host.host?.email && (
                <p className="text-sm text-gray-600">{host.host.email}</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Avaliação</p>
            <p className="text-2xl font-bold text-primary">
              {parseFloat(host.avg_rating?.toString() || '0').toFixed(1)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className={`text-sm ${
                    i < Math.floor(parseFloat(host.avg_rating?.toString() || '0'))
                      ? 'text-yellow-400'
                      : 'text-gray-300'
                  }`}
                >
                  ★
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600">Reservas</p>
            <p className="text-2xl font-bold text-gray-900">
              {host.total_bookings || 0}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Receita</p>
            <p className="text-2xl font-bold text-green-600">
              R$ {(host.total_revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Propriedades</p>
            <p className="text-2xl font-bold text-gray-900">
              {host.total_properties || 0}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <Link
            href={`/hosts/${host.host_id}`}
            className="text-primary hover:text-primary-dark font-medium text-sm inline-flex items-center gap-1"
          >
            Ver perfil completo →
          </Link>
        </div>
      </div>
    </Link>
  );
}

