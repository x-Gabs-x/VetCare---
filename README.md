# VetCare API — Testes de Requisições

## 1. Autenticação

A API possui autenticação através de login, utilizando e-mail e senha.

### Endpoint de Login

**POST**

`http://localhost:3000/auth/login`

---

## 2. Acesso como Administrador

Ao realizar login utilizando uma conta com o perfil **administrador**, o usuário possui acesso aos endpoints disponíveis para consulta e gerenciamento da API.

### Credenciais de teste — Administrador

```json
{
  "email": "lucas@vetcare.com",
  "senha": "123456"
}
```

Após realizar o login, o token JWT retornado deve ser utilizado nas requisições que exigem autenticação.

### Exemplo

```http
Authorization: Bearer TOKEN_GERADO_NO_LOGIN
```

Com o perfil de administrador, é possível realizar as consultas e operações descritas abaixo.

---

# 3. Acesso como Tutor

Ao realizar login utilizando uma conta com o perfil **tutor**, o usuário **não possui acesso aos endpoints protegidos da API**.

### Credenciais de teste — Tutor

```json
{
  "email": "tutorteste123@vetcare.com",
  "senha": "123456"
}
```

Ao tentar acessar endpoints que exigem permissões de administrador, a API deve bloquear a requisição.

Esse comportamento demonstra o controle de acesso baseado no perfil do usuário.

---

# 4. Testes de Requisições

## 4.1 GET — Listar usuários

### Requisição

```http
GET http://localhost:3000/usuarios
```

### Descrição

Retorna a lista de usuários cadastrados na API.

### Perfil utilizado no teste

**Administrador**

### Resultado esperado

A API deve retornar os usuários cadastrados.

### Teste no Postman

> Inserir aqui a imagem do teste realizado no Postman.

---

## 4.2 GET — Buscar usuário por ID

### Requisição

```http
GET http://localhost:3000/usuarios/6a99c1816aa3562eb2239da6
```

### Descrição

Busca um usuário específico através do seu ID.

### Perfil utilizado no teste

**Administrador**

### Resultado esperado

A API deve retornar os dados do usuário correspondente ao ID informado.

### Teste no Postman

> Inserir aqui a imagem do teste realizado no Postman.

---

## 4.3 GET — Buscar usuários por perfil

### Requisição

```http
GET http://localhost:3000/usuarios?perfil=tutor
```

### Descrição

Retorna os usuários que possuem o perfil informado no parâmetro da URL.

Neste caso, serão retornados os usuários cujo perfil seja:

```text
tutor
```

### Perfil utilizado no teste

**Administrador**

### Resultado esperado

A API deve retornar somente os usuários que possuem o perfil `tutor`.

### Teste no Postman

> Inserir aqui a imagem do teste realizado no Postman.

---

# 5. PUT — Atualizar usuário por ID

### Requisição

```http
PUT http://localhost:3000/usuarios/6a98f31889b3686d2909946f
```

### Corpo da requisição

```json
{
  "nome": "Nome atualizado teste PUT",
  "perfil": "tutor",
  "telefone": "83999999999"
}
```

### Descrição

Atualiza os dados de um usuário existente utilizando seu ID.

Neste teste são atualizados:

* Nome
* Perfil
* Telefone

### Perfil utilizado no teste

**Administrador**

### Resultado esperado

A API deve atualizar os dados do usuário e retornar as informações atualizadas.

### Teste no Postman

> Inserir aqui a imagem do teste realizado no Postman.

---

# 6. POST — Criar usuário

### Requisição

```http
POST http://localhost:3000/usuarios
```

### Corpo da requisição

```json
{
  "nome": "Joao Tutor teste 143123213",
  "email": "tutorteste123@vetcare.com",
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

> Inserir aqui a imagem do teste realizado no Postman.

---

# 7. Resumo dos Testes

| Método | Endpoint                 | Função                | Perfil        |
| ------ | ------------------------ | --------------------- | ------------- |
| POST   | `/auth/login`            | Realizar login        | Todos         |
| GET    | `/usuarios`              | Listar usuários       | Administrador |
| GET    | `/usuarios/:id`          | Buscar usuário por ID | Administrador |
| GET    | `/usuarios?perfil=tutor` | Buscar por perfil     | Administrador |
| PUT    | `/usuarios/:id`          | Atualizar usuário     | Administrador |
| POST   | `/usuarios`              | Criar usuário         | Administrador |

---

# 8. Controle de Permissões

A API utiliza o perfil do usuário para controlar o acesso às operações.

### Administrador

Possui acesso às operações de gerenciamento e consulta de usuários.

### Tutor

Possui acesso restrito e não pode executar as operações administrativas protegidas.

### Fluxo de teste

```text
1. Realizar login
       ↓
2. API retorna o token JWT
       ↓
3. Enviar o token nas requisições protegidas
       ↓
4. API verifica o perfil do usuário
       ↓
5. Administrador → acesso permitido
       ↓
6. Tutor → acesso negado
```

---

# 9. Observação

Os testes devem ser realizados com a API em execução localmente:

```text
http://localhost:3000
```

As requisições podem ser executadas utilizando o **Postman**.

Os prints das requisições e das respostas devem ser adicionados nas respectivas seções deste documento para comprovar a execução dos testes.
