const typeDefs = `#graphql
  type Usuario {
    id: ID!
    nome: String!
    email: String!
    perfil: String!
    telefone: String
    ativo: Boolean!
    createdAt: String
    updatedAt: String
  }

  type Pet {
    id: ID!
    nome: String!
    especie: String!
    raca: String
    idade: Int!
    peso: Float!
    tutor: Usuario!
    createdAt: String
    updatedAt: String
  }

  type Agendamento {
    id: ID!
    data: String!
    horario: String!
    status: String!
    observacoes: String
    pet: Pet
    veterinario: Usuario!
    createdAt: String
    updatedAt: String
  }

  type Consulta {
    id: ID!
    pet: Pet!
    veterinario: Usuario!
    motivoConsulta: String!
    procedimentos: [String!]!
    observacoes: String
    createdAt: String
    updatedAt: String
  }

  type Vacina {
    id: ID!
    tipo: String!
    dataAplicacao: String!
    dataPrevistaReforco: String
    observacoes: String
    pet: Pet
    veterinario: Usuario
    createdAt: String
    updatedAt: String
  }

  type Query {
    me: Usuario!
    usuarios(perfil: String, nome: String): [Usuario!]!
    usuario(id: ID!): Usuario
    pets: [Pet!]!
    pet(id: ID!): Pet
    agendamentos: [Agendamento!]!
    agendamento(id: ID!): Agendamento
    consultas: [Consulta!]!
    consultasPorPet(petId: ID!): [Consulta!]!
    vacinas: [Vacina!]!
    vacinasPorPet(petId: ID!): [Vacina!]!
    lembretesVacinas(dias: Int): [Vacina!]!
  }
`;

module.exports = typeDefs;