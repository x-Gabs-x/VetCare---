const API_URL = 'http://localhost:3000/graphql'

export async function graphqlRequest(query, variables = {}) {
  const token = localStorage.getItem('token')

  const resposta = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify({ query, variables }),
  })

  const json = await resposta.json()

  if (json.errors) {
    throw new Error(json.errors[0].message)
  }

  return json.data
}