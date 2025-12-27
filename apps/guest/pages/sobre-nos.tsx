import Head from 'next/head';
import Link from 'next/link';
import { Breadcrumbs } from '../components/Breadcrumbs';

export default function SobreNosPage() {
  return (
    <>
      <Head>
        <title>Sobre RSV360 | Plataforma Líder em Leilão de Hospedagem no Brasil</title>
        <meta name="description" content="Somos a plataforma #1 em leilão de hospedagem no Brasil. Saiba mais sobre nossa história, missão e como revolucionamos o mercado de viagens." />
        <meta name="keywords" content="RSV360, sobre, leilão hospedagem, plataforma viagem, Brasil" />
        <meta property="og:title" content="Sobre RSV360 - Líder em Leilão de Hospedagem" />
        <meta property="og:description" content="Descubra como a RSV360 está revolucionando o mercado de hospedagem no Brasil" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="pt_BR" />
        <link rel="canonical" href="https://www.reserveiviagens.com.br/sobre-nos" />
      </Head>

      <article className="container mx-auto px-4 py-12">
        <Breadcrumbs items={[{ label: 'Sobre Nós', href: '/sobre-nos' }]} />
        
        {/* Seção Hero */}
        <section className="mb-12">
          <h1 className="text-5xl font-bold mb-6 text-primary font-display">
            Sobre a RSV360: Revolucionando Hospedagem no Brasil
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            Fundada em 2020, a RSV360 é a plataforma líder em leilão de hospedagem no Brasil, 
            conectando proprietários e viajantes em transações justas e transparentes.
          </p>
        </section>

        {/* Seção Missão */}
        <section className="mb-12 bg-blue-50 p-8 rounded-lg">
          <h2 className="text-3xl font-bold mb-4 font-heading">Nossa Missão</h2>
          <p className="text-lg text-gray-700">
            Democratizar o acesso a hospedagem de qualidade, permitindo que mais brasileiros 
            viajem economizando através de um sistema justo, transparente e inovador de leilões.
          </p>
        </section>

        {/* Seção Visão */}
        <section className="mb-12 bg-green-50 p-8 rounded-lg">
          <h2 className="text-3xl font-bold mb-4 font-heading">Nossa Visão</h2>
          <p className="text-lg text-gray-700">
            Ser a plataforma #1 de leilão de hospedagem na América Latina, transformando 
            como as pessoas viajam através da tecnologia e inovação.
          </p>
        </section>

        {/* Seção Valores */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-8 font-heading">Nossos Valores</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-6 border rounded-lg">
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="text-xl font-bold mb-2 font-heading">Transparência</h3>
              <p className="text-gray-600">Total clareza em todas as transações</p>
            </div>
            <div className="text-center p-6 border rounded-lg">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-bold mb-2 font-heading">Segurança</h3>
              <p className="text-gray-600">Proteção total do usuário e dados</p>
            </div>
            <div className="text-center p-6 border rounded-lg">
              <div className="text-4xl mb-4">✨</div>
              <h3 className="text-xl font-bold mb-2 font-heading">Inovação</h3>
              <p className="text-gray-600">Tecnologia de ponta sempre</p>
            </div>
            <div className="text-center p-6 border rounded-lg">
              <div className="text-4xl mb-4">❤️</div>
              <h3 className="text-xl font-bold mb-2 font-heading">Comunidade</h3>
              <p className="text-gray-600">Apoio aos viajantes e hosts</p>
            </div>
          </div>
        </section>

        {/* Seção Números */}
        <section className="mb-16 bg-gray-50 p-12 rounded-lg">
          <h2 className="text-3xl font-bold mb-8 font-heading">Números que Nos Orgulham</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-5xl font-bold text-primary mb-2">1500+</div>
              <p className="text-gray-600">Propriedades</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-primary mb-2">500K+</div>
              <p className="text-gray-600">Usuários Ativos</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-primary mb-2">$80M</div>
              <p className="text-gray-600">Transacionados</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-primary mb-2">4.8⭐</div>
              <p className="text-gray-600">Avaliação Média</p>
            </div>
          </div>
        </section>

        {/* Links Internos */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 font-heading">Saiba Mais</h2>
          <div className="flex gap-4 flex-wrap">
            <Link href="/historia" className="text-primary hover:underline">Nossa História</Link>
            <Link href="/equipe" className="text-primary hover:underline">Nossa Equipe</Link>
            <Link href="/como-funciona" className="text-primary hover:underline">Como Funciona</Link>
            <Link href="/contato" className="text-primary hover:underline">Entre em Contato</Link>
          </div>
        </section>

        {/* Schema.org */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'RSV360',
              url: 'https://www.reserveiviagens.com.br',
              logo: 'https://www.reserveiviagens.com.br/logo.png',
              description: 'Plataforma líder em leilão de hospedagem no Brasil',
              foundingDate: '2020-03-01',
              address: {
                '@type': 'PostalAddress',
                addressCountry: 'BR',
              },
            }),
          }}
        />
      </article>
    </>
  );
}

