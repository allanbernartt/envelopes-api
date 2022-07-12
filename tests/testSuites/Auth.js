const request = require('supertest')
const app = require('../../app')
const { apiURL } = require('../../src/utils/utils')
const pool = require('../../config/index')
const { getToken, insertAndRetrieveMockEnvelope, requestGetEnvelope, postEnvelopeTransaction, postTransferEnvelope, requestTransactionsLog } = require('../testUtils/testUtils')
const { transactionsEndpoints } = require('../../src/utils/queryUtils')
const bcryptjs = require('bcryptjs')

const validEnvelope = {
    title: 'Groceries',
}

const postEnvelope = (token, envelope = validEnvelope) => {


    return request(app)
        .post(`${apiURL}/envelopes`)
        .set('Authorization', 'Bearer ' + token)
        .send(envelope)
}

const updateEnvelope = (token, envelope = validUpdatedUserObject, id) => {
    return request(app).put(`${apiURL}/envelopes/${id}`)
        .set('Authorization', 'Bearer ' + token)
        .send(envelope)
}

const authTest = () => {


    describe('Auth and Activation', () => {

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


        it('AUTH ENVELOPES GET returns 401 and Please authenticate if user is not logged in', async () => {
            const response = await request(app).get(`${apiURL}/envelopes`).send()

            expect(response.status).toBe(403)
            expect(response.body.message).toBe("Favor entrar na sua conta")

        });

        it('AUTH ENVELOPES GET returns 401 and Please authenticate if token is not in user.tokens', async () => {
            const response = await request(app).get(`${apiURL}/envelopes`)
                .set('Authorization', 'Bearer ' + 'gfgfgfgf.45454544.fgfgf')
                .send()

            expect(response.status).toBe(403)
            expect(response.body.message).toBe("Favor entrar na sua conta")
        });

        it('AUTH ENVELOPES POST returns 401 and Please authenticate when posting envelope without being authenticated', async () => {
            const invalidToken = 'fdfdfd.kkk'

            const response = await postEnvelope(invalidToken)

            expect(response.status).toBe(403)

        });

        it('AUTH ENVELOPES GET returns 401 and Please authenticate when getting envelope by id without being logged in', async () => {
            await pool.query('BEGIN')

            const userInfo = await getToken()
            const existingEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id, 'Some title');
            const response = await request(app).get(`${apiURL}/envelopes/${existingEnvelope.env_id}`)
                .send();

            expect(response.status).toBe(403)
            expect(response.body.message).toBe("Favor entrar na sua conta")
            await pool.query('ROLLBACK')

        });

        it('AUTH ENVELOPES PUT returns 401 and Please authenticate when trying to update envelope without authentication', async () => {
            await pool.query('BEGIN')
            const userInfo = await getToken()
            const oldEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id, 'old title')

            const updatedEnvelopeObject = {
                title: 'new title',
            }


            const response = await updateEnvelope(null, updatedEnvelopeObject, oldEnvelope.env_id)
            const getUpdatedUserQuery = 'SELECT env_id, title, budget FROM envelopes WHERE user_id = ($1) AND env_id = ($2)'
            const fetchedUpdatedUser = await pool.query(getUpdatedUserQuery, [userInfo.user_id, oldEnvelope.env_id])

            expect(response.status).toBe(403)
            expect(oldEnvelope.title).toBe('old title')
            expect(parseFloat(oldEnvelope.budget)).toBe(0.00)
            expect(fetchedUpdatedUser.rows[0].title).toBe(oldEnvelope.title)
            expect(parseFloat(fetchedUpdatedUser.rows[0].budget)).toBe(0.00)
            expect(response.body.message).toBe("Favor entrar na sua conta")
            await pool.query('ROLLBACK')

        });

        it('AUTH ENVELOPES DELETE returns 401 and Please authenticate when deleting envelope without authentication', async () => {
            await pool.query('BEGIN')

            const userInfo = await getToken()
            const existingEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id, 'Some title');

            const response = await request(app).delete(`${apiURL}/envelopes/${existingEnvelope.env_id}`)
                .send()

            expect(response.status).toBe(403)
            expect(response.body.message).toBe("Favor entrar na sua conta")
            await pool.query('ROLLBACK')
        });


        it('DEPOSIT GET returns 401 and Please authenticate when user is not authenticated', async () => {

            await pool.query('BEGIN')
            const userInfo = await getToken()
            const existingEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id, 'Some title');

            const response = await requestGetEnvelope(null, existingEnvelope.env_id, transactionsEndpoints.depositEndpoint)

            expect(response.status).toBe(403)
            expect(response.body.message).toBe("Favor entrar na sua conta")
            await pool.query('ROLLBACK')
        });

        it('DEPOSIT POST returns 401 and Please authenticate when user is not authenticated', async () => {
            const budget = 250.45
            await pool.query('BEGIN')
            const userInfo = await getToken()
            const existingEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id, 'Some title');

            const updatedEnvelope = { ...existingEnvelope, budget }
            const response = await postEnvelopeTransaction('invalidToken', existingEnvelope.env_id, budget, transactionsEndpoints.depositEndpoint)


            expect(response.status).toBe(403);
            expect(response.body.message).toBe("Favor entrar na sua conta")
            await pool.query('ROLLBACK')
        });

        it('TRANSFER GET returns 401 and Please authenticate if user is not authenticated', async () => {

            await pool.query('BEGIN')
            const userInfo = await getToken()
            const existingEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id, 'Some title');
            const response = await requestGetEnvelope('invalid token', existingEnvelope.env_id, transactionsEndpoints.transferEndpoint)

            expect(response.status).toBe(403);
            expect(response.body.message).toBe("Favor entrar na sua conta")
            await pool.query('ROLLBACK')
        });

        it('TRANSFER POST return 401 and Please authenticate if user is not authenticated', async () => {
            const envelopeBudget = 230.45
            const amountToTransfer = 230.46
            await pool.query('BEGIN')
            const userInfo = await getToken()

            const existingEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id, 'Some title', envelopeBudget);

            const destinationEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id, 'Second Envelope');
            const response = await postTransferEnvelope('invalid token', existingEnvelope.env_id, amountToTransfer, destinationEnvelope.env_id, transactionsEndpoints.transferEndpoint)
            expect(response.status).toBe(403);
            expect(response.body.message).toBe("Favor entrar na sua conta")
            await pool.query('ROLLBACK')
        });

        it('WITHDRAW GET returns 401 and Please authenticate when user is not authenticated', async () => {

            await pool.query('BEGIN')
            const userInfo = await getToken()
            const existingEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id, 'Some title');

            const response = await requestGetEnvelope('invalidToken', existingEnvelope.env_id, transactionsEndpoints.withdrawEndpoint);

            expect(response.status).toBe(403);
            expect(response.body.message).toBe("Favor entrar na sua conta")
            await pool.query('ROLLBACK')
        });

        it('WITHDRAW POST returns 401 and Please authenticate when user is not authenticated', async () => {

            await pool.query('BEGIN')
            const response = await postEnvelopeTransaction('invalidToken', 1, 10, transactionsEndpoints.withdrawEndpoint)
            expect(response.status).toBe(403);
            expect(response.body.message).toBe("Favor entrar na sua conta")
            await pool.query('ROLLBACK')
        });

        it('TRANSACTIONS GET returns 401 and Please authenticate if user is not authenticated', async () => {
            await pool.query('BEGIN')

            const response = await requestTransactionsLog('invalid token')
            expect(response.status).toBe(403);
            expect(response.body.message).toBe("Favor entrar na sua conta")
            await pool.query('ROLLBACK')
        });

    }) // describe block
}

module.exports = authTest