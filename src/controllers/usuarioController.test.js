const test = require('node:test');
const assert = require('node:assert/strict');
const { validarUsuarioSemPetsVinculados } = require('./usuarioController');

test('impede excluir usuário que ainda possui pets vinculados', () => {
  assert.throws(
    () => validarUsuarioSemPetsVinculados({ perfil: 'tutor' }, true),
    (erro) => erro.status === 409 && /pets vinculados/.test(erro.message)
  );
});

test('permite excluir usuário sem pets vinculados', () => {
  assert.doesNotThrow(() => validarUsuarioSemPetsVinculados({ perfil: 'tutor' }, false));
});