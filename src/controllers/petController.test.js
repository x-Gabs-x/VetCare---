const test = require('node:test');
const assert = require('node:assert/strict');
const { validarTutorDoUsuario } = require('./petController');

test('tutor só pode cadastrar pet para o próprio id', () => {
  const usuario = { id: 'user-123', perfil: 'tutor' };
  assert.doesNotThrow(() => validarTutorDoUsuario(usuario, 'user-123'));
  assert.throws(
    () => validarTutorDoUsuario(usuario, 'user-999'),
    /seu proprio id|próprio id|proprio id/i
  );
});

test('admin pode cadastrar pet para qualquer tutor válido', () => {
  const usuario = { id: 'admin-1', perfil: 'administrador' };
  assert.doesNotThrow(() => validarTutorDoUsuario(usuario, 'user-123'));
});
