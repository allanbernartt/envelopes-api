const request = require('supertest')
const app = require('../../app')
const { apiURL, userEndpoints } = require('../../src/utils/utils')
const pool = require('../../config/index')
const bcryptjs = require('bcryptjs')
const { getToken, requestUser, postUser } = require('../testUtils/testUtils')
const { v4: uuidv4 } = require('uuid')

const userLoginTest = (endpoint) => {


    describe('User Login', () => {

        beforeAll(() => {
            return pool.query('BEGIN')
        })

        afterAll(() => {
            return pool.query('ROLLBACK')
        })

        afterEach(() => {
            return pool.query('TRUNCATE users CASCADE')
        })

        afterEach(() => {
            return pool.query('TRUNCATE envelopes CASCADE')
        })

        afterEach(() => {
            return pool.query('TRUNCATE total_budget CASCADE')
        })
        afterEach(() => {
            return pool.query('TRUNCATE transactions CASCADE')
        })

        it('returns 200 OK when login route is valid', async () => {
            const response = await request(app).get(`${apiURL}/users/${endpoint}`).send()
            expect(response.status).toBe(200)
        });

        it('returns 403 when logging the user with valid credentials but without account activation', async () => {
            await pool.query('BEGIN')
            const hashedPass = await bcryptjs.hash('P4ssword', 12)
            const user_id = uuidv4();
            const registeredUser = {
                user_id,
                user_name: 'John',
                user_email: 'john@john.com',
                password: hashedPass
            }

            const user = await pool.query('INSERT INTO users (user_id, user_name, user_email, password) VALUES ($1, $2, $3, $4) RETURNING *', [registeredUser.user_id,registeredUser.user_name, registeredUser.user_email, registeredUser.password])
            const response = await request(app).post(`${apiURL}/users/${endpoint}`).send({ ...registeredUser, password: 'P4ssword' })

            expect(user.rows[0].activated).toBe(false)
            expect(response.status).toBe(403)
            await pool.query('ROLLBACK')
        });

        it('returns 200 when logging the user with valid credentials and account is activated', async () => {
            await pool.query('BEGIN')
            const hashedPass = await bcryptjs.hash('P4ssword', 12)
            const user_id = uuidv4();
            const registeredUser = {
                user_id,
                user_name: 'John',
                user_email: 'john@john.com',
                password: hashedPass
            }

            await pool.query('INSERT INTO users (user_id, user_name, user_email, password, activated) VALUES ($1, $2, $3, $4, $5)', [registeredUser.user_id,registeredUser.user_name, registeredUser.user_email, registeredUser.password, true])
            const response = await request(app).post(`${apiURL}/users/${endpoint}`).send({ ...registeredUser, password: 'P4ssword' })

            expect(response.status).toBe(200)
            await pool.query('ROLLBACK')
        });

        it('saves jwt to user table when logging user with valid credentials and account is activated', async () => {
            await pool.query('BEGIN')
            const hashedPass = await bcryptjs.hash('P4ssword', 12)
            const user_id = uuidv4();
            const registeredUser = {
                user_id,
                user_name: 'John',
                user_email: 'john@john.com',
                password: hashedPass
            }

            const user = await pool.query('INSERT INTO users ( user_id, user_name, user_email, password, activated) VALUES ($1, $2, $3, $4, $5) RETURNING user_id', [registeredUser.user_id,registeredUser.user_name, registeredUser.user_email, registeredUser.password, true])
            await request(app).post(`${apiURL}/users/${endpoint}`).send({ ...registeredUser, password: 'P4ssword' })
            const check_token = await pool.query('SELECT * FROM users WHERE user_id = ($1)', [user.rows[0].user_id])

            expect(check_token.rows[0].tokens.length).toBe(1)
            await pool.query('ROLLBACK')
        });

        it('appends jwt to user table when logging user another time and account is activated', async () => {
            await pool.query('BEGIN')
            const hashedPass = await bcryptjs.hash('P4ssword', 12)
            const user_id = uuidv4();
            const registeredUser = {
                user_id,
                user_name: 'John',
                user_email: 'john@john.com',
                password: hashedPass
            }
            const user = await pool.query('INSERT INTO users (user_id, user_name, user_email, password, tokens, activated) VALUES ($1, $2, $3, $4, ARRAY [$5], $6) RETURNING *', [registeredUser.user_id,registeredUser.user_name, registeredUser.user_email, registeredUser.password, 'first_token', true])
            await request(app).post(`${apiURL}/users/${endpoint}`).send({ ...registeredUser, password: 'P4ssword' })
            const check_token = await pool.query('SELECT * FROM users WHERE user_id = ($1)', [user.rows[0].user_id])

            expect(check_token.rows[0].tokens.length).toBe(2)
            expect(check_token.rows[0].tokens[0]).toBe('first_token')
            await pool.query('ROLLBACK')
        });

        it('returns 404 and Unable to Login message when trying to log in with invalid email', async () => {
            await pool.query('BEGIN')

            const response = await request(app).post(`${apiURL}/users/${endpoint}`).send({
                user_email: 'john@john.com',
                password: 'password'
            })
            'Unable to Login'
            expect(response.status).toBe(404)
            expect(response.body.message).toBe("Não é possível logar")
            await pool.query('ROLLBACK')
        });

        it('returns 404 and Unable to Login message when trying to log in with invalid password', async () => {
            await pool.query('BEGIN')
            const hashedPass = await bcryptjs.hash('P4ssword', 12)
            const user_id = uuidv4();
            const registeredUser = {
                user_id,
                user_name: 'John',
                user_email: 'john@john.com',
                password: hashedPass
            }

            await pool.query('INSERT INTO users (user_id, user_name, user_email, password) VALUES ($1, $2, $3, $4) RETURNING user_name, user_email, password', [registeredUser.user_id,registeredUser.user_name, registeredUser.user_email, registeredUser.password])
            const response = await request(app).post(`${apiURL}/users/${endpoint}`).send({ ...registeredUser, password: 'WrongPass' })

            expect(response.status).toBe(404)
            expect(response.body.message).toBe("Não é possível logar")
            await pool.query('ROLLBACK')
        });

        it('LOGOUT POST returns 401 and Please authenticate for log out POST without authentication', async () => {
            const response = await request(app).post(`${apiURL}/users/${userEndpoints.logout}`)

            expect(response.status).toBe(403)
            expect(response.body.message).toBe("Favor entrar na sua conta")
        })
        it('LOGOUT POST returns 200 OK when logging out authenticated user', async () => {
            await pool.query('BEGIN')
            const loggedInUser = await getToken()
            const response = await postUser(loggedInUser.token, userEndpoints.logout)

            expect(response.status).toBe(200)
            await pool.query('ROLLBACK')
        })

        it('LOGOUT POST removes token from database when user logs out', async () => {
            await pool.query('BEGIN')

            const loggedInUser = await getToken()
            const check_token = await pool.query('SELECT * FROM users WHERE user_id = ($1)', [loggedInUser.user_id])
            const response = await postUser(loggedInUser.token, userEndpoints.logout)
            const loggedOutUser = await pool.query('SELECT * FROM users WHERE user_id = ($1)', [loggedInUser.user_id])

            expect(response.status).toBe(200)
            expect(check_token.rows[0].tokens.length).toBe(1)
            expect(loggedOutUser.rows[0].tokens.length).toBe(0)
            await pool.query('ROLLBACK')
        })

        it('LOGOUT ALL POST returns 401 and Please authenticate for log out ALL ACCOUNTS route if trying to access route without authentication', async () => {
            const response = await request(app).post(`${apiURL}/users/${userEndpoints.logoutAllAccounts}`)

            expect(response.status).toBe(403)
            expect(response.body.message).toBe("Favor entrar na sua conta")
        })

        
        it('LOGOUT ALL POST removes all tokens from database when user logs out from all acounts', async () => {
            await pool.query('BEGIN')

            const loggedInUser = await getToken()
            const check_token = await pool.query('SELECT * FROM users WHERE user_id = ($1)', [loggedInUser.user_id])
            const response = await postUser(loggedInUser.token, userEndpoints.logoutAllAccounts)
            const loggedOutUser = await pool.query('SELECT * FROM users WHERE user_id = ($1)', [loggedInUser.user_id])

            expect(response.status).toBe(200)
            expect(check_token.rows[0].tokens.length).toBe(1)
            expect(loggedOutUser.rows[0].tokens.length).toBe(0)
            await pool.query('ROLLBACK')
        })    

    })
}

module.exports = userLoginTest