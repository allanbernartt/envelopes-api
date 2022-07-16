const request = require('supertest')
const app = require('../../app')
const pool = require('../../config/index')
const { mockUserFullRegistration, mockUserInvalidPassResetTokenDate, mockUserPassResetToken } = require('../testUtils/testUtils')
const { apiURL, userEndpoints } = require('../../src/utils/utils')

const passwordResetTest = () => {
    describe('PASSWORD RESET', () => {
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

        it('GET returns 200 OK for password reset route', async () => {

            const response = await request(app).get(`${apiURL}/users/${userEndpoints.passwordResetEmail}`).send()
            expect(response.status).toBe(200)
        });

        it('POST returns 404 and Invalid Email message for password reset route if email is invalid', async () => {

            const response = await request(app).post(`${apiURL}/users/${userEndpoints.passwordResetEmail}`).send({ user_email: 'invalid@email.com' })
            expect(response.status).toBe(404)
            expect(response.body.validationErrors.invalidEmail).toBe("Email Inválido")
        });

        it.each`
        field    | value    | expected
        ${'user_email'} | ${null} | ${"Este campo precisa ser preenchido"}  
        ${'user_email'} | ${''} | ${"Este campo precisa ser preenchido"}  
        ${'user_email'} | ${'dfds@hgfg'} | ${"Este campo precisa ser preenchido"}  
        ${'user_email'} | ${'dfdshgfg.com'} | ${"Este campo precisa ser preenchido"}               
      `('POST returns $expected when $field is $value', async ({ field, value, expected }) => {

            const response = await request(app).post(`${apiURL}/users/${userEndpoints.passwordResetEmail}`).send({
                field: value
            })

            expect(response.status).toBe(400)
            expect(response.body.validationErrors[field]).toBe(expected)
        });


        it('POST returns 200 and Email Sent message for password reset route if email valid', async () => {
            await pool.query('BEGIN')
            const userRegistration = await mockUserFullRegistration()

            const response = await request(app).post(`${apiURL}/users/${userEndpoints.passwordResetEmail}`).send({ user_email: userRegistration.user.user_email })
            expect(response.status).toBe(200)
            expect(response.body.message).toBe('Email Sent')
            await pool.query('ROLLBACK')
        });

        it('POST saves password reset token and token expiration date to database', async () => {
            await pool.query('BEGIN')
            const userRegistration = await mockUserFullRegistration()

            const response = await request(app).post(`${apiURL}/users/${userEndpoints.passwordResetEmail}`).send({ user_email: userRegistration.user.user_email })
            const user = await pool.query('SELECT * FROM users LIMIT 1')
            expect(userRegistration.user.user_id).toEqual(user.rows[0].user_id)
            expect(userRegistration.user.user_email).toEqual(user.rows[0].user_email)
            expect(user.rows[0].pass_token).not.toBe(null)
            expect(user.rows[0].pass_token).not.toBeUndefined()
            expect(user.rows[0].pass_tk_date).not.toBe(null)
            expect(user.rows[0].pass_tk_date).not.toBeUndefined()
            await pool.query('ROLLBACK')
        });

        it('POST saves valid token expiration date to database', async () => {

            await pool.query('BEGIN')
            const userRegistration = await mockUserFullRegistration()

            await request(app).post(`${apiURL}/users/${userEndpoints.passwordResetEmail}`).send({ user_email: userRegistration.user.user_email })

            const user = await pool.query('SELECT * FROM users LIMIT 1')
            const dateNow = new Date(Date.now())
            const dbDate = new Date(user.rows[0].activation_tk_date)

            const isValidDate = dbDate > dateNow

            expect(isValidDate).toEqual(true)

            await pool.query('ROLLBACK')
        });

        it('GET returns 400 and Invalid Token message for route where user creates a new password if token is invalid', async () => {

            await pool.query('BEGIN')
            await mockUserFullRegistration()

            const response = await request(app).get(`${apiURL}/users/${userEndpoints.resetUserPass}/invalid-token`).send()

            expect(response.status).toBe(400)
            expect(response.body.message).toBe('Token Inválido')
            await pool.query('ROLLBACK')
        })


        it('GET returns 400 and Invalid Token message for route where user creates a new password if token date has expired', async () => {

            await pool.query('BEGIN')
            const userRegistration = await mockUserInvalidPassResetTokenDate()

            const response = await request(app).get(`${apiURL}/users/${userEndpoints.resetUserPass}/${userRegistration.user.pass_token}`).send()

            expect(response.body.message).toBe('Token Inválido')
            await pool.query('ROLLBACK')
        })

        it('GET returns 200 OK for route where user creates a new password if token and token date are valid', async () => {

            await pool.query('BEGIN')
            const userRegistration = await mockUserPassResetToken()

            const response = await request(app).get(`${apiURL}/users/${userEndpoints.resetUserPass}/${userRegistration.user.pass_token}`).send()

            expect(response.status).toBe(200)
            await pool.query('ROLLBACK')
        });



        it.each`
        field    | value    | expected         
        ${'new_password'} | ${null} | ${"Este campo precisa ser preenchido"} 
        ${'new_password'} | ${''} | ${"Este campo precisa ser preenchido"} 
        ${'new_password'} | ${'a'.repeat(7)} | ${"Senha precisa conter entre 8 e 25 caracteres"} 
        ${'new_password'} | ${'a'.repeat(26)} | ${"Senha precisa conter entre 8 e 25 caracteres"}
        ${'newPassConfirmation'} | ${null} | ${"Este campo precisa ser preenchido"}  
        ${'newPassConfirmation'} | ${''} | ${"Este campo precisa ser preenchido"} 
      `('POST returns $expected when $field is $value', async ({ field, value, expected }) => {

            await pool.query('BEGIN')
            const userRegistration = await mockUserPassResetToken()
            const fields = {}
            fields[field] = value
            const response = await request(app).post(`${apiURL}/users/${userEndpoints.resetUserPass}/${userRegistration.user.pass_token}`).send(fields)

            expect(response.status).toBe(400)
            expect(response.body.validationErrors[field]).toBe(expected)
            await pool.query('ROLLBACK')
        });

        it('POST returns Password confirmation does not match password when fields dont match', async () => {
            const invalidFields = {
                new_password: 'password',
                newPassConfirmation: 'paswrd'
            }
            await pool.query('BEGIN')
            const userRegistration = await mockUserPassResetToken()
            const response = await request(app).post(`${apiURL}/users/${userEndpoints.resetUserPass}/${userRegistration.user.pass_token}`).send(invalidFields)
            expect(response.status).toBe(400)
            expect(response.body.validationErrors.newPassConfirmation).toBe("Senhas precisam ser as mesmas")
            await pool.query('ROLLBACK')
        })

        it('POST returns 500 if trying to reset password without a token in url', async () => {
            const invalidFields = {
                new_password: 'password',
                newPassConfirmation: 'password'
            }
           
           
            const response = await request(app).post(`${apiURL}/users/${userEndpoints.resetUserPass}`).send(invalidFields)
            expect(response.status).toBe(500)
            
          
        });

        it('POST returns 404 if trying to reset password without a valid token in url', async () => {
            const invalidFields = {
                new_password: 'password',
                newPassConfirmation: 'password'
            }
           
           
            const response = await request(app).post(`${apiURL}/users/${userEndpoints.resetUserPass}/invalid-token`).send(invalidFields)
            expect(response.status).toBe(404)
            
          
        });

        it('POST saves new password to database if all is valid', async () => {
            const validFields = {
                new_password: 'P4SSword',
                newPassConfirmation: 'P4SSword'
            }
            await pool.query('BEGIN')
            const userRegistration = await mockUserPassResetToken()
            const response = await request(app).post(`${apiURL}/users/${userEndpoints.resetUserPass}/${userRegistration.user.pass_token}`).send(validFields)
            
            const updatedPassUser = await pool.query('SELECT * FROM users WHERE user_id = ($1)', [userRegistration.user.user_id])
            
            expect(response.status).toBe(200)
            expect(updatedPassUser.rows[0].user_name).toEqual(userRegistration.user.user_name)
            expect(updatedPassUser.rows[0].user_email).toEqual(userRegistration.user.user_email)
            expect(updatedPassUser.rows[0].password).not.toEqual(userRegistration.user.password)           
           
            await pool.query('ROLLBACK')
        })

        it('POST nullifies pass_token and pass_tk_date if password reset works', async () => {
            const validFields = {
                new_password: 'P4SSword',
                newPassConfirmation: 'P4SSword'
            }
            await pool.query('BEGIN')
            const userRegistration = await mockUserPassResetToken()
            const response = await request(app).post(`${apiURL}/users/${userEndpoints.resetUserPass}/${userRegistration.user.pass_token}`).send(validFields)
            
            const updatedPassUser = await pool.query('SELECT * FROM users WHERE user_id = ($1)', [userRegistration.user.user_id])
            
            expect(response.status).toBe(200)
            expect(updatedPassUser.rows[0].pass_token).toEqual(null)
            expect(updatedPassUser.rows[0].pass_tk_date).toEqual(null)
           
           
            await pool.query('ROLLBACK')
        })




    }) //describe block
}

module.exports = passwordResetTest