# Envelope Budgeting API

Node/Express API with auth flow to manage a portfolio budget using a [budget envelope strategy](https://www.investopedia.com/envelope-budgeting-system-5208026). Users can create, read, update, and delete envelopes as well as create transactions for each individual envelope. All data is persisted in a database using PostgreSQL.

Read this in Portuguese: [README em Português](https://github.com/allanbernartt/envelopes-api/blob/main/README.pt-br.md)

This project was built as part of my personal portfolio. It uses [Node v17.x]

It helped me solidify the knowledge regarding concepts and technologies such as:
- SQL (PostgreSQL)
- Auth flow (authentication, authorization, jwt)
- Security concerns: XSS attacks and CSRF protection
- TDD: (jest, supertest)
- [Internationalization](https://www.npmjs.com/package/i18next)
- MVC architecture
- among other things

## Running the app
To run locally, run `npm install`, then `npm start` or `npm run dev`

## Documentation and Swagger

To see a list of available endpoints and their possible HTTP response status codes, as well as expected paramaters when applicable, please install and run the project, then visit `http://localhost:5000/api/1.0/api-docs/`

## Demo

To see a working example of this api, please refer to the following:
- Github repo with frontend included: [link](https://github.com/allanbernartt/envelopes-SPA) 
- Deployed SPA project in Heroku: [link](https://envelope-project.herokuapp.com/) 

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## Contact
Feel free to message me about the project at [this email address](mailto:allan.bernartt@gmail.com)


## License
[MIT](https://choosealicense.com/licenses/mit/)
