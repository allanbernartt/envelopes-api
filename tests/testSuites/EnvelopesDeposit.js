const pool = require('../../config/index')
const { getToken, requestGetEnvelope, postEnvelopeTransaction, insertAndRetrieveMockEnvelope } = require('../testUtils/testUtils')


const transactionsTests = (endpoint) => {
    describe('Transactions DEPOSIT', () => {

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

        

        it('DEPOSIT GET returns 200 OK and envelope by id', async () => {

            await pool.query('BEGIN')
            const userInfo = await getToken()
            const existingEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id,'Some title');

            const response = await requestGetEnvelope(userInfo.token, existingEnvelope.env_id, endpoint)


            const compareEnvelope = {
                ...existingEnvelope,
                created_at: existingEnvelope.created_at.toISOString()
            }

            const date = response.body.destinationEnvelope.created_at
            const bodyEnvelope = {
                ...response.body.destinationEnvelope,
                created_at: date.toString()
            }


            expect(response.status).toBe(200);
            expect(bodyEnvelope).toEqual(compareEnvelope);
            await pool.query('ROLLBACK')
        });

        it('DEPOSIT GET returns 404 and Envelope Not Found when id is invalid', async () => {

            await pool.query('BEGIN')
            const userInfo = await getToken()
            const response = await requestGetEnvelope(userInfo.token, -1 , endpoint)

            expect(response.status).toBe(404);
            expect(response.body.validationErrors.invalidId).toEqual("Envelope Não Encontrado");

            await pool.query('ROLLBACK')
        });        

        it('DEPOSIT POST returns 202 and envelope with updated budget', async () => {
            const budget = 250.45
            await pool.query('BEGIN')
            const userInfo = await getToken()
            const existingEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id,'Some title');
           
            const updatedEnvelope = { ...existingEnvelope, budget }
            const response = await postEnvelopeTransaction(userInfo.token, existingEnvelope.env_id, budget, endpoint)


            expect(response.status).toBe(202);
            expect(response.body.destinationEnvelope.title).toBe(updatedEnvelope.title);
            expect(parseFloat(response.body.destinationEnvelope.budget)).toBe(updatedEnvelope.budget);
            await pool.query('ROLLBACK')
        });

        it('DEPOSIT POST increments old envelope budget with updated budget', async () => {
            const budget = 250.45
            const addedBudget = 100.23
            await pool.query('BEGIN')
            const userInfo = await getToken()
            const existingEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id,'Some title', budget);
           
            const updatedEnvelope = { ...existingEnvelope, budget }
            const response = await postEnvelopeTransaction(userInfo.token, existingEnvelope.env_id, addedBudget, endpoint)


            const expectedTotal = budget + addedBudget

            expect(parseFloat(existingEnvelope.budget)).toBe(budget);
            expect(parseFloat(response.body.destinationEnvelope.budget)).toBe(expectedTotal);
            await pool.query('ROLLBACK')
        });       

        it('DEPOSIT POST returns 404 and Envelope Not Found when id is invalid', async () => {

            await pool.query('BEGIN')

            const userInfo = await getToken()
            const response = await postEnvelopeTransaction(userInfo.token, -1, 400, endpoint)

            expect(response.status).toBe(404);
            expect(response.body.validationErrors.invalidId).toEqual("Envelope Não Encontrado");
            await pool.query('ROLLBACK')
        });

        it('DEPOSIT POST keeps Total Budget unchanged when id is invalid', async () => {

            await pool.query('BEGIN')
            const userInfo = await getToken()
            const response = await postEnvelopeTransaction(userInfo.token, -1, 400, endpoint)

            const afterPostTotalBudget = await pool.query('SELECT * FROM total_budget WHERE user_id = ($1)', [userInfo.user_id])

            expect(response.status).toBe(404);
            expect(afterPostTotalBudget.rowCount).toEqual(0);
            await pool.query('ROLLBACK')
        });

        it('DEPOSIT POST saves updated envelope budget to database', async () => {
            const budget = 129.55
            await pool.query('BEGIN')
            const userInfo = await getToken()
            const existingEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id,'Some title');
            const comparissonEnvelope = { ...existingEnvelope, budget }
            await postEnvelopeTransaction(userInfo.token, existingEnvelope.env_id, budget, endpoint)

            const updatedEnvelope = await pool.query('SELECT * FROM envelopes WHERE user_id = ($1) AND env_id = ($2)', [userInfo.user_id, existingEnvelope.env_id])

            expect(updatedEnvelope.rows[0].title).toBe(comparissonEnvelope.title);
            expect(parseFloat(updatedEnvelope.rows[0].budget)).toBe(comparissonEnvelope.budget);
            await pool.query('ROLLBACK')
        });

        it('DEPOSIT POST creates total budget with envelope budget if total budget is not defined', async () => {
            const budget = 129.55

            await pool.query('BEGIN');
            const userInfo = await getToken()
            const existingEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id,'Some title');
            const comparissonEnvelope = { ...existingEnvelope, budget }
            const response = await postEnvelopeTransaction(userInfo.token,existingEnvelope.env_id, budget, endpoint)


            expect(response.body.destinationEnvelope.title).toEqual(comparissonEnvelope.title)
            expect(parseFloat(response.body.destinationEnvelope.budget)).toEqual(comparissonEnvelope.budget)
            expect(response.body.totalBudget).not.toBeUndefined()
            await pool.query('ROLLBACK')

        });

        it('DEPOSIT POST increments total budget with envelope budget if total budget is defined', async () => {
            const mockEnvelopeBudget = 342.76
            const mockTotalBudgetBudget = 768.32

            await pool.query('BEGIN');

            const userInfo = await getToken()
            //saves mock envelope to database
            const existingEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id, 'Mock Envelope');

            //creates a total budget to be updated with post request
            await pool.query('INSERT INTO total_budget (user_id, total_budget) VALUES ($1, $2) RETURNING id', [userInfo.user_id, mockTotalBudgetBudget])

            //sends post request to api
            const response = await postEnvelopeTransaction(userInfo.token, existingEnvelope.env_id, mockEnvelopeBudget, endpoint)


            const expectedTotal = mockEnvelopeBudget + mockTotalBudgetBudget

            expect(parseFloat(response.body.totalBudget.total_budget)).toBe(expectedTotal)
            await pool.query('ROLLBACK')

        });

        it.each`
        field    | value    | expected
        ${'budget'} | ${null} | ${"Este campo precisa ser preenchido"}  
        ${'budget'} | ${''} | ${"Este campo precisa ser preenchido"}     
        ${'budget'} | ${'dd'} | ${"Este campo precisa ser numérico"}    
      `('DEPOSIT POST returns $expected when $field is $value', async ({ field, value, expected }) => {
            const envelope = {
                title: 'Test envelope',

            }

            await pool.query('BEGIN')
            const userInfo = await getToken()
            const response = await postEnvelopeTransaction(userInfo.token,envelope, value, endpoint)
            expect(response.status).toBe(400)
            expect(response.body.validationErrors[field]).toBe(expected)
            await pool.query('ROLLBACK')
        }); 


    }) //describe DEPOSIT POST block

   
} // transaction function

module.exports = transactionsTests;