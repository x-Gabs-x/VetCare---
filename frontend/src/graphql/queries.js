import { gql } from '@apollo/client';

export const GET_PETS = gql`
  query GetPets {
    pets {
      id
      nome
      especie
      raca
      idade
      peso
      tutor {
        id
        nome
        email
      }
      createdAt
    }
  }
`;

export const GET_USUARIOS = gql`
  query GetUsuarios {
    usuarios {
      id
      nome
      email
      perfil
      telefone
      ativo
      createdAt
    }
  }
`;

export const GET_PET = gql`
  query GetPet($id: ID!) {
    pet(id: $id) {
      id
      nome
      especie
      raca
      idade
      peso
      tutor {
        id
        nome
        email
        telefone
      }
      createdAt
      updatedAt
    }
  }
`;

export const GET_CONSULTAS = gql`
  query GetConsultas {
    consultas {
      id
      motivoConsulta
      procedimentos
      observacoes
      createdAt
      pet {
        id
        nome
        especie
        raca
        idade
        peso
      }
      veterinario {
        id
        nome
        perfil
      }
    }
  }
`;

export const GET_CONSULTAS_POR_PET = gql`
  query GetConsultasPorPet($petId: ID!) {
    consultasPorPet(petId: $petId) {
      id
      motivoConsulta
      procedimentos
      observacoes
      createdAt
      veterinario {
        id
        nome
        perfil
      }
      pet {
        id
        nome
        especie
        raca
      }
    }
  }
`;

export const GET_VACINAS_POR_PET = gql`
  query GetVacinasPorPet($petId: ID!) {
    vacinasPorPet(petId: $petId) {
      id
      tipo
      dataAplicacao
      dataPrevistaReforco
      observacoes
      veterinario {
        id
        nome
      }
      pet {
        id
        nome
      }
    }
  }
`;
