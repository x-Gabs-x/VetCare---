export const fallbackPets = [
  {
    id: 'pet-001',
    nome: 'Pipoca',
    especie: 'Gato',
    raca: 'Siamês',
    idade: 4,
    peso: 3.8,
    tutor: {
      id: 'tutor-001',
      nome: 'Maria Fernandes',
      email: 'maria.fernandes@email.com',
    },
    createdAt: '2024-01-14T10:00:00.000Z',
  },
];

export const fallbackConsultas = [
  {
    id: 'consulta-001',
    motivoConsulta: 'Avaliação dermatológica e auricular',
    procedimentos: [
      'Otoscopia bilateral completa',
      'Coleta de exsudato auricular para citologia',
      'Limpeza de canal auditivo com solução fisiológica',
      'Prescrição de tratamento com colírio e anti-inflamatório',
    ],
    observacoes:
      'Paciente apresenta prurido leve, sem sinais de inflamação intensa. Mantém boa resposta ao tratamento e sem sinais de dor aguda.',
    createdAt: '2024-11-05T15:30:00.000Z',
    pet: {
      id: 'pet-001',
      nome: 'Pipoca',
      especie: 'Gato',
      raca: 'Siamês',
      idade: 4,
      peso: 3.8,
    },
    veterinario: {
      id: 'vet-001',
      nome: 'Dra. Camila Torres',
      perfil: 'veterinario',
    },
  },
  {
    id: 'consulta-002',
    motivoConsulta: 'Controle pós-operatório e avaliação geral',
    procedimentos: [
      'Exame físico completo',
      'Aferição de sinais vitais',
      'Reavaliação de lesões cutâneas',
      'Prescrição de antialérgico e acompanhamento',
    ],
    observacoes:
      'Sem sinais de febre e com evolução favorável. O paciente está mais tranquilo, sem episódios de coceira frequentes.',
    createdAt: '2024-10-18T13:20:00.000Z',
    pet: {
      id: 'pet-001',
      nome: 'Pipoca',
      especie: 'Gato',
      raca: 'Siamês',
      idade: 4,
      peso: 3.8,
    },
    veterinario: {
      id: 'vet-001',
      nome: 'Dra. Camila Torres',
      perfil: 'veterinario',
    },
  },
];
