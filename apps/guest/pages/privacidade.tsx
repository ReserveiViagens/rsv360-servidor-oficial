import Head from 'next/head';
import { Breadcrumbs } from '../components/Breadcrumbs';

export default function PrivacidadePage() {
  return (
    <>
      <Head>
        <title>Política de Privacidade | RSV360 - LGPD</title>
        <meta name="description" content="Política de privacidade da RSV360. Saiba como coletamos, usamos e protegemos seus dados pessoais em conformidade com a LGPD." />
        <meta name="keywords" content="privacidade RSV360, LGPD, proteção de dados, política privacidade" />
        <link rel="canonical" href="https://www.reserveiviagens.com.br/privacidade" />
      </Head>

      <article className="container mx-auto px-4 py-12 max-w-4xl">
        <Breadcrumbs items={[{ label: 'Privacidade', href: '/privacidade' }]} />
        
        <h1 className="text-5xl font-bold mb-8 font-display">Política de Privacidade</h1>
        <p className="text-sm text-gray-600 mb-8">
          Última atualização: 20 de dezembro de 2025
        </p>

        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4 font-heading">1. Introdução</h2>
            <p className="text-gray-700 mb-4">
              A RSV360 respeita sua privacidade e está comprometida em proteger seus dados pessoais. 
              Esta política explica como coletamos, usamos, armazenamos e protegemos suas informações 
              em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 font-heading">2. Dados que Coletamos</h2>
            <p className="text-gray-700 mb-4">
              Coletamos os seguintes tipos de dados:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Dados de Identificação:</strong> Nome, CPF, email, telefone, endereço</li>
              <li><strong>Dados de Pagamento:</strong> Informações de cartão (processadas por gateways seguros)</li>
              <li><strong>Dados de Uso:</strong> Histórico de navegação, preferências, interações</li>
              <li><strong>Dados de Localização:</strong> Quando você permite, coletamos sua localização</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 font-heading">3. Como Usamos Seus Dados</h2>
            <p className="text-gray-700 mb-4">
              Usamos seus dados para:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Processar reservas e pagamentos</li>
              <li>Comunicar sobre sua conta e reservas</li>
              <li>Melhorar nossos serviços e experiência do usuário</li>
              <li>Enviar ofertas e promoções (com seu consentimento)</li>
              <li>Cumprir obrigações legais</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 font-heading">4. Compartilhamento de Dados</h2>
            <p className="text-gray-700 mb-4">
              Compartilhamos seus dados apenas quando necessário:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Com proprietários de propriedades para processar reservas</li>
              <li>Com processadores de pagamento para transações</li>
              <li>Com prestadores de serviços que nos ajudam a operar (sempre sob contrato de confidencialidade)</li>
              <li>Quando exigido por lei ou autoridades competentes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 font-heading">5. Segurança dos Dados</h2>
            <p className="text-gray-700 mb-4">
              Implementamos medidas técnicas e organizacionais para proteger seus dados:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Criptografia SSL/TLS para transmissão de dados</li>
              <li>Armazenamento seguro em servidores protegidos</li>
              <li>Acesso restrito apenas a pessoal autorizado</li>
              <li>Monitoramento contínuo de segurança</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 font-heading">6. Seus Direitos (LGPD)</h2>
            <p className="text-gray-700 mb-4">
              Você tem direito a:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Acesso:</strong> Solicitar cópia dos seus dados</li>
              <li><strong>Correção:</strong> Atualizar dados incorretos</li>
              <li><strong>Exclusão:</strong> Solicitar remoção dos seus dados</li>
              <li><strong>Portabilidade:</strong> Receber seus dados em formato estruturado</li>
              <li><strong>Revogação:</strong> Retirar consentimento a qualquer momento</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 font-heading">7. Cookies e Tecnologias Similares</h2>
            <p className="text-gray-700 mb-4">
              Usamos cookies para melhorar sua experiência, analisar tráfego e personalizar conteúdo. 
              Você pode gerenciar preferências de cookies nas configurações do seu navegador.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 font-heading">8. Retenção de Dados</h2>
            <p className="text-gray-700 mb-4">
              Mantemos seus dados apenas pelo tempo necessário para cumprir os propósitos descritos 
              nesta política ou conforme exigido por lei. Dados de transações são mantidos por 5 anos 
              para fins contábeis e legais.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 font-heading">9. Alterações nesta Política</h2>
            <p className="text-gray-700 mb-4">
              Podemos atualizar esta política periodicamente. Notificaremos sobre mudanças significativas 
              por email ou através da plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 font-heading">10. Contato</h2>
            <p className="text-gray-700 mb-4">
              Para exercer seus direitos ou esclarecer dúvidas sobre privacidade:
            </p>
            <ul className="list-none space-y-2 text-gray-700">
              <li>📧 Email: privacidade@rsv360.com</li>
              <li>📱 Telefone: +55 (XX) 99999-9999</li>
              <li>👤 Encarregado de Dados (DPO): dpo@rsv360.com</li>
            </ul>
          </section>
        </div>
      </article>
    </>
  );
}

