import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Heart, Mail, Calendar, Users, MessageSquare, DollarSign, Gift } from 'lucide-react';

export default function GroupTravelPage() {
  const router = useRouter();

  const handleCreateWishlist = () => {
    router.push('/wishlists');
  };

  const handleCreateInvitation = () => {
    // Redirecionar para página de criar convite ou modal
    router.push('/wishlists?action=invite');
  };

  const handleOpenCalendar = () => {
    // Redirecionar para calendário compartilhado
    router.push('/wishlists?view=calendar');
  };

  return (
    <>
      <Head>
        <title>Viagens em Grupo | RSV360 - Planeje Viagens com Amigos</title>
        <meta name="description" content="Planeje viagens incríveis com seus amigos. Crie wishlists compartilhadas, convide participantes e sincronize agendas." />
        <meta name="keywords" content="viagens em grupo, wishlists compartilhadas, viagem com amigos, calendário compartilhado" />
      </Head>

      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={[{ label: 'Group Travel', href: '/group-travel' }]} />
        
        <div className="mt-8">
          <h1 className="text-4xl font-bold mb-4 font-display">Viagens em Grupo</h1>
          <p className="text-gray-600 mb-8 text-lg">
            Planeje viagens incríveis com seus amigos. Crie wishlists compartilhadas, convide participantes e sincronize agendas.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Card 1: Wishlists */}
            <Link href="/wishlists" className="card p-6 hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-center justify-center w-16 h-16 bg-pink-100 rounded-full mb-4">
                <Heart className="w-8 h-8 text-pink-600" />
              </div>
              <h3 className="text-xl font-bold mb-2 font-heading">Wishlists Compartilhadas</h3>
              <p className="text-gray-600 mb-4">Crie listas de desejos e compartilhe com amigos. Vote nos destinos favoritos!</p>
              <span className="text-primary font-semibold">Criar Wishlist →</span>
            </Link>

            {/* Card 2: Convites */}
            <button 
              onClick={handleCreateInvitation}
              className="card p-6 hover:shadow-lg transition-shadow duration-200 text-left"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-2 font-heading">Convites de Viagem</h3>
              <p className="text-gray-600 mb-4">Convide amigos para viagens planejadas e organize grupos</p>
              <span className="text-primary font-semibold">Enviar Convite →</span>
            </button>

            {/* Card 3: Calendário Compartilhado */}
            <button 
              onClick={handleOpenCalendar}
              className="card p-6 hover:shadow-lg transition-shadow duration-200 text-left"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <Calendar className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-2 font-heading">Calendário Compartilhado</h3>
              <p className="text-gray-600 mb-4">Sincronize datas e veja disponibilidade do grupo</p>
              <span className="text-primary font-semibold">Abrir Calendário →</span>
            </button>

            {/* Card 4: Pagamento Dividido */}
            <Link href="/wishlists?view=split-payments" className="card p-6 hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                <DollarSign className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold mb-2 font-heading">Pagamento Dividido</h3>
              <p className="text-gray-600 mb-4">Divida o custo da viagem entre os participantes</p>
              <span className="text-primary font-semibold">Ver Opções →</span>
            </Link>

            {/* Card 5: Chat em Grupo */}
            <Link href="/mensagens" className="card p-6 hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
                <MessageSquare className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold mb-2 font-heading">Chat em Grupo</h3>
              <p className="text-gray-600 mb-4">Converse com o grupo sobre a viagem em tempo real</p>
              <span className="text-primary font-semibold">Abrir Chat →</span>
            </Link>

            {/* Card 6: Leilões em Grupo */}
            <Link href="/leiloes" className="card p-6 hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <Gift className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold mb-2 font-heading">Leilões em Grupo</h3>
              <p className="text-gray-600 mb-4">Participe de leilões juntos para conseguir melhores preços</p>
              <span className="text-primary font-semibold">Ver Leilões →</span>
            </Link>
          </div>

          {/* Exemplo de Viagem em Grupo */}
          <div className="mt-12 bg-blue-50 rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-4 font-heading">Como Funciona</h2>
            <ol className="space-y-4">
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">1</span>
                <div>
                  <h4 className="font-bold">Crie ou se junte a um grupo</h4>
                  <p className="text-gray-600">Convide amigos ou aceite convites para viagens</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">2</span>
                <div>
                  <h4 className="font-bold">Crie uma wishlist compartilhada</h4>
                  <p className="text-gray-600">Adicione hotéis, atrações e atividades que todos querem fazer</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">3</span>
                <div>
                  <h4 className="font-bold">Sincronize as datas</h4>
                  <p className="text-gray-600">Use o calendário compartilhado para encontrar as melhores datas</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">4</span>
                <div>
                  <h4 className="font-bold">Faça leilões juntos</h4>
                  <p className="text-gray-600">Participe de leilões em grupo para conseguir melhores preços</p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </>
  );
}

