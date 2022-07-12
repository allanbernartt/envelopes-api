const request = require('supertest')
const app = require('../../app')
const { apiURL } = require('../../src/utils/utils')
const bcryptjs = require('bcryptjs')
const pool = require('../../config/index')
const { getToken, insertAndRetrieveMockEnvelope } = require('../testUtils/testUtils')


const validEnvelope = {
    title: 'Groceries',
}

const postEnvelope = (token, envelope = validEnvelope) => {


    return request(app)
        .post(`${apiURL}/envelopes`)
        .set('Authorization', 'Bearer ' + token)
        .send(envelope)
}

const requestGetEnvelope = (token) => {
    return request(app).get(`${apiURL}/envelopes`)
        .set('Authorization', 'Bearer ' + token)
        .send()
}

const validUpdatedUserObject = {
    title: 'new title',
}

const updateEnvelope = (token, envelope = validUpdatedUserObject, id) => {
    return request(app).put(`${apiURL}/envelopes/${id}`)
        .set('Authorization', 'Bearer ' + token)
        .send(envelope)
}

const getEnvelopeById = (token, id) => {

    return request(app).get(`${apiURL}/envelopes/${id}`)
        .set('Authorization', 'Bearer ' + token)
        .send();
}



const envelopeTests = () => {
    describe('Envelopes', () => {
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

        //BEGIN TESTS

        it('ENVELOPES GET returns 200 if user is logged in', async () => {

            await pool.query('BEGIN')

            const userInfo = await getToken()
            const response = await requestGetEnvelope(userInfo.token)

            expect(response.status).toBe(200)

            await pool.query('ROLLBACK')

        });

        it('ENVELOPES GET returns 200 and all users envelopes if user is logged in', async () => {
            await pool.query('BEGIN')

            const userInfo = await getToken()

            await postEnvelope(userInfo.token)

            const response = await requestGetEnvelope(userInfo.token)

            expect(response.status).toBe(200)
            expect(response.body.envelopes.length).toBe(1)
            await pool.query('ROLLBACK')
        });

        it('ENVELOPES GET returns 200 and empty array when no envelopes are found', async () => {
            const userInfo = await getToken()
            const response = await requestGetEnvelope(userInfo.token)

            expect(response.status).toBe(200)
            expect(response.body.envelopes).toEqual([])

        });

        it('ENVELOPES POST saves envelope to database if user is logged in', async () => {
            await pool.query('BEGIN')

            const userInfo = await getToken()
            const response = await postEnvelope(userInfo.token)

            const envelopes = await pool.query('SELECT * FROM envelopes')

            expect(response.status).toBe(201)
            expect(response.body.message).toBe(`Envelope created with id ${envelopes.rows[0].env_id}`)
            await pool.query('ROLLBACK')
        });

        it('ENVELOPES POST saves title to database if user is logged in', async () => {
            await pool.query('BEGIN')
            const userInfo = await getToken()
            const response = await postEnvelope(userInfo.token)

            const envelopes = await pool.query('SELECT * FROM envelopes')

            expect(response.status).toBe(201)
            expect(envelopes.rows[0].title).toBe(validEnvelope.title)
            expect(parseFloat(envelopes.rows[0].budget)).toBe(0.00)
            await pool.query('ROLLBACK')
        });

        it('ENVELOPES POST returns 400 when trying to save invalid envelope if user is logged in', async () => {
            await pool.query('BEGIN')
            const userInfo = await getToken()
            const response = await postEnvelope(userInfo.token, {
                title: null
            })
            const envelopes = await pool.query('SELECT * FROM envelopes')

            expect(response.status).toBe(400)
            expect(envelopes.rows.length).toBe(0)
            await pool.query('ROLLBACK')
        });

        it('ENVELOPES POST returns validationErrors field when trying to save invalid envelope if user is logged in', async () => {
            await pool.query('BEGIN')
            const userInfo = await getToken()
            const response = await postEnvelope(userInfo.token, {
                title: null,
            })
            const envelopes = await pool.query('SELECT * FROM envelopes')

            expect(response.status).toBe(400)
            expect(envelopes.rows.length).toBe(0)
            expect(response.body.validationErrors).not.toBeUndefined()
            await pool.query('ROLLBACK')
        });

        it('ENVELOPES POST returns errors for title when trying to save invalid envelope', async () => {
            await pool.query('BEGIN')
            const userInfo = await getToken()
            const response = await postEnvelope(userInfo.token, {
                title: null,
            })
            const envelopes = await pool.query('SELECT * FROM envelopes')

            expect(response.status).toBe(400)
            expect(envelopes.rows.length).toBe(0)
            expect(Object.keys(response.body.validationErrors)).toStrictEqual(['title'])
            await pool.query('ROLLBACK')
        });

        it.each`
        field    | value    | expected
        ${'title'} | ${null} | ${"Este campo precisa ser preenchido"}
        ${'title'} | ${''} | ${"Este campo precisa ser preenchido"}
        ${'title'} | ${'e'} | ${"Título precisa ter entre 2 e 14 caracteres"}
        ${'title'} | ${'e'.repeat(26)} | ${"Título precisa ter entre 2 e 14 caracteres"}    
      `('ENVELOPES POST returns $expected when $field is $value', async ({ field, value, expected }) => {
            const envelope = {

            }
            envelope[field] = value
            const userInfo = await getToken()
            const response = await postEnvelope(userInfo.token, envelope)
            expect(response.status).toBe(400)
            expect(response.body.validationErrors[field]).toBe(expected)
        });

        it('ENVELOPES GET returns 200 and Envelope when getting envelope by id', async () => {
            await pool.query('BEGIN')

            const userInfo = await getToken()
            const existingEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id, 'Some title');
            const response = await getEnvelopeById(userInfo.token, existingEnvelope.env_id)

            const compareEnvelope = {
                ...existingEnvelope,
                created_at: existingEnvelope.created_at.toISOString()
            }

            const date = response.body.envelopes.created_at
            const bodyEnvelope = {
                ...response.body.envelopes,
                created_at: date.toString()
            }


            expect(response.status).toBe(200);
            expect(bodyEnvelope).toEqual(compareEnvelope);
            await pool.query('ROLLBACK')

        });

        it('ENVELOPES PUT returns 404 and message Envelope Not Found when getting envelope by invalid id', async () => {
            const userInfo = await getToken()
            const response = await getEnvelopeById(userInfo.token, '-1');

            expect(response.status).toBe(404);
            expect(response.body.validationErrors.invalidId).toBe("Envelope Não Encontrado")
        });

        it('ENVELOPES PUT updates envelope succesfully', async () => {
            await pool.query('BEGIN')
            const userInfo = await getToken()
            const oldEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id, 'old title')

            const updatedEnvelopeObject = {
                title: 'new title',
            }


            const response = await updateEnvelope(userInfo.token, updatedEnvelopeObject, oldEnvelope.env_id)
            const getUpdatedUserQuery = 'SELECT env_id, title, budget FROM envelopes WHERE user_id = ($1) AND env_id = ($2)'
            const fetchedUpdatedUser = await pool.query(getUpdatedUserQuery, [userInfo.user_id, oldEnvelope.env_id])

            expect(response.status).toBe(200)
            expect(oldEnvelope.title).toBe('old title')
            expect(parseFloat(oldEnvelope.budget)).toBe(0.00)
            expect(fetchedUpdatedUser.rows[0].title).toBe(updatedEnvelopeObject.title)
            expect(parseFloat(fetchedUpdatedUser.rows[0].budget)).toBe(0.00)

            await pool.query('ROLLBACK')

        });


        it('ENVELOPES PUT returns 404 and message Envelope Not Found when trying to update an envelope wih non-existing id', async () => {

            const updatedUserObject = {
                title: 'new title',
            }

            const userInfo = await getToken()
            const response = await updateEnvelope(userInfo.token, updatedUserObject, -1)

            expect(response.status).toBe(404)
            expect(response.body.validationErrors.message).toBe("Envelope Não Encontrado")
        });

        it.each`
        field    | value    | expected
        ${'title'} | ${null} | ${"Este campo precisa ser preenchido"}
        ${'title'} | ${''} | ${"Este campo precisa ser preenchido"}
        ${'title'} | ${'e'} | ${"Título precisa ter entre 2 e 14 caracteres"}
        ${'title'} | ${'e'.repeat(26)} | ${"Título precisa ter entre 2 e 14 caracteres"}    
      `('ENVELOPES PUT returns $expected when $field is $value', async ({ field, value, expected }) => {
            const envelope = {

            }
            envelope[field] = value
            const userInfo = await getToken()
            const response = await updateEnvelope(userInfo.token, envelope, 1)
            expect(response.status).toBe(400)
            expect(response.body.validationErrors[field]).toBe(expected)
        });

        it('ENVELOPES DELETE returns 202 and message Envelope with id <id> was succesfully removed when envelope is succesfully deleted', async () => {
            await pool.query('BEGIN')

            const userInfo = await getToken()
            const existingEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id, 'Some title');

            const response = await request(app).delete(`${apiURL}/envelopes/${existingEnvelope.env_id}`)
                .set('Authorization', 'Bearer ' + userInfo.token)
                .send()

            expect(response.status).toBe(202)
            expect(response.body.message).toBe(`Envelope with id ${existingEnvelope.env_id} was succesfully removed`)
            await pool.query('ROLLBACK')
        });

        it('ENVELOPES DELETE returns 404 and message Envelope not found when envelope doesnt exists', async () => {
            const userInfo = await getToken()
            const response = await request(app).delete(`${apiURL}/envelopes/-1`)
                .set('Authorization', 'Bearer ' + userInfo.token)
                .send()

            expect(response.status).toBe(404)
            expect(response.body.validationErrors.message).toBe("Envelope Não Encontrado")
        })

        it('ENVELOPES DELETE subtracts from Total Budget the deleted envelope budget', async () => {

            const createEnvelopeQuery = "INSERT INTO envelopes(env_id, user_id, title, budget)VALUES($1, $2, $3, $4) RETURNING *";
            const insertTotalBudgetQuery = 'INSERT INTO total_budget (user_id, total_budget) VALUES ($1, $2)';
            const getTotalBudgetQuery = 'SELECT * FROM total_budget WHERE user_id = ($1)';
            await pool.query('BEGIN')
            const userInfo = await getToken()
            await pool.query(insertTotalBudgetQuery, [userInfo.user_id, 200.00]);

            const oldTotalBudget = await pool.query(getTotalBudgetQuery, [userInfo.user_id])
            const oldCopy = { ...oldTotalBudget.rows[0] }

            const envelope = await pool.query(createEnvelopeQuery, ['0977-65464', userInfo.user_id, 'envelope', 200.00]);

            const response = await request(app).delete(`${apiURL}/envelopes/${envelope.rows[0].env_id}`)
                .set('Authorization', 'Bearer ' + userInfo.token)
                .send()

            const updatedBuget = await pool.query(getTotalBudgetQuery, [userInfo.user_id])
            expect(response.status).toBe(202)
            expect(parseFloat(oldCopy.total_budget)).toBe(200)
            expect(parseFloat(updatedBuget.rows[0].total_budget)).toBe(0.00)
            await pool.query('ROLLBACK')
        });
    })
}

module.exports = envelopeTests;