# VetCare API — Testes de Requisições

## Execução local

Requisitos: Node.js, npm e uma instância MongoDB disponível.

```bash
npm install
npm start
```

Primeiro. crie um arquivo `.env` na raiz do projeto e implemente o enviado na atividade;

## Rotas disponíveis

Todas as rotas abaixo usam JSON. Com exceção de `POST /usuarios`, as rotas protegidas exigem `Authorization: Bearer <token>`.

## GraphQL

O endpoint GraphQL fica disponível em `http://localhost:3000/graphql`. Abra esse endereço no navegador para usar o terminal GraphiQL, informe o token em **Headers** e execute as operações diretamente no editor GraphQL. Não é necessário montar manualmente um JSON com a propriedade `query` no Postman.

Exemplo de cabeçalho no GraphiQL:

```json
{
  "Authorization": "Bearer SEU_TOKEN"
}
```

O schema contempla usuários, pets, agendamentos, consultas e vacinas, incluindo seus relacionamentos:

```graphql
query DadosVetCare {
  me { id nome email perfil }
  pets { id nome especie raca idade peso tutor { id nome email } }
  agendamentos {
    id data horario status observacoes
    pet { id nome especie raca tutor { id nome } }
    veterinario { id nome email }
  }
  consultas {
    id motivoConsulta procedimentos observacoes
    pet { id nome }
    veterinario { id nome email }
  }
  vacinas {
    id tipo dataAplicacao dataPrevistaReforco observacoes
    pet { id nome }
    veterinario { id nome email }
  }
}
```

| Módulo | Rotas | Acesso |
| --- | --- | --- |
| Autenticação | `POST /auth/login` | Público |
| Usuários | `POST /usuarios` | Público; cria tutor por padrão |
| Usuários | `GET /usuarios`, `GET /usuarios/:id` | Administrador ou veterinário |
| Usuários | `PUT /usuarios/:id` | Próprio usuário ou administrador |
| Usuários | `DELETE /usuarios/:id` | Administrador |
| Pets | `POST`, `GET`, `GET/:id`, `PUT/:id`, `DELETE/:id` em `/pets` | Administrador ou veterinário |
| Consultas | `POST /consultas`, `GET /consultas`, `GET /consultas/:petId`, `PUT /consultas/:id` | Administrador ou veterinário |
| Agendamentos | `POST`, `GET`, `GET/:id`, `PUT/:id`, `DELETE/:id` em `/agendamentos` | Administrador ou veterinário |
| Vacinas | `POST /vacinas`, `GET /vacinas/:petId`, `GET /vacinas/lembretes/proximos` | Autenticado; gravação e lembretes exigem administrador, veterinário ou recepcionista |

Os filtros de usuários `perfil` e `nome` podem ser combinados em `GET /usuarios`.

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

O próprio usuário pode atualizar seu nome, telefone e senha. O administrador também pode atualizar qualquer usuário e alterar os campos `perfil` e `ativo`.

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

O cadastro pode ser realizado sem token. Quando feito por um administrador, o campo `perfil` informado é respeitado; sem administrador, o novo usuário é criado como `tutor`.

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

**Público ou administrador**

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

Ao realizar login utilizando uma conta com o perfil **tutor**, o usuário não possui acesso às rotas administrativas de Pets, Consultas e Agendamentos. Ele pode atualizar o próprio cadastro e visualizar as vacinas dos próprios pets.

### Credenciais de teste — Tutor

```json
{
  "email": "tutorteste123@vetcare.com",
  "senha": "123456"
}
```

Ao tentar acessar uma rota administrativa, a API deve bloquear a requisição.

### Resultado do teste

**Status HTTP:** `403 Forbidden`

```json
{
  "erro": "Acesso negado. Voce nao tem permissao para acessar este recurso."
}
```

Esse comportamento demonstra o controle de acesso baseado no perfil do usuário. O cadastro de novos usuários continua público e cria tutores por padrão.

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
| PUT    | `/usuarios/:id`                   | Atualizar próprio cadastro ou qualquer usuário | Próprio usuário ou administrador |
| POST   | `/usuarios`                       | Criar usuário            | Público ou administrador |
| DELETE | `/usuarios/:id`                   | Excluir usuário          | Administrador |
| POST   | `/usuarios`                       | Criar usuário como veterinário | Público; perfil final tutor |

---

# 11. Controle de Permissões

A API utiliza o perfil do usuário para controlar o acesso às operações.

### Administrador

Possui acesso às operações de gerenciamento e consulta de usuários.

### Veterinario

Possui acesso às operações de consulta de usuários. Também pode atualizar o próprio cadastro, mas não pode alterar seu perfil ou status ativo.

### Tutor

Possui acesso restrito: pode atualizar o próprio cadastro e visualizar as vacinas dos próprios pets, mas não pode executar as operações administrativas protegidas.

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
    9. Tutor → acesso restrito às próprias informações
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

---

# 13. Testes de conflito de agendamento

## 13.1 Validação do índice no schema

O model `Agendamento` possui um índice único composto pelos campos `veterinario`, `data` e `horario`. O índice considera apenas os agendamentos com status `agendado`, `confirmado` ou `concluido`.

A definição foi validada com:

```powershell
node --check src/models/Agendamento.js
```

Também foi verificado que o schema contém:

```json
{
  "veterinario": 1,
  "data": 1,
  "horario": 1
}
```

## 13.2 Validação do índice no MongoDB

Depois de iniciar a API com `npm run dev`, a conexão com o MongoDB foi estabelecida com sucesso:

```text
[MongoDB] Conectado com sucesso.
[Servidor] Rodando em http://localhost:3000
```

A consulta dos índices da coleção `agendamentos` confirmou o índice único no banco:

```json
{
  "key": {
    "veterinario": 1,
    "data": 1,
    "horario": 1
  },
  "name": "veterinario_1_data_1_horario_1",
  "unique": true,
  "partialFilterExpression": {
    "status": {
      "$in": [
        "agendado",
        "confirmado",
        "concluido"
      ]
    }
  }
}
```

## 13.3 Criar agendamento

### Requisição

```http
POST http://localhost:3000/agendamentos
```

### Corpo enviado

```json
{
  "pet": "6a978a94cfef52b60ce2b466",
  "veterinario": "6a98ddbd701d6ba2eb4f85bd",
  "data": "2026-09-10",
  "horario": "14:30",
  "observacoes": "Teste de conflito"
}
```

### Resultado obtido

**Status HTTP:** `201 Created`

O agendamento foi criado com sucesso, com status inicial `agendado`.

## 13.4 Repetir agendamento no mesmo horário

Foi enviada novamente a mesma requisição, mantendo o mesmo veterinário, data e horário.

### Resultado obtido

**Status HTTP:** `409 Conflict`

```json
{
  "erro": "Ja existe um agendamento para esse veterinario nesse mesmo dia e horario."
}
```

Esse resultado confirma que a API impede dois agendamentos ativos para o mesmo veterinário no mesmo dia e horário. A validação antecipada do controller retornou o conflito antes da criação do segundo registro; o índice único do MongoDB também garante a regra em situações de concorrência.

## 13.5 Cancelar agendamento e reutilizar horário

Depois do teste de conflito, o agendamento criado foi cancelado.

### Requisição

```http
DELETE http://localhost:3000/agendamentos/6a9e37d5f3a0d364992f4d40
```

### Resultado obtido

**Status HTTP:** `200 OK`

```json
{
  "mensagem": "Agendamento cancelado com sucesso.",
  "agendamento": {
    "_id": "6a9e37d5f3a0d364992f4d40",
    "status": "cancelado"
  }
}
```

Em seguida, a mesma requisição de criação foi enviada novamente com o mesmo veterinário, data e horário.

### Resultado obtido

**Status HTTP:** `201 Created`

```json
{
  "pet": "6a978a94cfef52b60ce2b466",
  "veterinario": "6a98ddbd701d6ba2eb4f85bd",
  "data": "2026-09-10T00:00:00.000Z",
  "horario": "14:30",
  "status": "agendado",
  "observacoes": "Teste de conflito",
  "_id": "6a9e391543680af2fce1099a3"
}
```

Esse resultado confirma que o índice parcial permite reutilizar o horário depois que o agendamento anterior é cancelado.

### Observação sobre o formato da data

Para evitar diferenças de horário e garantir que a comparação represente o mesmo dia, envie o campo `data` no formato:

```text
YYYY-MM-DD
```

Exemplo:

```json
{
  "data": "2026-09-10"
}
```

O uso de um formato completo com horário, como `2026-09-10T15:00:00.000Z`, pode representar um valor diferente no banco e não deve ser utilizado para esse teste de conflito diário.

---

# 14. Testes GraphQL

O Apollo Server foi integrado à API através do endpoint:

```http
POST http://localhost:3000/graphql
```

As consultas protegidas devem enviar um token JWT no header:

```http
Authorization: Bearer TOKEN_GERADO_NO_LOGIN
```

## 14.1 Consulta GraphQL sem token

### Corpo enviado

```json
{
  "query": "{ agendamentos { id data horario status } }"
}
```

### Resultado obtido

A requisição foi bloqueada porque nenhum token foi informado.

```json
{
  "errors": [
    {
      "message": "Context creation failed: Token nao informado."
    }
  ]
}
```

## 14.2 Consulta GraphQL com usuário tutor

O login do tutor foi realizado com sucesso, mas a consulta foi bloqueada porque o perfil `tutor` não possui permissão para consultar agendamentos.

### Corpo enviado

```json
{
  "query": "{ agendamentos { id data horario status } }"
}
```

### Resultado obtido

**Status HTTP:** `200 OK`

```json
{
  "errors": [
    {
      "message": "Acesso negado."
    }
  ]
}
```

## 14.3 Consulta GraphQL com administrador ou veterinário

A consulta foi realizada com sucesso utilizando um token de um perfil autorizado.

### Corpo enviado

```json
{
  "query": "{ agendamentos { id data horario status } }"
}
```

### Resultado obtido

**Status HTTP:** `200 OK`

```json
{
  "data": {
    "agendamentos": [
      {
        "id": "6a9e391543680af2ce1099a3",
        "data": "2026-09-10T00:00:00.000Z",
        "horario": "14:30",
        "status": "agendado"
      }
    ]
  }
}
```

Esses testes confirmam que o GraphQL valida a autenticação JWT e restringe o acesso aos agendamentos conforme o perfil do usuário.

---

# 15. Integração GraphQL para Vacinas

A API também expõe consultas de vacinas no endpoint GraphQL:

```http
POST http://localhost:3000/graphql
```

## 15.1 Consultar vacinas de um pet

### Requisição

```json
{
  "query": "{ vacinasPorPet(petId: \"ID_DO_PET\") { id tipo dataAplicacao dataPrevistaReforco observacoes pet { id nome } veterinario { id nome } } }"
}
```

### Permissões

- `administrador`, `veterinario` e `recepcionista` podem consultar qualquer pet
- `tutor` pode consultar apenas os pets vinculados ao seu usuário

### Resultado obtido

**Status HTTP:** `200 OK`

```json
{
  "data": {
    "vacinasPorPet": [
      {
        "id": "64da2b5a1f8b1d4f00d4f7ad",
        "tipo": "V10",
        "dataAplicacao": "2026-08-15T00:00:00.000Z",
        "dataPrevistaReforco": "2026-11-15T00:00:00.000Z",
        "observacoes": "Vacina aplicada com retorno em 90 dias",
        "pet": {
          "id": "64d9a79b6542ca0b29c8f101",
          "nome": "Luna"
        },
        "veterinario": {
          "id": "64bf1f7d8a1a2f8b023d9c2a",
          "nome": "Dr. Lucas"
        }
      }
    ]
  }
}
```

## 15.2 Consultar lembretes de reforço

### Requisição

```json
{
  "query": "{ lembretesVacinas(dias: 30) { id tipo dataPrevistaReforco pet { id nome } veterinario { id nome } } }"
}
```

### Permissões

Somente perfis de visão geral podem acessar essa consulta:

- `administrador`
- `veterinario`
- `recepcionista`

### Resultado obtido

**Status HTTP:** `200 OK`

```json
{
  "data": {
    "lembretesVacinas": [
      {
        "id": "64e1f0a5d2f9b7a2d1a9c534",
        "tipo": "Antirrábica",
        "dataPrevistaReforco": "2026-09-20T00:00:00.000Z",
        "pet": {
          "id": "64d9a79b6542ca0b29c8f101",
          "nome": "Luna"
        },
        "veterinario": {
          "id": "64bf1f7d8a1a2f8b023d9c2a",
          "nome": "Dr. Lucas"
        }
      }
    ]
  }
}
```

## 15.3 Erro de permissão para tutor

Quando um tutor tenta consultar as vacinas de um pet que não pertence a ele, a consulta retorna erro de acesso.

### Requisição

```json
{
  "query": "{ vacinasPorPet(petId: \"64d9a79b6542ca0b29c8f101\") { id tipo } }"
}
```

### Resultado obtido

**Status HTTP:** `200 OK`

```json
{
  "errors": [
    {
      "message": "Voce nao tem permissao para visualizar as vacinas deste pet."
    }
  ]
}
```

Esse conjunto de exemplos confirma que o módulo de vacinas no GraphQL retorna corretamente os dados autorizados e preserva as regras de autorização da API REST.
