// Dados das principais atrações turísticas do Brasil

export interface Attraction {
  id: string
  name: string
  city: string
  state: string
  type: 'museu' | 'monumento' | 'parque_natural' | 'centro_historico' | 'mirante' | 'show' | 'tour' | 'experiencia'
  description?: string
  website?: string
  ticketTypes: TicketType[]
  hasGroupDiscount: boolean
  hasScheduledTours: boolean
  operatingHours?: {
    open: string
    close: string
    days: string[]
  }
  duration?: string // Duração média da visita
  difficulty?: 'facil' | 'moderado' | 'dificil'
  accessibility?: boolean
}

export interface TicketType {
  id: string
  name: string
  description: string
  ageGroup: 'adulto' | 'crianca' | 'idoso' | 'estudante' | 'familia'
  basePrice: number
  duration?: string
  includes?: string[]
}

export interface City {
  name: string
  state: string
  attractions: Attraction[]
}

export interface State {
  name: string
  code: string
  cities: City[]
}

// Atrações do Rio de Janeiro
export const rioDeJaneiroAttractions: Attraction[] = [
  {
    id: "cristo-redentor",
    name: "Cristo Redentor",
    city: "Rio de Janeiro",
    state: "Rio de Janeiro",
    type: "monumento",
    description: "Uma das Sete Maravilhas do Mundo Moderno",
    website: "https://www.cristoredentoroficial.com.br",
    hasGroupDiscount: true,
    hasScheduledTours: true,
    operatingHours: {
      open: "08:00",
      close: "19:00",
      days: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
    },
    duration: "2-3 horas",
    difficulty: "facil",
    accessibility: true,
    ticketTypes: [
      { id: "adulto", name: "Adulto", description: "Acima de 12 anos", ageGroup: "adulto", basePrice: 89.00, includes: ["Transporte no Trem", "Acesso ao monumento"] },
      { id: "crianca", name: "Criança", description: "6 a 11 anos", ageGroup: "crianca", basePrice: 56.00, includes: ["Transporte no Trem", "Acesso ao monumento"] },
      { id: "idoso", name: "Idoso", description: "Acima de 60 anos", ageGroup: "idoso", basePrice: 56.00, includes: ["Transporte no Trem", "Acesso ao monumento"] },
      { id: "estudante", name: "Estudante", description: "Com carteirinha", ageGroup: "estudante", basePrice: 56.00, includes: ["Transporte no Trem", "Acesso ao monumento"] }
    ]
  },
  {
    id: "pao-de-acucar",
    name: "Pão de Açúcar",
    city: "Rio de Janeiro",
    state: "Rio de Janeiro",
    type: "mirante",
    description: "Bondinho com vista panorâmica da cidade",
    website: "https://www.bondinho.com.br",
    hasGroupDiscount: true,
    hasScheduledTours: false,
    operatingHours: {
      open: "08:00",
      close: "20:00",
      days: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
    },
    duration: "1-2 horas",
    difficulty: "facil",
    accessibility: true,
    ticketTypes: [
      { id: "adulto", name: "Adulto", description: "Acima de 12 anos", ageGroup: "adulto", basePrice: 120.00, includes: ["Bondinho ida e volta", "Acesso aos mirantes"] },
      { id: "crianca", name: "Criança", description: "6 a 11 anos", ageGroup: "crianca", basePrice: 60.00, includes: ["Bondinho ida e volta", "Acesso aos mirantes"] },
      { id: "idoso", name: "Idoso", description: "Acima de 60 anos", ageGroup: "idoso", basePrice: 60.00, includes: ["Bondinho ida e volta", "Acesso aos mirantes"] }
    ]
  },
  {
    id: "museu-do-amanha",
    name: "Museu do Amanhã",
    city: "Rio de Janeiro",
    state: "Rio de Janeiro",
    type: "museu",
    description: "Museu de ciências aplicadas focado no futuro",
    website: "https://museudoamanha.org.br",
    hasGroupDiscount: true,
    hasScheduledTours: true,
    operatingHours: {
      open: "10:00",
      close: "18:00",
      days: ["Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
    },
    duration: "2-3 horas",
    difficulty: "facil",
    accessibility: true,
    ticketTypes: [
      { id: "adulto", name: "Adulto", description: "Acima de 18 anos", ageGroup: "adulto", basePrice: 30.00, includes: ["Exposição permanente", "Audioguia"] },
      { id: "estudante", name: "Estudante", description: "Com carteirinha", ageGroup: "estudante", basePrice: 15.00, includes: ["Exposição permanente", "Audioguia"] },
      { id: "crianca", name: "Criança", description: "Até 17 anos", ageGroup: "crianca", basePrice: 0.00, includes: ["Exposição permanente", "Audioguia"] }
    ]
  }
]

// Atrações de São Paulo
export const saoPauloAttractions: Attraction[] = [
  {
    id: "masp",
    name: "MASP - Museu de Arte de São Paulo",
    city: "São Paulo",
    state: "São Paulo",
    type: "museu",
    description: "Principal museu de arte do hemisfério sul",
    website: "https://masp.org.br",
    hasGroupDiscount: true,
    hasScheduledTours: true,
    operatingHours: {
      open: "10:00",
      close: "18:00",
      days: ["Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
    },
    duration: "2-3 horas",
    difficulty: "facil",
    accessibility: true,
    ticketTypes: [
      { id: "adulto", name: "Adulto", description: "Acima de 18 anos", ageGroup: "adulto", basePrice: 50.00, includes: ["Acesso às exposições", "Audioguia"] },
      { id: "estudante", name: "Estudante", description: "Com carteirinha", ageGroup: "estudante", basePrice: 25.00, includes: ["Acesso às exposições", "Audioguia"] },
      { id: "idoso", name: "Idoso", description: "Acima de 60 anos", ageGroup: "idoso", basePrice: 25.00, includes: ["Acesso às exposições", "Audioguia"] }
    ]
  },
  {
    id: "mercado-municipal",
    name: "Mercado Municipal de São Paulo",
    city: "São Paulo",
    state: "São Paulo",
    type: "centro_historico",
    description: "Mercado histórico com gastronomia típica",
    hasGroupDiscount: true,
    hasScheduledTours: true,
    operatingHours: {
      open: "06:00",
      close: "18:00",
      days: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
    },
    duration: "1-2 horas",
    difficulty: "facil",
    accessibility: true,
    ticketTypes: [
      { id: "tour-gastronomico", name: "Tour Gastronômico", description: "Degustação guiada", ageGroup: "adulto", basePrice: 85.00, duration: "2 horas", includes: ["Guia especializado", "Degustações", "História do mercado"] },
      { id: "visita-livre", name: "Visita Livre", description: "Entrada gratuita", ageGroup: "adulto", basePrice: 0.00, includes: ["Acesso livre ao mercado"] }
    ]
  },
  {
    id: "edificio-copan",
    name: "Edifício Copan",
    city: "São Paulo",
    state: "São Paulo",
    type: "centro_historico",
    description: "Ícone da arquitetura moderna brasileira",
    hasGroupDiscount: true,
    hasScheduledTours: true,
    operatingHours: {
      open: "09:00",
      close: "17:00",
      days: ["Sábado", "Domingo"]
    },
    duration: "1 hora",
    difficulty: "facil",
    accessibility: false,
    ticketTypes: [
      { id: "tour-arquitetonico", name: "Tour Arquitetônico", description: "Visita guiada", ageGroup: "adulto", basePrice: 40.00, duration: "1 hora", includes: ["Guia especializado", "História da arquitetura", "Acesso às áreas comuns"] }
    ]
  }
]

// Atrações de Minas Gerais
export const minasGeraisAttractions: Attraction[] = [
  {
    id: "ouro-preto-centro-historico",
    name: "Centro Histórico de Ouro Preto",
    city: "Ouro Preto",
    state: "Minas Gerais",
    type: "centro_historico",
    description: "Patrimônio Mundial da UNESCO",
    hasGroupDiscount: true,
    hasScheduledTours: true,
    operatingHours: {
      open: "08:00",
      close: "18:00",
      days: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
    },
    duration: "4-6 horas",
    difficulty: "moderado",
    accessibility: false,
    ticketTypes: [
      { id: "city-tour", name: "City Tour Completo", description: "Principais pontos turísticos", ageGroup: "adulto", basePrice: 120.00, duration: "6 horas", includes: ["Guia credenciado", "Transporte", "Igrejas históricas", "Museus"] },
      { id: "walking-tour", name: "Walking Tour", description: "Caminhada pelo centro", ageGroup: "adulto", basePrice: 60.00, duration: "3 horas", includes: ["Guia local", "Principais igrejas", "Casa dos Contos"] }
    ]
  },
  {
    id: "inhotim",
    name: "Instituto Inhotim",
    city: "Brumadinho",
    state: "Minas Gerais",
    type: "museu",
    description: "Maior museu a céu aberto do mundo",
    website: "https://www.inhotim.org.br",
    hasGroupDiscount: true,
    hasScheduledTours: true,
    operatingHours: {
      open: "09:30",
      close: "16:30",
      days: ["Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
    },
    duration: "6-8 horas",
    difficulty: "moderado",
    accessibility: true,
    ticketTypes: [
      { id: "adulto", name: "Adulto", description: "Acima de 18 anos", ageGroup: "adulto", basePrice: 50.00, includes: ["Acesso às galerias", "Jardim botânico", "Transporte interno"] },
      { id: "estudante", name: "Estudante", description: "Com carteirinha", ageGroup: "estudante", basePrice: 25.00, includes: ["Acesso às galerias", "Jardim botânico", "Transporte interno"] },
      { id: "idoso", name: "Idoso", description: "Acima de 60 anos", ageGroup: "idoso", basePrice: 25.00, includes: ["Acesso às galerias", "Jardim botânico", "Transporte interno"] }
    ]
  }
]

// Atrações da Bahia
export const bahiaAttractions: Attraction[] = [
  {
    id: "pelourinho",
    name: "Pelourinho",
    city: "Salvador",
    state: "Bahia",
    type: "centro_historico",
    description: "Centro histórico de Salvador, Patrimônio da UNESCO",
    hasGroupDiscount: true,
    hasScheduledTours: true,
    operatingHours: {
      open: "08:00",
      close: "22:00",
      days: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
    },
    duration: "3-4 horas",
    difficulty: "facil",
    accessibility: false,
    ticketTypes: [
      { id: "tour-historico", name: "Tour Histórico", description: "História e cultura baiana", ageGroup: "adulto", basePrice: 80.00, duration: "3 horas", includes: ["Guia local", "Igrejas históricas", "Casa de Jorge Amado", "Fundação Casa de Jorge Amado"] },
      { id: "tour-gastronomico", name: "Tour Gastronômico", description: "Sabores da Bahia", ageGroup: "adulto", basePrice: 120.00, duration: "4 horas", includes: ["Guia gastronômico", "Degustações", "Acarajé", "Mercado Modelo"] }
    ]
  },
  {
    id: "elevador-lacerda",
    name: "Elevador Lacerda",
    city: "Salvador",
    state: "Bahia",
    type: "monumento",
    description: "Primeiro elevador urbano do Brasil",
    hasGroupDiscount: false,
    hasScheduledTours: false,
    operatingHours: {
      open: "06:00",
      close: "23:30",
      days: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
    },
    duration: "30 minutos",
    difficulty: "facil",
    accessibility: true,
    ticketTypes: [
      { id: "passagem", name: "Passagem", description: "Ida e volta", ageGroup: "adulto", basePrice: 0.15, includes: ["Transporte Cidade Alta/Baixa"] }
    ]
  }
]

// Estados do Brasil com atrações
export const brazilStatesWithAttractions: State[] = [
  {
    name: "Rio de Janeiro",
    code: "RJ",
    cities: [
      {
        name: "Rio de Janeiro",
        state: "Rio de Janeiro",
        attractions: rioDeJaneiroAttractions
      }
    ]
  },
  {
    name: "São Paulo",
    code: "SP",
    cities: [
      {
        name: "São Paulo",
        state: "São Paulo",
        attractions: saoPauloAttractions
      }
    ]
  },
  {
    name: "Minas Gerais",
    code: "MG",
    cities: [
      {
        name: "Ouro Preto",
        state: "Minas Gerais",
        attractions: minasGeraisAttractions.filter(a => a.city === "Ouro Preto")
      },
      {
        name: "Brumadinho",
        state: "Minas Gerais",
        attractions: minasGeraisAttractions.filter(a => a.city === "Brumadinho")
      }
    ]
  },
  {
    name: "Bahia",
    code: "BA",
    cities: [
      {
        name: "Salvador",
        state: "Bahia",
        attractions: bahiaAttractions
      }
    ]
  }
]

// Funções utilitárias
export function getAllAttractions(): Attraction[] {
  return brazilStatesWithAttractions.flatMap(state => 
    state.cities.flatMap(city => city.attractions)
  )
}

export function getAttractionsByCity(cityName: string): Attraction[] {
  for (const state of brazilStatesWithAttractions) {
    const city = state.cities.find(c => c.name === cityName)
    if (city) return city.attractions
  }
  return []
}

export function getAttractionsByState(stateName: string): Attraction[] {
  const state = brazilStatesWithAttractions.find(s => s.name === stateName)
  return state ? state.cities.flatMap(city => city.attractions) : []
}

export function getAttractionsByType(type: Attraction['type']): Attraction[] {
  return getAllAttractions().filter(attraction => attraction.type === type)
}

export function searchAttractions(query: string): Attraction[] {
  const lowerCaseQuery = query.toLowerCase()
  return getAllAttractions().filter(attraction =>
    attraction.name.toLowerCase().includes(lowerCaseQuery) ||
    attraction.city.toLowerCase().includes(lowerCaseQuery) ||
    attraction.state.toLowerCase().includes(lowerCaseQuery) ||
    attraction.description?.toLowerCase().includes(lowerCaseQuery)
  )
}

export function getAttractionById(id: string): Attraction | undefined {
  return getAllAttractions().find(attraction => attraction.id === id)
}

// Tipos de atrações para filtros
export const attractionTypes = [
  { value: 'museu', label: '🏛️ Museu', description: 'Museus de arte, história e ciência' },
  { value: 'monumento', label: '🗿 Monumento', description: 'Monumentos históricos e marcos' },
  { value: 'parque_natural', label: '🌳 Parque Natural', description: 'Parques e reservas naturais' },
  { value: 'centro_historico', label: '🏘️ Centro Histórico', description: 'Centros históricos e patrimônios' },
  { value: 'mirante', label: '🏔️ Mirante', description: 'Mirantes e pontos de vista' },
  { value: 'show', label: '🎭 Show', description: 'Espetáculos e apresentações' },
  { value: 'tour', label: '🚌 Tour', description: 'Tours e passeios guiados' },
  { value: 'experiencia', label: '🎯 Experiência', description: 'Experiências únicas e interativas' }
] as const
