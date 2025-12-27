import Head from 'next/head';
import { Breadcrumbs } from '../components/Breadcrumbs';

export default function TermosUsoPage() {
  return (
    <>
      <Head>
        <title>Termos de Uso | RSV360</title>
        <meta name="description" content="Termos de uso da plataforma RSV360. Leia nossos termos e condições antes de usar nossos serviços." />
        <meta name="keywords" content="termos de uso RSV360, condições, termos e condições" />
        <link rel="canonical" href="https://www.reserveiviagens.com.br/termos-uso" />
      </Head>

      <article className="container mx-auto px-4 py-12 max-w-4xl">
        <Breadcrumbs items={[{ label: 'Termos de Uso', href: '/termos-uso' }]} />
        
        <h1 className="text-5xl font-bold mb-8 font-display">Termos de Uso</h1>
        <p className="text-sm text-gray-600 mb-8">
          Última atualização: 20 de dezembro de 2025
        </p>

        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4 font-heading">1. Aceitação dos Termos</h2>
            <p className="text-gray-700 mb-4">
              Ao acessar e usar a plataforma RSV360, você concorda em cumprir e estar vinculado a estes Termos de Uso. 
              Se você não concorda com qualquer parte destes termos, não deve usar nossos serviços.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 font-heading">2. Descrição do Serviço</h2>
            <p className="text-gray-700 mb-4">
              A RSV360 é uma plataforma online que conecta proprietários de propriedades de hospedagem com viajantes 
              através de um sistema de leilões. Nós facilitamos transações, mas não somos parte do contrato entre 
              proprietários e hóspedes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 font-heading">3. Conta de Usuário</h2>
            <p className="text-gray-700 mb-4">
              Para usar nossos serviços, você deve criar uma conta fornecendo informações precisas e completas. 
              Você é responsável por manter a segurança de sua conta e senha. Todas as atividades que ocorrem 
              sob sua conta são de sua responsabilidade.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 font-heading">4. Sistema de Leilões</h2>
            <p className="text-gray-700 mb-4">
              Os leilões na plataforma funcionam da seguinte forma:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Proprietários definem um preço mínimo e duração do leilão</li>
              <li>Usuários podem colocar lances acima do preço mínimo</li>
              <li>O maior lance ao final do timer vence</li>
              <li>O vencedor deve pagar em até 5 minutos para garantir a reserva</li>
              <li>Se não pagar, o lance é cancelado e vai para o segundo lugar</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 font-heading">5. Pagamentos e Taxas</h2>
            <p className="text-gray-700 mb-4">
              Aceitamos pagamentos via cartão de crédito, PIX, débito e outros métodos disponíveis. 
              Cobramos uma taxa de serviço de 5-10% sobre o valor do lance vencedor. Todas as taxas 
              são claramente exibidas antes de você fazer um lance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 font-heading">6. Cancelamentos e Reembolsos</h2>
            <p className="text-gray-700 mb-4">
              Políticas de cancelamento variam por propriedade. Sempre consulte os termos específicos 
              antes de fazer um lance. Reembolsos seguem a política da propriedade e podem estar sujeitos 
              a taxas de cancelamento.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 font-heading">7. Responsabilidades</h2>
            <p className="text-gray-700 mb-4">
              A RSV360 atua como intermediária. Não somos responsáveis por:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Condições reais das propriedades</li>
              <li>Comportamento de proprietários ou hóspedes</li>
              <li>Problemas durante a estadia</li>
              <li>Danos a propriedades ou pertences</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 font-heading">8. Modificações dos Termos</h2>
            <p className="text-gray-700 mb-4">
              Reservamos o direito de modificar estes termos a qualquer momento. Alterações significativas 
              serão comunicadas aos usuários. O uso continuado da plataforma após mudanças constitui 
              aceitação dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 font-heading">9. Contato</h2>
            <p className="text-gray-700 mb-4">
              Para questões sobre estes termos, entre em contato conosco através de:
            </p>
            <ul className="list-none space-y-2 text-gray-700">
              <li>📧 Email: legal@rsv360.com</li>
              <li>📱 Telefone: +55 (XX) 99999-9999</li>
            </ul>
          </section>
        </div>
      </article>
    </>
  );
}

