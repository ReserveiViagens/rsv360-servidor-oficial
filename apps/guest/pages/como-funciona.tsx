import Head from 'next/head';
import Link from 'next/link';
import { Breadcrumbs } from '../components/Breadcrumbs';

export default function ComoFuncionaPage() {
  return (
    <>
      <Head>
        <title>Como Funciona | RSV360 - Guia Completo</title>
        <meta name="description" content="Aprenda como usar a RSV360. Guia completo sobre leilões de hospedagem, como participar, fazer lances e garantir sua estadia." />
        <meta name="keywords" content="como funciona RSV360, leilão hospedagem, guia, tutorial, participar leilão" />
        <link rel="canonical" href="https://www.reserveiviagens.com.br/como-funciona" />
      </Head>

      <article className="container mx-auto px-4 py-12">
        <Breadcrumbs items={[{ label: 'Como Funciona', href: '/como-funciona' }]} />
        
        <h1 className="text-5xl font-bold mb-8 font-display">Como Funciona a RSV360</h1>
        
        <section className="mb-12">
          <p className="text-xl text-gray-600 mb-8">
            A RSV360 revoluciona como você reserva hospedagem. Através de leilões transparentes, 
            você pode conseguir os melhores preços em hotéis, pousadas e apartamentos.
          </p>

          {/* Passo a Passo */}
          <h2 className="text-3xl font-bold mb-8 font-heading">Passo a Passo</h2>
          <div className="space-y-8">
            {[
              {
                step: 1,
                title: 'Crie sua Conta',
                desc: 'Cadastre-se gratuitamente na plataforma. Leva menos de 2 minutos.',
                icon: '👤',
              },
              {
                step: 2,
                title: 'Busque Propriedades',
                desc: 'Explore milhares de opções de hospedagem em todo Brasil. Use filtros para encontrar o que procura.',
                icon: '🔍',
              },
              {
                step: 3,
                title: 'Participe do Leilão',
                desc: 'Veja leilões ativos e coloque seu lance. O sistema é transparente e justo.',
                icon: '🎯',
              },
              {
                step: 4,
                title: 'Vence e Pague',
                desc: 'Se você vencer, pague imediatamente (5 minutos) para garantir sua estadia.',
                icon: '💳',
              },
              {
                step: 5,
                title: 'Aproveite sua Viagem',
                desc: 'Receba confirmação e aproveite sua hospedagem com economia garantida.',
                icon: '✈️',
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold">
                    {item.step}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{item.icon}</span>
                    <h3 className="text-2xl font-bold font-heading">{item.title}</h3>
                  </div>
                  <p className="text-gray-700 text-lg">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Rápido */}
        <section className="mb-12 bg-blue-50 p-8 rounded-lg">
          <h2 className="text-3xl font-bold mb-6 font-heading">Perguntas Frequentes</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-bold mb-2">Como funciona o sistema de leilão?</h3>
              <p className="text-gray-700">
                Proprietários criam leilões com preço mínimo. Você coloca lances acima desse valor. 
                Quem oferecer mais quando o timer acabar, vence e precisa pagar em 5 minutos.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2">É seguro?</h3>
              <p className="text-gray-700">
                Sim! Todas as transações são protegidas. Propriedades são verificadas e pagamentos 
                são processados por gateways seguros (Stripe, Mercado Pago).
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2">Posso cancelar?</h3>
              <p className="text-gray-700">
                Sim, mas políticas de cancelamento variam por propriedade. Consulte antes de fazer o lance.
              </p>
            </div>
          </div>
          <Link href="/faq" className="inline-block mt-6 text-primary hover:underline font-semibold">
            Ver todas as perguntas →
          </Link>
        </section>

        {/* CTA */}
        <section className="text-center py-12 bg-primary text-white rounded-lg">
          <h2 className="text-3xl font-bold mb-4 font-heading">Pronto para Começar?</h2>
          <p className="text-lg mb-8">
            Junte-se a milhares de viajantes que já economizaram com a RSV360
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/register" className="btn-secondary bg-white text-primary px-8 py-4 font-bold rounded-lg hover:bg-gray-100">
              Criar Conta Grátis
            </Link>
            <Link href="/leiloes" className="btn-outline border-white text-white px-8 py-4 font-bold rounded-lg hover:bg-white hover:text-primary">
              Ver Leilões Ativos
            </Link>
          </div>
        </section>
      </article>
    </>
  );
}

