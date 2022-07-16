# Envelope Budgeting API

API usando Node/Express, com lógica de autorização e autenticação, para gerenciar um portfólio orçamentário usando a [Técnica dos Envelopes](https://neon.com.br/aprenda/economizar-dinheiro/tecnica-envelopes/). Usuários podem criar, ler, atualizar e deletar envelopes, bem como criar transações para cada envelope. Todos os dados são persistidos usando PostgreSQL.

Leia isso em inglês: [README in English](https://github.com/allanbernartt/envelopes-api/blob/main/README.md)

Este projeto foi criado com [Node v17.x] como parte do meu portfólio pessoal.

Me ajudou a consolidar o conhecimento a respeito dos seguintes conceitos e tecnologias:

- SQL (PostgreSQL)
- Fluxo de Autenticação (autenticação, autorização, jwt)
- Tópicos de Segurança: ataques XSS e proteção contra CSRF
- TDD: (jest, supertest)
- [Internacionalização](https://www.npmjs.com/package/i18next)
- arquitetura MVC
- entre outras coisas

## Rodando a api
Para rodar na máquina local, use `npm install` e depois  `npm start` ou `npm run dev`

## Documentação e Swagger

Para ver uma lista dos endpoints disponíveis e seus possíveis códigos de status HTTP, bem como os parâmetros esperados, favor instalar e rodar o projeto e então visitar `http://localhost:5000/api/1.0/api-docs/`.

## Testes
Após instalar o projeto, rode `npm test`

## Demo

Para ver um exemplo desta api em prática, por favor acesse os seguintes links:

- Resositório Github com o Front End incluso: [link](https://github.com/allanbernartt/envelopes-SPA) 
- Deploy do projeto SPA em Heroku : [link](https://envelope-project.herokuapp.com/) 

## Contribuições

Pull requests são bem-vindos. Para mudanças importantes, por favor abra Issue  para discutir o que você gostaria de mudar.

Por favor, atualize os testes apropriadamente.

## Contato
Sinta-se livre para me mandar mensagem sobre o projeto
[neste endereço de email](mailto:allan.bernartt@gmail.com)


## Licença
[MIT](https://choosealicense.com/licenses/mit/)
