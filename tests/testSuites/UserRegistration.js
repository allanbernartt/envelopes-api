const request = require('supertest')
const app = require('../../app')
const { apiURL, userEndpoints } = require('../../src/utils/utils')
const pool = require('../../config/index')
const { getToken, mockUserFullRegistration, mockUserInvalidTokenDate, postResendAccounActivation } = require('../testUtils/testUtils')
require('dotenv').config()

const validUser = {
    user_name: 'John',
    user_email: 'john@john.com',
    password: 'P4ssword',
    passConfirmation: 'P4ssword',
    testMode: true
}

const postUser = (endpoint, user = validUser) => {

    return request(app).post(`${apiURL}/users/${endpoint}`).send(user)
}

const userRegistrationTests = (endpoint) => {

    describe('User Registrations', () => {
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

        it('GET REGISTRATION returns 200 OK for signup endpoint', async () => {
            const response = await request(app).get(`${apiURL}/users/${endpoint}`).send();
            expect(response.status).toBe(200)
        })

        it('POST REGISTRATION returns 201 after creating user', async () => {

            const response = await postUser(endpoint)
            expect(response.status).toBe(201)
        })

        it('POST REGISTRATION returns message User Created Successfully after creating user', async () => {
            const response = await postUser(endpoint)
            expect(response.body.message).toBe('User Created Successfully')
        })

        it('POST REGISTRATION saves user to database', async () => {

            await postUser(endpoint)

            const user = await pool.query('SELECT * FROM users LIMIT 1')
            expect(user.rowCount).toEqual(1)

        })

        it('POST REGISTRATION saves user name and email to database', async () => {

            await pool.query('BEGIN')
            await postUser(endpoint)

            const user = await pool.query('SELECT * FROM users LIMIT 1')
            expect(user.rows[0].user_name).toEqual(validUser.user_name)
            expect(user.rows[0].user_email).toEqual(validUser.user_email)
            await pool.query('ROLLBACK')
        })


        it('POST REGISTRATION hashes password', async () => {

            await pool.query('BEGIN')
            await postUser(endpoint)

            const user = await pool.query('SELECT * FROM users LIMIT 1')
            expect(user.rows[0].password).not.toBe(validUser.password)
            await pool.query('ROLLBACK')
        })

        it('POST REGISTRATION returns validationErrors field inside req.body when user is invalid', async () => {
            const invalidUser = {
                user_name: null
            }
            const response = await postUser(endpoint, invalidUser)

            expect(response.body.validationErrors).not.toBeUndefined()
        })

        it('POST REGISTRATION returns 400 and Email Already in Use when trying to register with existent email', async () => {
            await pool.query('BEGIN')

           await mockUserFullRegistration()
             
           const response = await postUser(endpoint, validUser)

           expect(response.status).toBe(400)
           expect(response.body.validationErrors.user_email).toBe("Email já cadastrado")
            await pool.query('ROLLBACK')
        })

        it('POST REGISTRATION returns errors for all fields inside req.body when user is invalid', async () => {
            const invalidUser = {
                user_name: null,
                user_email: null,
                password: null,
                passConfirmation: null
            }
            const response = await postUser(endpoint, invalidUser)

            expect(Object.keys(response.body.validationErrors)).toEqual(['user_name', 'user_email', 'password', 'passConfirmation'])
        })

        it.each`
        field    | value    | expected
        ${'user_name'} | ${null} | ${"Este campo precisa ser preenchido"}  
        ${'user_name'} | ${''} | ${"Este campo precisa ser preenchido"}  
        ${'user_name'} | ${'us'} | ${"Nome precisa conter entre 3 e 25 caracteres"} 
        ${'user_name'} | ${'u'.repeat(26)} | ${"Nome precisa conter entre 3 e 25 caracteres"} 
        ${'user_email'} | ${null} | ${"Este campo precisa ser preenchido"} 
        ${'user_email'} | ${''} | ${"Este campo precisa ser preenchido"} 
        ${'user_email'} | ${'john@john'} | ${"Favor fornecer um email válido"} 
        ${'password'} | ${null} | ${"Este campo precisa ser preenchido"} 
        ${'password'} | ${''} | ${"Este campo precisa ser preenchido"} 
        ${'password'} | ${'a'.repeat(7)} | ${"Senha precisa conter entre 8 e 25 caracteres"} 
        ${'password'} | ${'a'.repeat(26)} | ${"Senha precisa conter entre 8 e 25 caracteres"}
        ${'passConfirmation'} | ${null} | ${"Este campo precisa ser preenchido"}  
        ${'passConfirmation'} | ${''} | ${"Este campo precisa ser preenchido"} 
      `('POST REGISTRATION returns $expected when $field is $value', async ({ field, value, expected }) => {

            const user = {

            }

            user[field] = value


            const response = await postUser(endpoint, user)
            expect(response.status).toBe(400)
            expect(response.body.validationErrors[field]).toBe(expected)
        });

        it('POST REGISTRATION returns Password confirmation does not match password when fields dont match', async () => {
            const invalidUser = {
                password: 'password',
                passConfirmation: 'paswrd'
            }
            const response = await postUser(endpoint, invalidUser)
            expect(response.body.validationErrors.passConfirmation).toBe("Senhas precisam ser as mesmas")
        })


        it('POST REGISTRATION saves activation email token and token expiration date to database', async () => {

            await pool.query('BEGIN')
            await postUser(endpoint)

            const user = await pool.query('SELECT * FROM users LIMIT 1')
            expect(user.rows[0].activation_tk).not.toBe(null)
            expect(user.rows[0].activation_tk).not.toBeUndefined()
            expect(user.rows[0].activation_tk_date).not.toBe(null)
            expect(user.rows[0].activation_tk_date).not.toBeUndefined()
            await pool.query('ROLLBACK')
        })

        it('POST REGISTRATION saves valid token expiration date to database', async () => {

            await pool.query('BEGIN')
            await postUser(endpoint)

            const user = await pool.query('SELECT * FROM users LIMIT 1')
            const dateNow = new Date(Date.now())
            const dbDate = new Date(user.rows[0].activation_tk_date)

            const isValidDate = dbDate > dateNow

            expect(isValidDate).toEqual(true)

            await pool.query('ROLLBACK')
        })

    }) // describe block


}

module.exports = userRegistrationTests;