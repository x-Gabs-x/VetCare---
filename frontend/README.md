# VetCare Frontend

Execute a API na raiz do projeto e depois inicie o frontend:

```bash
npm install
npm run dev
```

O frontend usa `http://localhost:3000` para a API REST e `http://localhost:3000/graphql` para as consultas GraphQL. Para mudar os endereços, defina `VITE_API_URL` e `VITE_GRAPHQL_URL` no ambiente do Vite.

Na área de Pets, tutores podem cadastrar e editar seus próprios animais. A equipe pode vincular um novo pet a um usuário com perfil tutor. A área de Prontuários reúne registros clínicos, consultas e vacinas do paciente selecionado. Veterinários e administradores podem registrar e editar prontuários; o arquivamento é reservado a administradores.
