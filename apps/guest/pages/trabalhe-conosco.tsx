import Head from 'next/head';
import { Breadcrumbs } from '../components/Breadcrumbs';

export default function TrabalheConoscoPage() {
  const vagas = [
    {
      id: 1,
      titulo: 'Senior Full Stack Engineer',
      area: 'Engenharia',
      salario: 'R$ 20K - 30K',
      modelo: 'Remoto',
      descricao: 'Arquitetar features complexas, mentoring de juniors.',
      requisitos: ['5+ anos experiência', 'Node.js', 'React', 'Docker'],
    },
    {
      id: 2,
      titulo: 'Product Manager - Travel',
      area: 'Produto',
      salario: 'R$ 15K - 25K',
      modelo: 'São Paulo',
      descricao: 'Definir roadmap, crescimento, OKRs, estratégia.',
      requisitos: ['3+ anos PM', 'Conhecimento Travel', 'Analytics', 'Growth'],
    },
    {
      id: 3,
      titulo: 'Growth Marketing Manager',
      area: 'Marketing',
      salario: 'R$ 12K - 18K',
      modelo: 'São Paulo',
      descricao: 'Campaigns, acquisition, retention, análise de dados.',
      requisitos: ['3+ anos Growth', 'GA4', 'Ads', 'Excel/Python'],
    },
  ];

  return (
    <>
      <Head>
        <title>Carreiras | RSV360 - Junte-se ao Nosso Time</title>
        <meta name="description" content="Vagas abertas em RSV360. Trabalhe com tecnologia, viagens e inovação. Benefícios premium, ambiente ágil, plano de carreira." />
        <meta name="keywords" content="carreiras RSV360, vagas, emprego, trabalhar, tech jobs" />
      </Head>

      <article className="container mx-auto px-4 py-12">
        <Breadcrumbs items={[{ label: 'Carreiras', href: '/trabalhe-conosco' }]} />
        
        <h1 className="text-5xl font-bold mb-8 font-display">Junte-se ao Nosso Time</h1>

        <section className="mb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="p-6 bg-blue-50 rounded-lg">
              <div className="text-3xl mb-2 font-bold text-primary">1000+</div>
              <p className="font-bold">Colaboradores apaixonados</p>
            </div>
            <div className="p-6 bg-green-50 rounded-lg">
              <div className="text-3xl mb-2 font-bold text-secondary">50+</div>
              <p className="font-bold">Vagas abertas agora</p>
            </div>
            <div className="p-6 bg-purple-50 rounded-lg">
              <div className="text-3xl mb-2 font-bold text-purple-600">100%</div>
              <p className="font-bold">Benefícios premiados</p>
            </div>
          </div>

          {/* Benefícios */}
          <h2 className="text-3xl font-bold mb-8 font-heading">Benefícios & Diferenciais</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="flex gap-4">
              <div className="text-3xl">💰</div>
              <div>
                <h3 className="font-bold mb-2 font-heading">Salário Competitivo</h3>
                <p className="text-gray-600">Acima da média de mercado + bônus</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-3xl">🏠</div>
              <div>
                <h3 className="font-bold mb-2 font-heading">Home Office</h3>
                <p className="text-gray-600">100% remoto ou híbrido</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-3xl">📚</div>
              <div>
                <h3 className="font-bold mb-2 font-heading">Desenvolvimento</h3>
                <p className="text-gray-600">Cursos, certificações, conferências</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-3xl">✈️</div>
              <div>
                <h3 className="font-bold mb-2 font-heading">Viajar Grátis</h3>
                <p className="text-gray-600">Desconto especial em todas leilões</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-3xl">🏥</div>
              <div>
                <h3 className="font-bold mb-2 font-heading">Saúde Completa</h3>
                <p className="text-gray-600">Medical, dental, oftalmologia</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-3xl">👨‍👩‍👧‍👦</div>
              <div>
                <h3 className="font-bold mb-2 font-heading">Família</h3>
                <p className="text-gray-600">Vale creche, auxílio filhos</p>
              </div>
            </div>
          </div>

          {/* Vagas */}
          <h2 className="text-3xl font-bold mb-8 font-heading">Vagas em Aberto</h2>
          <div className="space-y-6">
            {vagas.map((vaga) => (
              <div key={vaga.id} className="card p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-2xl font-bold font-heading">{vaga.titulo}</h3>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <span className="px-3 py-1 bg-primary-light text-primary rounded-full text-sm">
                        {vaga.area}
                      </span>
                      <span className="px-3 py-1 bg-secondary-light text-secondary rounded-full text-sm">
                        {vaga.modelo}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">{vaga.salario}</div>
                  </div>
                </div>
                <p className="text-gray-700 mb-4">{vaga.descricao}</p>
                <div className="mb-4">
                  <p className="text-sm font-semibold mb-2">O que procuramos:</p>
                  <ul className="flex gap-2 flex-wrap">
                    {vaga.requisitos.map((req) => (
                      <li key={req} className="text-sm bg-gray-100 px-3 py-1 rounded">
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
                <button className="btn-primary">Candidatar Agora</button>
              </div>
            ))}
          </div>

          {/* Processo */}
          <h2 className="text-3xl font-bold mb-8 mt-16 font-heading">Como Funciona o Processo?</h2>
          <div className="space-y-6">
            {[
              { step: 1, title: 'Candidatura Online', desc: 'Envie seu CV, LinkedIn e portfólio (se houver)' },
              { step: 2, title: 'Chamada com RH (30 min)', desc: 'Conhecer você, contar sobre a vaga, tirar dúvidas' },
              { step: 3, title: 'Entrevista Técnica/Comportamental', desc: 'Avaliar skills, case studies, fit cultural' },
              { step: 4, title: 'Oferta & Contrato', desc: 'Receber proposta, negociar e assinar' },
              { step: 5, title: 'Onboarding 2 Semanas', desc: 'Treinamento, conhecer time, primeiros projetos' },
            ].map((item) => (
              <div key={item.step} className="flex gap-6">
                <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2 font-heading">{item.title}</h3>
                  <p className="text-gray-600">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </article>
    </>
  );
}

