# VetCare API — Testes de Requisições

## 1. Autenticação

A API possui autenticação através de login, utilizando e-mail e senha.

### Endpoint de Login

**POST**

```http
http://localhost:3000/auth/login
```

### Credenciais de teste — Administrador

```json
{
  "email": "lucas@vetcare.com",
  "senha": "123456"
}
```

---

# 2. Configuração do Token no Postman

As requisições protegidas devem utilizar o token JWT obtido através do login de um usuário administrador.

Para facilitar os testes, o token pode ser salvo automaticamente em uma variável de ambiente do Postman.

## 2.1 Criar variável `token`

No Postman, acesse:

**Environments → seu ambiente**

Crie uma variável com o nome:

```text
token
```

A variável será utilizada posteriormente nas requisições protegidas.

---

## 2.2 Salvar o token automaticamente após o login

Abra a requisição:

```http
POST http://localhost:3000/auth/login
```

Depois de configurar o login, acesse:

**Scripts → Post-response**

Adicione o seguinte código:

```javascript
const resposta = pm.response.json();

if (!resposta.token) {
    throw new Error('A resposta não contém token');
}

pm.environment.set('token', resposta.token);

console.log('Token salvo:', resposta.token);
```

Após executar o login, o Postman irá:

1. Receber a resposta da API;
2. Verificar se existe um token;
3. Salvar o token na variável de ambiente `token`;
4. Permitir que o token seja reutilizado nas próximas requisições.

---

## 2.3 Configurar o Bearer Token

Nas requisições que exigem autenticação, acesse:

**Authorization → Type → Bearer Token**

No campo **Token**, informe:

```text
{{token}}
```

Dessa forma, o Postman utilizará automaticamente o token armazenado no ambiente.

A requisição será enviada com:

```http
Authorization: Bearer TOKEN_GERADO_NO_LOGIN
```

Não é necessário copiar e colar manualmente o JWT em cada requisição.

---

# 3. Acesso como Veterinário

Usuários com perfil **veterinario** podem consultar as rotas de usuários.

### Endpoint de login

```http
POST http://localhost:3000/auth/login
```

### Credenciais de teste — Veterinário

```json
{
  "email": "veterinario.teste@vetcare.com",
  "senha": "123456"
}
```

Após realizar o login, o token JWT é salvo na variável `{{token}}` e deve ser utilizado como **Bearer Token** nas requisições protegidas.

## 3.1 GET — Listar usuários como veterinário

### Requisição

```http
GET http://localhost:3000/usuarios
```

### Authorization

```text
Bearer Token
{{token}}
```

### Resultado obtido

**Status HTTP:** `200 OK`

```json
[
  {
    "_id": "6a9cee9c1e0c237cca41bfc2",
    "nome": "Veterinario Teste",
    "email": "veterinario.teste@vetcare.com",
    "perfil": "veterinario",
    "telefone": "83999999999",
    "ativo": true,
    "createdAt": "2026-09-06T04:39:56.779Z",
    "updatedAt": "2026-09-06T04:39:56.779Z",
    "__v": 0
  }
]
```

Esse teste confirma que usuários com perfil `veterinario` possuem acesso à rota de listagem de usuários.

---

## 3.2 POST — Tentar criar usuário como veterinário

### Requisição

```http
POST http://localhost:3000/usuarios
```

### Authorization

```text
Bearer Token
{{token}}
```

### Corpo da requisição

```json
{
  "nome": "Usuario Temporario Teste",
  "email": "temporario.teste@vetcare.com",
  "senha": "123456",
  "perfil": "tutor",
  "telefone": "83999999999"
}
```

### Resultado obtido

**Status HTTP:** `403 Forbidden`

```json
{
  "erro": "Acesso negado. Voce nao tem permissao para acessar este recurso."
}
```

Esse teste confirma que o perfil `veterinario` não pode criar usuários.

---

# 4. Acesso como Administrador

Ao realizar login utilizando uma conta com o perfil **administrador**, o usuário possui acesso aos endpoints disponíveis para consulta e gerenciamento da API.

### Credenciais de teste — Administrador

```json
{
  "email": "lucas@vetcare.com",
  "senha": "123456"
}
```

Após realizar o login, o token JWT é salvo automaticamente na variável:

```text
{{token}}
```

Esse token deve ser utilizado nas requisições protegidas através do **Bearer Token**.

### Fluxo

```text
POST /auth/login
       ↓
API retorna o token JWT
       ↓
Script salva o token em {{token}}
       ↓
Authorization → Bearer Token
       ↓
{{token}}
       ↓
Executar requisição protegida
```

---

# 5. Testes de Requisições como Administrador

Os testes abaixo foram executados com uma conta de perfil **administrador**.

## 5.1 GET — Listar usuários

### Requisição

```http
GET http://localhost:3000/usuarios
```

### Authorization

```text
Bearer Token
{{token}}
```

### Descrição

Retorna a lista de usuários cadastrados na API.

### Perfil utilizado no teste

**Administrador**

### Resultado esperado

A API deve retornar os usuários cadastrados.

### Teste no Postman

**Status HTTP:** `200 OK`

```json
[
  {
    "_id": "6a9ac7be69eeba64151a3822",
    "nome": "Joao Tutor teste 43123213",
    "email": "joaotes1tefdsfds@vetcare.com",
    "perfil": "tutor",
    "telefone": "83999999999",
    "ativo": true,
    "createdAt": "2026-09-04T13:29:34.177Z",
    "updatedAt": "2026-09-04T13:29:34.177Z",
    "__v": 0
  }
]
```

---

## 5.2 GET — Buscar usuário por ID

### Requisição

```http
GET http://localhost:3000/usuarios/6a99c1816aa3562eb2239da6
```

### Authorization

```text
Bearer Token
{{token}}
```

### Descrição

Busca um usuário específico através do seu ID.

### Perfil utilizado no teste

**Administrador**

### Resultado esperado

A API deve retornar os dados do usuário correspondente ao ID informado.

### Teste no Postman

**Status HTTP:** `200 OK`

```json
{
  "_id": "6a99c1816aa3562eb2239da6",
  "nome": "Joao Tutor teste 16hrs",
  "email": "jjteste2@vetcare.com",
  "perfil": "tutor",
  "telefone": "83999999999",
  "ativo": true,
  "createdAt": "2026-09-03T18:50:41.995Z",
  "updatedAt": "2026-09-03T18:50:41.995Z",
  "__v": 0
}
```

---

## 5.3 GET — Buscar usuários por perfil

### Requisição

```http
GET http://localhost:3000/usuarios?perfil=tutor
```

### Authorization

```text
Bearer Token
{{token}}
```

### Descrição

Retorna os usuários que possuem o perfil informado no parâmetro da URL.

Neste caso, serão retornados os usuários cujo perfil seja:

```text
tutor
```

### Parâmetro utilizado

| Parâmetro | Valor   |
| --------- | ------- |
| `perfil`  | `tutor` |

### Perfil utilizado no teste

**Administrador**

### Resultado esperado

A API deve retornar somente os usuários que possuem o perfil `tutor`.

### Teste no Postman

**Status HTTP:** `200 OK`

```json
[
  {
    "_id": "6a9ac7be69eeba64151a3822",
    "nome": "Joao Tutor teste 43123213",
    "email": "joaotes1tefdsfds@vetcare.com",
    "perfil": "tutor",
    "telefone": "83999999999",
    "ativo": true
  }
]
```

---

## 5.4 GET — Buscar usuários por nome

### Requisição

```http
GET http://localhost:3000/usuarios?nome=Joao%20Tutor%20teste%2016hrs
```

### Authorization

```text
Bearer Token
{{token}}
```

### Descrição

Busca usuários através do nome informado no parâmetro da URL.

### Parâmetro utilizado

| Parâmetro | Valor                    |
| --------- | ------------------------ |
| `nome`    | `Joao Tutor teste 16hrs` |

No Postman, também é possível configurar o parâmetro através da aba **Params**:

```text
KEY: nome
VALUE: Joao Tutor teste 16hrs
```

### Perfil utilizado no teste

**Administrador**

### Resultado esperado

A API deve retornar o usuário ou usuários correspondentes ao nome informado.

### Teste no Postman

**Status HTTP:** `200 OK`

```json
[
  {
    "_id": "6a99c1816aa3562eb2239da6",
    "nome": "Joao Tutor teste 16hrs",
    "email": "jjteste2@vetcare.com",
    "perfil": "tutor",
    "telefone": "83999999999",
    "ativo": true
  }
]
```

---

## 5.5 GET — Buscar usuários por perfil e nome

### Requisição

```http
GET http://localhost:3000/usuarios?perfil=tutor&nome=Joao%20Tutor%20teste%2016hrs
```

### Authorization

```text
Bearer Token
{{token}}
```

### Descrição

Permite utilizar simultaneamente os filtros de **perfil** e **nome**.

### Parâmetros

| Parâmetro | Valor                    |
| --------- | ------------------------ |
| `perfil`  | `tutor`                  |
| `nome`    | `Joao Tutor teste 16hrs` |

### Perfil utilizado no teste

**Administrador**

### Resultado esperado

A API deve retornar somente os usuários que correspondam aos filtros informados.

### Teste no Postman

**Status HTTP:** `200 OK`

```json
[
  {
    "_id": "6a99c1816aa3562eb2239da6",
    "nome": "Joao Tutor teste 16hrs",
    "email": "jjteste2@vetcare.com",
    "perfil": "tutor",
    "telefone": "83999999999",
    "ativo": true
  }
]
```

---

# 6. PUT — Atualizar usuário por ID

### Requisição

```http
PUT http://localhost:3000/usuarios/6a9cf6b3a2fe17550a89ce19
```

### Authorization

```text
Bearer Token
{{token}}
```

### Corpo da requisição

```json
{
  "nome": "Usuario Temporario Atualizado",
  "telefone": "83888888888"
}
```

### Descrição

Atualiza os dados de um usuário existente utilizando seu ID.

Neste teste são atualizados:

* Nome
* Telefone

### Perfil utilizado no teste

**Administrador**

### Resultado esperado

A API deve atualizar os dados do usuário e retornar as informações atualizadas.

### Teste no Postman

**Status HTTP:** `200 OK`

```json
{
  "id": "6a9cf6b3a2fe17550a89ce19",
  "nome": "Usuario Temporario Atualizado",
  "email": "temporario.teste@vetcare.com",
  "perfil": "tutor",
  "telefone": "83888888888",
  "ativo": true
}
```

---

# 7. POST — Criar usuário

### Requisição

```http
POST http://localhost:3000/usuarios
```

### Authorization

```text
Bearer Token
{{token}}
```

### Corpo da requisição

```json
{
  "nome": "Usuario Temporario Teste",
  "email": "temporario.teste@vetcare.com",
  "senha": "123456",
  "perfil": "tutor",
  "telefone": "83999999999"
}
```

### Descrição

Cria um novo usuário no sistema.

Neste teste é criado um usuário com o perfil:

```text
tutor
```

### Perfil utilizado no teste

**Administrador**

### Resultado esperado

A API deve cadastrar o novo usuário e retornar os dados correspondentes ao cadastro realizado.

### Teste no Postman

**Status HTTP:** `201 Created`

```json
{
  "id": "6a9cf6b3a2fe17550a89ce19",
  "nome": "Usuario Temporario Teste",
  "email": "temporario.teste@vetcare.com",
  "perfil": "tutor",
  "telefone": "83999999999",
  "ativo": true,
  "createdAt": "2026-09-06T05:14:27.040Z"
}
```

---

# 8. DELETE — Excluir usuário por ID

### Requisição

```http
DELETE http://localhost:3000/usuarios/6a9cf6b3a2fe17550a89ce19
```

### Authorization

```text
Bearer Token
{{token}}
```

### Perfil utilizado no teste

**Administrador**

### Resultado esperado

A API deve excluir o usuário temporário informado.

### Teste no Postman

**Status HTTP:** `200 OK`

```json
{
  "mensagem": "Usuario removido com sucesso."
}
```

---

# 9. Acesso como Tutor

Ao realizar login utilizando uma conta com o perfil **tutor**, o usuário **não possui acesso aos endpoints protegidos da API**.

### Credenciais de teste — Tutor

```json
{
  "email": "tutorteste123@vetcare.com",
  "senha": "123456"
}
```

Ao tentar acessar endpoints protegidos, a API deve bloquear a requisição.

### Resultado do teste

**Status HTTP:** `403 Forbidden`

```json
{
  "erro": "Acesso negado. Voce nao tem permissao para acessar este recurso."
}
```

Esse comportamento demonstra o controle de acesso baseado no perfil do usuário.

---

# 10. Resumo dos Testes

| Método | Endpoint                          | Função                   | Perfil        |
| ------ | --------------------------------- | ------------------------ | ------------- |
| POST   | `/auth/login`                     | Realizar login           | Todos         |
| GET    | `/usuarios`                       | Listar usuários          | Administrador ou veterinario |
| GET    | `/usuarios/:id`                   | Buscar usuário por ID    | Administrador ou veterinario |
| GET    | `/usuarios?perfil=tutor`          | Buscar por perfil        | Administrador ou veterinario |
| GET    | `/usuarios?nome=...`              | Buscar por nome          | Administrador ou veterinario |
| GET    | `/usuarios?perfil=tutor&nome=...` | Buscar por perfil e nome | Administrador ou veterinario |
| GET    | `/usuarios`                       | Listar usuários como veterinario | Veterinario |
| PUT    | `/usuarios/:id`                   | Atualizar usuário        | Administrador |
| POST   | `/usuarios`                       | Criar usuário            | Administrador |
| DELETE | `/usuarios/:id`                   | Excluir usuário          | Administrador |
| POST   | `/usuarios`                       | Tentar criar usuário     | Veterinario — acesso negado |

---

# 11. Controle de Permissões

A API utiliza o perfil do usuário para controlar o acesso às operações.

### Administrador

Possui acesso às operações de gerenciamento e consulta de usuários.

### Veterinario

Possui acesso às operações de consulta de usuários, mas não pode criar, atualizar ou excluir cadastros.

### Tutor

Possui acesso restrito e não pode executar as operações administrativas protegidas.

### Fluxo de teste

```text
1. Realizar login
       ↓
2. API retorna o token JWT
       ↓
3. Script salva o token em {{token}}
       ↓
4. Configurar Authorization como Bearer Token
       ↓
5. Utilizar {{token}}
       ↓
6. API verifica o perfil do usuário
       ↓
7. Administrador → acesso permitido em todas as operações de usuários
       ↓
8. Veterinario → acesso permitido apenas nas operações de consulta
       ↓
9. Tutor → acesso negado
```

---

# 12. Observação

Os testes devem ser realizados com a API em execução localmente:

```text
http://localhost:3000
```

As requisições podem ser executadas utilizando o **Postman**.

Para os endpoints protegidos, é necessário primeiro realizar o login e salvar o token através do script apresentado neste documento.

Os resultados das requisições estão registrados em texto e formato JSON nas respectivas seções deste documento.
