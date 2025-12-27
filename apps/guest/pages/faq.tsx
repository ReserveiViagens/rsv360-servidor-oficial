import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Breadcrumbs } from '../components/Breadcrumbs';

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: 'Como funciona o sistema de leilão da RSV360?',
      answer: 'O sistema de leilão permite que você coloque lances em propriedades. Cada leilão tem um preço mínimo e um timer. Quando o timer acaba, quem ofereceu o maior lance vence e precisa pagar em 5 minutos para garantir a reserva.',
    },
    {
      question: 'É seguro fazer lances e pagar na plataforma?',
      answer: 'Sim! Todas as transações são protegidas por criptografia SSL. Aceitamos pagamentos via Stripe, Mercado Pago e PIX, todos com segurança máxima. Suas informações financeiras nunca são armazenadas em nossos servidores.',
    },
    {
      question: 'Posso cancelar uma reserva feita através de leilão?',
      answer: 'Sim, mas as políticas de cancelamento variam por propriedade. Algumas permitem cancelamento gratuito até 48h antes, outras têm taxas. Sempre consulte os termos antes de fazer o lance.',
    },
    {
      question: 'O que acontece se eu vencer o leilão mas não pagar em 5 minutos?',
      answer: 'Se você não pagar no prazo de 5 minutos, seu lance é cancelado e a propriedade vai para o segundo maior lance (se houver). Por isso é importante ter seu método de pagamento pronto.',
    },
    {
      question: 'Como posso me tornar um host na plataforma?',
      answer: 'Basta criar uma conta, verificar sua identidade e listar sua propriedade. Nossa equipe fará uma verificação inicial e você poderá começar a criar leilões imediatamente.',
    },
    {
      question: 'Quais são as taxas da plataforma?',
      answer: 'Para hóspedes, cobramos uma taxa de serviço de 5-10% sobre o valor do lance vencedor. Para hosts, cobramos uma comissão de 15% sobre o valor final do leilão. Não há taxas de cadastro.',
    },
    {
      question: 'Posso participar de múltiplos leilões ao mesmo tempo?',
      answer: 'Sim! Você pode participar de quantos leilões quiser. Mas lembre-se: se vencer múltiplos leilões, precisará pagar todos em 5 minutos cada.',
    },
    {
      question: 'Como funciona o sistema de avaliações?',
      answer: 'Após sua estadia, você receberá um email pedindo para avaliar a propriedade e o host. Sua avaliação ajuda outros viajantes e melhora a experiência de todos na plataforma.',
    },
  ];

  return (
    <>
      <Head>
        <title>FAQ - Perguntas Frequentes | RSV360</title>
        <meta name="description" content="Perguntas frequentes sobre a RSV360. Tire suas dúvidas sobre leilões, pagamentos, cancelamentos e muito mais." />
        <meta name="keywords" content="FAQ RSV360, perguntas frequentes, dúvidas, ajuda" />
        <link rel="canonical" href="https://www.reserveiviagens.com.br/faq" />
      </Head>

      <article className="container mx-auto px-4 py-12">
        <Breadcrumbs items={[{ label: 'FAQ', href: '/faq' }]} />
        
        <h1 className="text-5xl font-bold mb-8 font-display">Perguntas Frequentes</h1>
        
        <p className="text-xl text-gray-600 mb-12">
          Encontre respostas para as dúvidas mais comuns sobre a RSV360
        </p>

        <div className="space-y-4 max-w-3xl">
          {faqs.map((faq, index) => (
            <div key={index} className="card p-6">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex justify-between items-center text-left"
              >
                <h3 className="text-lg font-bold font-heading">{faq.question}</h3>
                <span className="text-2xl">{openIndex === index ? '−' : '+'}</span>
              </button>
              {openIndex === index && (
                <p className="mt-4 text-gray-700">{faq.answer}</p>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <section className="mt-12 text-center bg-blue-50 p-8 rounded-lg">
          <h2 className="text-2xl font-bold mb-4 font-heading">Ainda tem dúvidas?</h2>
          <p className="text-gray-600 mb-6">
            Nossa equipe está pronta para ajudar você
          </p>
          <Link href="/contato" className="btn-primary inline-block">
            Entre em Contato
          </Link>
        </section>

        {/* Schema.org FAQPage */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faqs.map((faq) => ({
                '@type': 'Question',
                name: faq.question,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: faq.answer,
                },
              })),
            }),
          }}
        />
      </article>
    </>
  );
}

