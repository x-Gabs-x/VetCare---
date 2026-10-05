const FUSO_HORARIO_CLINICA = process.env.APP_TIME_ZONE || 'America/Fortaleza';
const ANTECEDENCIA_MINIMA_MS = 48 * 60 * 60 * 1000;
const JANELA_ALERTA_MS = 60 * 60 * 1000;

function dataCalendarioValida(data) {
  if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return false;
  }

  const [ano, mes, dia] = data.split('-').map(Number);
  const dataUtc = new Date(Date.UTC(ano, mes - 1, dia));

  return (
    dataUtc.getUTCFullYear() === ano &&
    dataUtc.getUTCMonth() === mes - 1 &&
    dataUtc.getUTCDate() === dia
  );
}

function horarioDentroDoExpediente(horario) {
  if (typeof horario !== 'string' || !/^\d{2}:\d{2}$/.test(horario)) {
    return false;
  }

  const [hora, minuto] = horario.split(':').map(Number);
  const minutosDoDia = hora * 60 + minuto;
  const inicioExpediente = 8 * 60;
  const ultimoInicio = 17 * 60 + 30;

  return (
    minutosDoDia >= inicioExpediente &&
    minutosDoDia <= ultimoInicio &&
    minuto % 30 === 0
  );
}

function partesDataHora(instantaneo, fusoHorario) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: fusoHorario,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instantaneo);

  return Object.fromEntries(partes.map(({ type, value }) => [type, value]));
}

function dataHoraLocalParaInstante(data, horario, fusoHorario = FUSO_HORARIO_CLINICA) {
  if (!dataCalendarioValida(data) || !horarioDentroDoExpediente(horario)) {
    return null;
  }

  const [ano, mes, dia] = data.split('-').map(Number);
  const [hora, minuto] = horario.split(':').map(Number);
  const utcEstimado = Date.UTC(ano, mes - 1, dia, hora, minuto);
  const partesLocais = partesDataHora(new Date(utcEstimado), fusoHorario);
  const horarioLocalComoUtc = Date.UTC(
    Number(partesLocais.year),
    Number(partesLocais.month) - 1,
    Number(partesLocais.day),
    Number(partesLocais.hour),
    Number(partesLocais.minute)
  );

  return new Date(utcEstimado - (horarioLocalComoUtc - utcEstimado));
}

function dataEmFusoHorario(instantaneo, fusoHorario = FUSO_HORARIO_CLINICA) {
  const partes = partesDataHora(instantaneo, fusoHorario);
  return `${partes.year}-${partes.month}-${partes.day}`;
}

function agendamentoRespeitaAntecedencia(data, horario, agora = new Date()) {
  const inicio = dataHoraLocalParaInstante(data, horario);
  return Boolean(inicio && inicio.getTime() - agora.getTime() >= ANTECEDENCIA_MINIMA_MS);
}

function agendamentoDentroDaJanelaDeAlerta(data, horario, agora = new Date()) {
  const inicio = dataHoraLocalParaInstante(data, horario);

  if (!inicio) return false;

  const tempoRestante = inicio.getTime() - agora.getTime();
  return tempoRestante >= 0 && tempoRestante <= JANELA_ALERTA_MS;
}

function dataEHojeNaClinica(data, agora = new Date()) {
  return dataCalendarioValida(data) && dataEmFusoHorario(agora) === data;
}

function normalizarDataCalendario(data) {
  return dataCalendarioValida(data) ? new Date(`${data}T00:00:00.000Z`) : null;
}

module.exports = {
  ANTECEDENCIA_MINIMA_MS,
  FUSO_HORARIO_CLINICA,
  agendamentoDentroDaJanelaDeAlerta,
  agendamentoRespeitaAntecedencia,
  dataCalendarioValida,
  dataEHojeNaClinica,
  dataHoraLocalParaInstante,
  horarioDentroDoExpediente,
  normalizarDataCalendario,
};