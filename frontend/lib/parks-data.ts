// Dados dos principais parques temáticos do Brasil

export interface Park {
  id: string
  name: string
  city: string
  state: string
  type: 'aquatico' | 'tematico' | 'aventura' | 'zoologico' | 'diversoes'
  description?: string
  website?: string
  ticketTypes: TicketType[]
  fastPassAvailable: boolean
  groupDiscounts: boolean
}

export interface TicketType {
  id: string
  name: string
  description: string
  ageGroup: 'adulto' | 'crianca' | 'idoso' | 'estudante' | 'familia'
  basePrice: number
  validityDays?: number
}

export interface City {
  name: string
  state: string
  parks: Park[]
}

export interface State {
  name: string
  code: string
  cities: City[]
}

// Parques de São Paulo
export const saoPauloParks: Park[] = [
  {
    id: "playcenter",
    name: "Playcenter",
    city: "São Paulo",
    state: "São Paulo",
    type: "diversoes",
    description: "Tradicional parque de diversões paulistano",
    website: "https://www.playcenter.com.br",
    fastPassAvailable: true,
    groupDiscounts: true,
    ticketTypes: [
      { id: "adulto", name: "Adulto", description: "Acima de 12 anos", ageGroup: "adulto", basePrice: 89.90 },
      { id: "crianca", name: "Criança", description: "3 a 11 anos", ageGroup: "crianca", basePrice: 69.90 },
      { id: "idoso", name: "Idoso", description: "Acima de 60 anos", ageGroup: "idoso", basePrice: 44.90 },
      { id: "familia", name: "Família", description: "2 adultos + 2 crianças", ageGroup: "familia", basePrice: 299.90 }
    ]
  },
  {
    id: "hopi-hari",
    name: "Hopi Hari",
    city: "Vinhedo",
    state: "São Paulo",
    type: "tematico",
    description: "Maior parque temático da América Latina",
    website: "https://www.hopihari.com.br",
    fastPassAvailable: true,
    groupDiscounts: true,
    ticketTypes: [
      { id: "adulto", name: "Adulto", description: "Acima de 12 anos", ageGroup: "adulto", basePrice: 119.90 },
      { id: "crianca", name: "Criança", description: "3 a 11 anos", ageGroup: "crianca", basePrice: 89.90 },
      { id: "idoso", name: "Idoso", description: "Acima de 60 anos", ageGroup: "idoso", basePrice: 59.90 },
      { id: "estudante", name: "Estudante", description: "Com carteirinha", ageGroup: "estudante", basePrice: 79.90 }
    ]
  },
  {
    id: "wet-n-wild",
    name: "Wet'n Wild",
    city: "Itupeva",
    state: "São Paulo",
    type: "aquatico",
    description: "Parque aquático com toboáguas radicais",
    website: "https://www.wetnwild.com.br",
    fastPassAvailable: false,
    groupDiscounts: true,
    ticketTypes: [
      { id: "adulto", name: "Adulto", description: "Acima de 12 anos", ageGroup: "adulto", basePrice: 99.90 },
      { id: "crianca", name: "Criança", description: "3 a 11 anos", ageGroup: "crianca", basePrice: 79.90 },
      { id: "idoso", name: "Idoso", description: "Acima de 60 anos", ageGroup: "idoso", basePrice: 49.90 }
    ]
  }
]

// Parques do Rio de Janeiro
export const rioDeJaneiroParks: Park[] = [
  {
    id: "terra-encantada",
    name: "Terra Encantada",
    city: "Rio de Janeiro",
    state: "Rio de Janeiro",
    type: "tematico",
    description: "Parque temático com atrações para toda família",
    fastPassAvailable: true,
    groupDiscounts: true,
    ticketTypes: [
      { id: "adulto", name: "Adulto", description: "Acima de 12 anos", ageGroup: "adulto", basePrice: 79.90 },
      { id: "crianca", name: "Criança", description: "3 a 11 anos", ageGroup: "crianca", basePrice: 59.90 },
      { id: "idoso", name: "Idoso", description: "Acima de 60 anos", ageGroup: "idoso", basePrice: 39.90 }
    ]
  },
  {
    id: "rio-water-planet",
    name: "Rio Water Planet",
    city: "Rio de Janeiro",
    state: "Rio de Janeiro",
    type: "aquatico",
    description: "Maior parque aquático da América Latina",
    fastPassAvailable: false,
    groupDiscounts: true,
    ticketTypes: [
      { id: "adulto", name: "Adulto", description: "Acima de 12 anos", ageGroup: "adulto", basePrice: 109.90 },
      { id: "crianca", name: "Criança", description: "3 a 11 anos", ageGroup: "crianca", basePrice: 89.90 },
      { id: "idoso", name: "Idoso", description: "Acima de 60 anos", ageGroup: "idoso", basePrice: 54.90 }
    ]
  }
]

// Parques de Santa Catarina
export const santaCatarinaParks: Park[] = [
  {
    id: "beto-carrero-world",
    name: "Beto Carrero World",
    city: "Penha",
    state: "Santa Catarina",
    type: "tematico",
    description: "Maior parque temático da América Latina",
    website: "https://www.betocarrero.com.br",
    fastPassAvailable: true,
    groupDiscounts: true,
    ticketTypes: [
      { id: "adulto", name: "Adulto", description: "Acima de 12 anos", ageGroup: "adulto", basePrice: 149.90, validityDays: 1 },
      { id: "crianca", name: "Criança", description: "3 a 11 anos", ageGroup: "crianca", basePrice: 119.90, validityDays: 1 },
      { id: "idoso", name: "Idoso", description: "Acima de 60 anos", ageGroup: "idoso", basePrice: 74.90, validityDays: 1 },
      { id: "passaporte-2dias", name: "Passaporte 2 Dias", description: "Válido por 2 dias", ageGroup: "adulto", basePrice: 239.90, validityDays: 2 }
    ]
  }
]

// Parques do Ceará
export const cearaParks: Park[] = [
  {
    id: "beach-park",
    name: "Beach Park",
    city: "Aquiraz",
    state: "Ceará",
    type: "aquatico",
    description: "Complexo turístico com parque aquático",
    website: "https://www.beachpark.com.br",
    fastPassAvailable: true,
    groupDiscounts: true,
    ticketTypes: [
      { id: "adulto", name: "Adulto", description: "Acima de 12 anos", ageGroup: "adulto", basePrice: 129.90 },
      { id: "crianca", name: "Criança", description: "3 a 11 anos", ageGroup: "crianca", basePrice: 99.90 },
      { id: "idoso", name: "Idoso", description: "Acima de 60 anos", ageGroup: "idoso", basePrice: 64.90 }
    ]
  }
]

// Estados do Brasil com parques
export const brazilStatesWithParks: State[] = [
  {
    name: "São Paulo",
    code: "SP",
    cities: [
      {
        name: "São Paulo",
        state: "São Paulo",
        parks: saoPauloParks.filter(p => p.city === "São Paulo")
      },
      {
        name: "Vinhedo",
        state: "São Paulo", 
        parks: saoPauloParks.filter(p => p.city === "Vinhedo")
      },
      {
        name: "Itupeva",
        state: "São Paulo",
        parks: saoPauloParks.filter(p => p.city === "Itupeva")
      }
    ]
  },
  {
    name: "Rio de Janeiro",
    code: "RJ",
    cities: [
      {
        name: "Rio de Janeiro",
        state: "Rio de Janeiro",
        parks: rioDeJaneiroParks
      }
    ]
  },
  {
    name: "Santa Catarina",
    code: "SC",
    cities: [
      {
        name: "Penha",
        state: "Santa Catarina",
        parks: santaCatarinaParks
      }
    ]
  },
  {
    name: "Ceará",
    code: "CE",
    cities: [
      {
        name: "Aquiraz",
        state: "Ceará",
        parks: cearaParks
      }
    ]
  }
]

// Funções utilitárias
export function getAllParks(): Park[] {
  return brazilStatesWithParks.flatMap(state => 
    state.cities.flatMap(city => city.parks)
  )
}

export function getParksByCity(cityName: string): Park[] {
  for (const state of brazilStatesWithParks) {
    const city = state.cities.find(c => c.name === cityName)
    if (city) return city.parks
  }
  return []
}

export function getParksByState(stateName: string): Park[] {
  const state = brazilStatesWithParks.find(s => s.name === stateName)
  return state ? state.cities.flatMap(city => city.parks) : []
}

export function getParksByType(type: Park['type']): Park[] {
  return getAllParks().filter(park => park.type === type)
}

export function searchParks(query: string): Park[] {
  const lowerCaseQuery = query.toLowerCase()
  return getAllParks().filter(park =>
    park.name.toLowerCase().includes(lowerCaseQuery) ||
    park.city.toLowerCase().includes(lowerCaseQuery) ||
    park.state.toLowerCase().includes(lowerCaseQuery) ||
    park.description?.toLowerCase().includes(lowerCaseQuery)
  )
}

export function getParkById(id: string): Park | undefined {
  return getAllParks().find(park => park.id === id)
}

// Tipos de parques para filtros
export const parkTypes = [
  { value: 'tematico', label: '🎢 Temático', description: 'Parques com temas específicos e montanhas-russas' },
  { value: 'aquatico', label: '🏊 Aquático', description: 'Parques com piscinas e toboáguas' },
  { value: 'diversoes', label: '🎠 Diversões', description: 'Parques tradicionais de diversões' },
  { value: 'aventura', label: '🧗 Aventura', description: 'Parques com atividades radicais' },
  { value: 'zoologico', label: '🦁 Zoológico', description: 'Zoológicos e safáris' }
] as const
