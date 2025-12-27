/**
 * 🏆 Top Hosts Page
 * FASE 4.5: Página de Top Hosts com integração real
 */

import Head from 'next/head';
import { useState } from 'react';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { HostLeaderboardCard } from '../components/top-hosts/HostLeaderboardCard';
import { useTopHosts } from '../hooks/useTopHosts';

export default function TopHostsPage() {
  const [limit, setLimit] = useState(10);
  const { leaderboard, loading, error, refresh } = useTopHosts(limit);

  return (
    <>
      <Head>
        <title>Top Hosts - Melhores Anfitriões | RSV360</title>
        <meta name="description" content="Descubra os melhores anfitriões da plataforma. Hosts com excelentes avaliações e muitas propriedades." />
        <meta name="keywords" content="top hosts, melhores anfitriões, ranking, avaliações, propriedades" />
      </Head>

      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={[{ label: 'Top Hosts', href: '/top-hosts' }]} />
        
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2 font-display">Top Hosts</h1>
              <p className="text-gray-600">
                Descubra os melhores anfitriões da plataforma. Hosts com excelentes avaliações e muitas propriedades.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Mostrar:</label>
              <select
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="px-3 py-2 border rounded-lg"
              >
                <option value={10}>Top 10</option>
                <option value={20}>Top 20</option>
                <option value={50}>Top 50</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <p className="text-gray-600">Carregando top hosts...</p>
            </div>
          )}

          {!loading && leaderboard.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-600">Nenhum host encontrado no ranking.</p>
              <p className="text-sm text-gray-500 mt-2">Funcionalidade em desenvolvimento.</p>
            </div>
          )}

          {!loading && leaderboard.length > 0 && (
            <div className="space-y-4">
              {leaderboard.map((host, index) => (
                <HostLeaderboardCard
                  key={host.host_id}
                  host={host}
                  rank={index + 1}
                />
              ))}
            </div>
          )}

          {/* Benefícios de ser Top Host */}
          <div className="mt-12 bg-blue-50 rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-6 font-heading">Como se tornar um Top Host</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-4xl mb-2">⭐</div>
                <h3 className="font-bold mb-2">Excelente Avaliação</h3>
                <p className="text-sm text-gray-600">Manter 4.8+ de avaliação</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-2">🏠</div>
                <h3 className="font-bold mb-2">Múltiplas Propriedades</h3>
                <p className="text-sm text-gray-600">Mínimo 10 propriedades</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <h3 className="font-bold mb-2">Alta Taxa de Ocupação</h3>
                <p className="text-sm text-gray-600">Acima de 80% ocupado</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-2">👥</div>
                <h3 className="font-bold mb-2">Resposta Rápida</h3>
                <p className="text-sm text-gray-600">24h para responder</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

