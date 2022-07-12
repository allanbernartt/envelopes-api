const request = require('supertest')
const app = require('../../app')
const pool = require('../../config/index')
const { mockUserFullRegistration, mockUserInvalidTokenDate, postResendAccounActivation } = require('../testUtils/testUtils')
const { apiURL, userEndpoints } = require('../../src/utils/utils')

const accountActivationTests = () => {

    describe('ACCOUNT ACTIVATION', () => {
        beforeAll(() => {
            return pool.query('BEGIN')
        })

        afterAll(() => {
            return pool.query('ROLLBACK')
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
        afterEach(() => {
            return pool.query('TRUNCATE users CASCADE')
        })


        it('GET returns 200 OK for account activation route', async () => {

            await pool.query('BEGIN')
            const userRegistration = await mockUserFullRegistration()

            const response = await request(app).get(`${apiURL}/users/${userEndpoints.accountActivation}/${userRegistration.user.activation_tk}`).send()

            expect(response.status).toBe(200)
            await pool.query('ROLLBACK')
        });

        it('GET access activation token for account activation route', async () => {

            await pool.query('BEGIN')
            const userRegistration = await mockUserFullRegistration()


            const response = await request(app).get(`${apiURL}/users/${userEndpoints.accountActivation}/${userRegistration.user.activation_tk}`).send()

            expect(response.status).toBe(200)
            await pool.query('ROLLBACK')
        });

        it('GET returns error message Invalid Token if user is not found', async () => {

            await pool.query('BEGIN')
            await mockUserFullRegistration()


            const response = await request(app).get(`${apiURL}/users/${userEndpoints.accountActivation}/invalid-token`).send()

            expect(response.status).toBe(400)
            expect(response.body.message).toBe("Token Inválido")
            await pool.query('ROLLBACK')

        });

        it('GET 200 OK for resend activation email route', async () => {

            await pool.query('BEGIN')

            const response = await request(app).get(`${apiURL}/users/${userEndpoints.resendAccountActivation}`).send()

            expect(response.status).toBe(200)

            await pool.query('ROLLBACK')
        });

        it('POST returns 400 and No User Found message for resend activation email route if email is invalid', async () => {

            await pool.query('BEGIN')

            const response = await postResendAccounActivation('invalid@email.com')

            expect(response.status).toBe(404)
            expect(response.body.message).toBe("Usuário Não Encontrado")
            await pool.query('ROLLBACK')
        })

        it('POST resend activation token saves activation email token and token expiration date to database if email is valid', async () => {

            await pool.query('BEGIN')

            // mock register user with expired token
            const invalidTokenUser = await mockUserInvalidTokenDate()

            const user_id = invalidTokenUser.user.user_id
            const user_email = invalidTokenUser.user.user_email
            const oldToken = invalidTokenUser.user.activation_tk
            const oldDbDate = new Date(invalidTokenUser.user.activation_tk_date)
            const response = await postResendAccounActivation(user_email)
            const updatedUser = await pool.query('SELECT * FROM users WHERE user_id = ($1)', [user_id])
            const newDbDate = new Date(updatedUser.rows[0].activation_tk_date)

            const isDateUpdated = newDbDate > oldDbDate

            expect(response.status).toBe(200)
            expect(updatedUser.rows[0].user_id).toBe(user_id)
            expect(updatedUser.rows[0].user_email).toBe(user_email)
            expect(updatedUser.rows[0].activation_tk).not.toStrictEqual(oldToken)
            expect(isDateUpdated).toBe(true)
            await pool.query('ROLLBACK')
        })

        it.each`
        field    | value    | expected        
        ${'user_email'} | ${null} | ${"Este campo precisa ser preenchido"} 
        ${'user_email'} | ${''} | ${"Este campo precisa ser preenchido"} 
        ${'user_email'} | ${'john@john'} | ${"Favor fornecer um email válido"}        
      `('returns $expected when $field is $value', async ({ field, value, expected }) => {
            await pool.query('BEGIN')
            const response = await postResendAccounActivation(value)
            expect(response.status).toBe(400)
            expect(response.body.validationErrors[field]).toBe(expected)
            await pool.query('ROLLBACK')
        });

        it('GET activates account when token and its expiration date are valid', async () => {
            await pool.query('BEGIN')
            const userRegistration = await mockUserFullRegistration()


            const response = await request(app).get(`${apiURL}/users/${userEndpoints.accountActivation}/${userRegistration.user.activation_tk}`).send()

            const activatedUser = await pool.query('SELECT * FROM users WHERE user_id = ($1)', [userRegistration.user.user_id])
            expect(response.status).toBe(200)
            expect(userRegistration.user.activation_tk).not.toBe(null)
            expect(userRegistration.user.activation_tk_date).not.toBe(null)
            expect(userRegistration.user.activated).toBe(false)
            expect(activatedUser.rows[0].activation_tk).toBe(null)
            expect(activatedUser.rows[0].activation_tk_date).toBe(null)
            expect(activatedUser.rows[0].activated).toBe(true)
            await pool.query('ROLLBACK')
        });


    }) //describe block

}

module.exports = accountActivationTests