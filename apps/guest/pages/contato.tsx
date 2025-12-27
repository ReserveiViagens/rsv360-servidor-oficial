import { useState } from 'react';
import Head from 'next/head';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { sendContactMessage } from '@shared/api/contact';

export default function ContatoPage() {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    assunto: '',
    mensagem: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      await sendContactMessage({
        name: formData.nome,
        email: formData.email,
        subject: formData.assunto,
        message: formData.mensagem,
      });

      setSubmitSuccess(true);
      setFormData({
        nome: '',
        email: '',
        assunto: '',
        mensagem: '',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar mensagem';
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Contato | RSV360 - Fale Conosco</title>
        <meta name="description" content="Entre em contato com a RSV360. Estamos aqui para ajudar você com dúvidas, sugestões ou problemas." />
        <meta name="keywords" content="contato RSV360, suporte, ajuda, fale conosco" />
        <link rel="canonical" href="https://www.reserveiviagens.com.br/contato" />
      </Head>

      <article className="container mx-auto px-4 py-12">
        <Breadcrumbs items={[{ label: 'Contato', href: '/contato' }]} />
        
        <h1 className="text-5xl font-bold mb-8 font-display">Entre em Contato</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Formulário */}
          <section>
            <h2 className="text-2xl font-bold mb-6 font-heading">Envie sua Mensagem</h2>
            
            {submitSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
                Mensagem enviada com sucesso! Entraremos em contato em breve.
              </div>
            )}

            {submitError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="nome" className="block mb-2 font-semibold">Nome</label>
                <input
                  type="text"
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label htmlFor="email" className="block mb-2 font-semibold">Email</label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label htmlFor="assunto" className="block mb-2 font-semibold">Assunto</label>
                <select
                  id="assunto"
                  value={formData.assunto}
                  onChange={(e) => setFormData({ ...formData, assunto: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Selecione...</option>
                  <option value="duvida">Dúvida</option>
                  <option value="sugestao">Sugestão</option>
                  <option value="problema">Problema</option>
                  <option value="parceria">Parceria</option>
                </select>
              </div>
              <div>
                <label htmlFor="mensagem" className="block mb-2 font-semibold">Mensagem</label>
                <textarea
                  id="mensagem"
                  value={formData.mensagem}
                  onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Enviando...' : 'Enviar Mensagem'}
              </button>
            </form>
          </section>

          {/* Informações de Contato */}
          <section>
            <h2 className="text-2xl font-bold mb-6 font-heading">Informações de Contato</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-bold mb-2 font-heading">📧 Email</h3>
                <p className="text-gray-700">support@rsv360.com</p>
                <p className="text-gray-700">contato@rsv360.com</p>
              </div>
              <div>
                <h3 className="font-bold mb-2 font-heading">📱 Telefone</h3>
                <p className="text-gray-700">+55 (XX) 99999-9999</p>
                <p className="text-sm text-gray-600">Segunda a Sexta, 9h às 18h</p>
              </div>
              <div>
                <h3 className="font-bold mb-2 font-heading">💬 Chat</h3>
                <p className="text-gray-700">Disponível 24/7 no site</p>
              </div>
              <div>
                <h3 className="font-bold mb-2 font-heading">📍 Endereço</h3>
                <p className="text-gray-700">
                  Rua Exemplo, 123<br />
                  São Paulo, SP - 01234-567
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Schema.org */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'ContactPage',
              mainEntity: {
                '@type': 'Organization',
                name: 'RSV360',
                email: 'support@rsv360.com',
                telephone: '+55-XX-99999-9999',
                address: {
                  '@type': 'PostalAddress',
                  streetAddress: 'Rua Exemplo, 123',
                  addressLocality: 'São Paulo',
                  addressRegion: 'SP',
                  postalCode: '01234-567',
                  addressCountry: 'BR',
                },
              },
            }),
          }}
        />
      </article>
    </>
  );
}

