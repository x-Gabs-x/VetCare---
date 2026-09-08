const typeDefs = `#graphql
  type Pet {
    id: ID!
    nome: String!
    especie: String!
    raca: String
  }

  type Veterinario {
    id: ID!
    nome: String!
    email: String
  }

  type Agendamento {
    id: ID!
    data: String!
    horario: String!
    status: String!
    observacoes: String
    pet: Pet
    veterinario: Veterinario!
  }

  type Vacina {
    id: ID!
    tipo: String!
    dataAplicacao: String!
    dataPrevistaReforco: String
    observacoes: String
    pet: Pet
    veterinario: Veterinario
  }

  type Query {
    agendamentos: [Agendamento!]!
    vacinasPorPet(petId: ID!): [Vacina!]!
    lembretesVacinas(dias: Int): [Vacina!]!
  }
`;

module.exports = typeDefs;