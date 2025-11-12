/**
 * 🧠 CHAIN OF THOUGHT: Script de Migração de Dados do Website
 * 🦴 SKELETON OF THOUGHT: Extrair → Transformar → Carregar (ETL)
 * 🌳 TREE OF THOUGHT: Prioridade: Hotéis > Promoções > Atrações > Configurações
 * ✅ SELF CONSISTENCY: Validar dados após inserção
 */

const { db } = require("../src/config/database");

// 📊 DADOS EXTRAÍDOS DO SITE Hotel-com-melhor-preco-main
const hotelData = [
  {
    content_id: "spazzio-diroma",
    title: "Spazzio DiRoma",
    description:
      "Conforto e lazer completo com a qualidade diRoma. Piscinas termais naturais e estrutura completa para toda família.",
    images: [
      "/images/spazzio-diroma-hotel.jpg",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/reservei%20Viagens%20%281%29.jpg-7DhCDbMcNkgFfxxptkCNaraAWv9kQ7.jpeg",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/reservei%20Viagens%20%282%29.jpg-MjqWbBqajq4aJnz0SdR4sDrHr11Jv7.jpeg",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/reservei%20Viagens%20%2817%29.jpg-fcutcCanqZ9PdfdfCwPmYr0rkw3jjo.jpeg",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/reservei%20Viagens%20%2814%29.jpg-L1a1WYSclQgw2LQl4C3FbR5AhMaYMS.jpeg",
    ],
    metadata: {
      stars: 4,
      price: 250,
      originalPrice: 312.5,
      discount: 20,
      features: [
        "Piscinas Termais",
        "Acqua Park",
        "Restaurante",
        "Wi-Fi Gratuito",
        "Estacionamento",
      ],
      location: "Centro de Caldas Novas",
      capacity: "4 pessoas",
    },
    seo_data: {
      title: "Spazzio DiRoma - Hotel com Piscinas Termais em Caldas Novas",
      description:
        "Reserve o Spazzio DiRoma com 20% de desconto. Piscinas termais naturais, Acqua Park e estrutura completa.",
      keywords: [
        "hotel caldas novas",
        "piscinas termais",
        "acqua park",
        "diroma",
      ],
    },
    order_index: 1,
  },
  {
    content_id: "piazza-diroma",
    title: "Piazza DiRoma",
    description:
      "Sofisticação e acesso privilegiado aos parques diRoma. Arquitetura italiana e serviços premium.",
    images: [
      "/images/piazza-diroma-hotel.jpg",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Piazza%20Didroma%20reservei%20Viagens%20%286%29.jpg-34SGE3Ulyc1owoVthnaoD8TTKMsPh7.jpeg",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Piazza%20Didroma%20reservei%20Viagens%20%2829%29.jpg-gyJlNgGgJrvyWQm5cHWsoqQYr4819K.jpeg",
    ],
    metadata: {
      stars: 5,
      price: 260,
      originalPrice: 325,
      discount: 20,
      features: [
        "Arquitetura Italiana",
        "Spa Premium",
        "Piscinas Exclusivas",
        "Restaurante Gourmet",
        "Concierge",
      ],
      location: "Área Nobre - Caldas Novas",
      capacity: "4 pessoas",
    },
    seo_data: {
      title: "Piazza DiRoma - Hotel 5 Estrelas com Arquitetura Italiana",
      description:
        "Luxo e sofisticação no Piazza DiRoma. Spa premium, piscinas exclusivas e arquitetura italiana única.",
      keywords: [
        "hotel 5 estrelas",
        "arquitetura italiana",
        "spa premium",
        "caldas novas luxo",
      ],
    },
    order_index: 2,
  },
  {
    content_id: "lacqua-diroma",
    title: "Lacqua DiRoma",
    description:
      "Parque aquático exclusivo e diversão para toda a família. Toboáguas e piscinas de ondas incríveis.",
    images: [
      "/images/lacqua-diroma-hotel.png",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/184981043%20%281%29-I2iuBzXMrj8RLrl2o2tI55osVahFhB.jpeg",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/184981048-bOYk2CDC50epvKbMqur42WwuJY3KFa.jpeg",
    ],
    metadata: {
      stars: 4,
      price: 440,
      originalPrice: 550,
      discount: 20,
      features: [
        "Jardins Acqua Park",
        "Piscinas de Ondas",
        "Toboáguas",
        "Ofurôs",
        "Kids Club",
      ],
      location: "Próximo ao Centro",
      capacity: "4 pessoas",
    },
    seo_data: {
      title: "Lacqua DiRoma - Hotel com Parque Aquático Exclusivo",
      description:
        "Diversão garantida no Lacqua DiRoma. Parque aquático, toboáguas e piscinas de ondas para toda família.",
      keywords: [
        "parque aquático",
        "toboáguas",
        "piscinas de ondas",
        "família caldas novas",
      ],
    },
    order_index: 3,
  },
  {
    content_id: "diroma-fiori",
    title: "DiRoma Fiori",
    description:
      "Hotel aconchegante com piscinas termais e tranquilidade. Perfeito para relaxar em família.",
    images: [
      "/images/diroma-fiori-hotel.jpeg",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/reserveiviagens%20%2825%29.jpg-AqUPM5y6756BhEMFxJMJ8b8tPzW9OB.jpeg",
    ],
    metadata: {
      stars: 3,
      price: 407,
      originalPrice: 508.75,
      discount: 20,
      features: [
        "Ambiente Familiar",
        "Piscinas Termais",
        "Sauna",
        "Jardins",
        "Playground",
      ],
      location: "Zona Residencial",
      capacity: "5 pessoas",
    },
    seo_data: {
      title: "DiRoma Fiori - Hotel Familiar com Piscinas Termais",
      description:
        "Tranquilidade e conforto no DiRoma Fiori. Ambiente familiar, piscinas termais e jardins relaxantes.",
      keywords: [
        "hotel familiar",
        "piscinas termais",
        "tranquilidade",
        "jardins",
      ],
    },
    order_index: 4,
  },
  {
    content_id: "lagoa-eco-towers",
    title: "Lagoa Eco Towers",
    description:
      "Luxo e sustentabilidade em Caldas Novas. Torres ecológicas com vista panorâmica e serviços premium.",
    images: [
      "/images/lagoa-eco-towers-hotel.jpeg",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/reservei%20lagoa%20eco%20towers.jpg-eflMoZcTLPAcWwsw2jeNXRi7xiNkHe.jpeg",
    ],
    metadata: {
      stars: 5,
      price: 850,
      originalPrice: 1062.5,
      discount: 20,
      features: [
        "Torres Ecológicas",
        "Vista Panorâmica",
        "Spa Completo",
        "Gastronomia Premium",
        "Sustentabilidade",
      ],
      location: "Área Premium",
      capacity: "7 pessoas",
    },
    seo_data: {
      title: "Lagoa Eco Towers - Hotel Ecológico Premium em Caldas Novas",
      description:
        "Sustentabilidade e luxo nas Torres Ecológicas. Vista panorâmica, spa completo e gastronomia premium.",
      keywords: [
        "hotel ecológico",
        "sustentabilidade",
        "vista panorâmica",
        "spa completo",
        "premium",
      ],
    },
    order_index: 5,
  },
];

// 🎯 DADOS DE PROMOÇÕES MOCKADAS
const promotionsData = [
  {
    content_id: "promocao-especial-verao",
    title: "🔥 Ofertas Exclusivas de Verão!",
    description:
      "Até 20% OFF + Estacionamento GRÁTIS em todos os hotéis. Por tempo limitado!",
    images: ["/images/promocao-verao.jpg"],
    metadata: {
      discount: 20,
      benefits: ["20% desconto", "Estacionamento grátis", "Check-in flexível"],
      validUntil: "2025-03-31",
      featured: true,
    },
    seo_data: {
      title: "Promoção de Verão - 20% OFF em Hotéis de Caldas Novas",
      description:
        "Aproveite 20% de desconto e estacionamento grátis. Ofertas por tempo limitado!",
      keywords: ["promoção caldas novas", "20% desconto", "ofertas hotéis"],
    },
    order_index: 1,
  },
];

// 🎢 DADOS DE ATRAÇÕES MOCKADAS
const attractionsData = [
  {
    content_id: "parque-das-aguas",
    title: "Parque das Águas Quentes",
    description:
      "O maior complexo de piscinas termais de Caldas Novas. Diversão para toda família com águas naturalmente aquecidas.",
    images: ["/images/parque-das-aguas.jpg"],
    metadata: {
      price: 50,
      type: "parque_aquatico",
      features: ["Piscinas termais", "Toboáguas", "Área kids", "Restaurante"],
      location: "Centro de Caldas Novas",
      hours: "08:00 - 18:00",
    },
    seo_data: {
      title: "Parque das Águas - Maior Complexo de Piscinas Termais",
      description:
        "Diversão garantida no Parque das Águas. Piscinas termais naturais e atrações para toda família.",
      keywords: [
        "parque das águas",
        "piscinas termais",
        "caldas novas",
        "águas quentes",
      ],
    },
    order_index: 1,
  },
];

// ⚙️ CONFIGURAÇÕES DO SITE
const settingsData = [
  {
    setting_key: "site_info",
    setting_value: {
      title: "Reservei Viagens",
      tagline: "Parques, Hotéis & Atrações em Caldas Novas",
      description:
        "Especialistas em turismo em Caldas Novas. Os melhores hotéis, pacotes e atrações com desconto especial.",
    },
    description: "Informações básicas do site",
  },
  {
    setting_key: "contact_info",
    setting_value: {
      phones: [
        "(64) 99319-7555",
        "(64) 99306-8752",
        "(65) 99235-1207",
        "(65) 99204-8814",
      ],
      email: "reservas@reserveiviagens.com.br",
      whatsapp: "5564993197555",
      address: "Rua RP5, Residencial Primavera 2, Caldas Novas, GO",
      filial: "Av. Manoel José de Arruda, Porto, Cuiabá, MT",
      fixo: "(65) 2127-0415",
      hours: "Seg-Sex 8h-18h, Sáb 8h-12h",
    },
    description: "Dados de contato da empresa",
  },
  {
    setting_key: "social_media",
    setting_value: {
      facebook: "facebook.com/comercialreservei",
      instagram: "@reserveiviagens",
      website: "reserveiviagens.com.br",
    },
    description: "Redes sociais e website",
  },
  {
    setting_key: "seo_global",
    setting_value: {
      title: "Reservei Viagens - Hotéis e Atrações em Caldas Novas",
      description:
        "Especialista em turismo em Caldas Novas. Hotéis com desconto, pacotes promocionais e as melhores atrações.",
      keywords: [
        "caldas novas",
        "hotéis caldas novas",
        "piscinas termais",
        "reservei viagens",
        "turismo goiás",
      ],
      og_image: "/images/og-reservei-viagens.jpg",
    },
    description: "Configurações SEO globais",
  },
];

/**
 * 🚀 FUNÇÃO PRINCIPAL DE MIGRAÇÃO
 */
async function migrateWebsiteData() {
  console.log("🧠 INICIANDO MIGRAÇÃO COM CHAIN OF THOUGHT");
  console.log("🦴 SKELETON: Configurações → Hotéis → Promoções → Atrações");

  try {
    // 🔄 STEP 1: Limpar dados existentes
    console.log("\n📋 Limpando dados existentes...");
    await db("website_content").del();
    await db("website_settings").del();

    // 🔄 STEP 2: Inserir configurações
    console.log("\n⚙️ Inserindo configurações do site...");
    for (const setting of settingsData) {
      await db("website_settings").insert({
        setting_key: setting.setting_key,
        setting_value: JSON.stringify(setting.setting_value),
        description: setting.description,
        updated_at: new Date(),
      });
      console.log(`✅ Configuração "${setting.setting_key}" inserida`);
    }

    // 🔄 STEP 3: Inserir hotéis
    console.log("\n🏨 Inserindo dados de hotéis...");
    for (const hotel of hotelData) {
      await db("website_content").insert({
        page_type: "hotels",
        content_id: hotel.content_id,
        title: hotel.title,
        description: hotel.description,
        images: JSON.stringify(hotel.images),
        metadata: JSON.stringify(hotel.metadata),
        seo_data: JSON.stringify(hotel.seo_data),
        status: "active",
        order_index: hotel.order_index,
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log(`✅ Hotel "${hotel.title}" inserido`);
    }

    // 🔄 STEP 4: Inserir promoções
    console.log("\n🔥 Inserindo promoções...");
    for (const promo of promotionsData) {
      await db("website_content").insert({
        page_type: "promotions",
        content_id: promo.content_id,
        title: promo.title,
        description: promo.description,
        images: JSON.stringify(promo.images),
        metadata: JSON.stringify(promo.metadata),
        seo_data: JSON.stringify(promo.seo_data),
        status: "active",
        order_index: promo.order_index,
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log(`✅ Promoção "${promo.title}" inserida`);
    }

    // 🔄 STEP 5: Inserir atrações
    console.log("\n🎢 Inserindo atrações...");
    for (const attraction of attractionsData) {
      await db("website_content").insert({
        page_type: "attractions",
        content_id: attraction.content_id,
        title: attraction.title,
        description: attraction.description,
        images: JSON.stringify(attraction.images),
        metadata: JSON.stringify(attraction.metadata),
        seo_data: JSON.stringify(attraction.seo_data),
        status: "active",
        order_index: attraction.order_index,
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log(`✅ Atração "${attraction.title}" inserida`);
    }

    // ✅ STEP 6: SELF CONSISTENCY - Validação
    console.log("\n🎯 SELF CONSISTENCY - Validando dados inseridos...");

    const hotelCount = await db("website_content")
      .where("page_type", "hotels")
      .count("* as total");
    const promotionCount = await db("website_content")
      .where("page_type", "promotions")
      .count("* as total");
    const attractionCount = await db("website_content")
      .where("page_type", "attractions")
      .count("* as total");
    const settingsCount = await db("website_settings").count("* as total");

    console.log(`📊 RESULTADOS:`);
    console.log(`   🏨 Hotéis: ${hotelCount[0].total} registros`);
    console.log(`   🔥 Promoções: ${promotionCount[0].total} registros`);
    console.log(`   🎢 Atrações: ${attractionCount[0].total} registros`);
    console.log(`   ⚙️ Configurações: ${settingsCount[0].total} registros`);

    console.log("\n🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!");
    console.log(
      "🧠 CHAIN OF THOUGHT aplicado: Análise → Transformação → Carregamento → Validação",
    );
  } catch (error) {
    console.error("❌ Erro durante a migração:", error);
    throw error;
  }
}

/**
 * 🏃‍♂️ EXECUTAR SE CHAMADO DIRETAMENTE
 */
if (require.main === module) {
  migrateWebsiteData()
    .then(() => {
      console.log("\n✅ Script de migração finalizado");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Falha na migração:", error);
      process.exit(1);
    });
}

module.exports = { migrateWebsiteData };
