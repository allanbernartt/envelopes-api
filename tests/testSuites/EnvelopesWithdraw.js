const { getToken, requestGetEnvelope, postEnvelopeTransaction, insertAndRetrieveMockEnvelope} = require('../testUtils/testUtils')
const pool = require('../../config/index')

const transactionsTests = (endpoint) => {
    describe('Transactions WITHDRAW', () => {

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

        it('WITHDRAW GET returns 200 OK and envelope by id', async () => {

            await pool.query('BEGIN')
            const userInfo = await getToken()
            const existingEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id,'Some title');
            
            const response = await requestGetEnvelope(userInfo.token, existingEnvelope.env_id, endpoint);

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
       

        it('WITHDRAW GET returns 404 and Envelope Not Found when envelope id is invalid', async () => {

            await pool.query('BEGIN')
            const userInfo = await getToken()    
                      
            const response = await requestGetEnvelope(userInfo.token, -1, endpoint);

            expect(response.status).toBe(404);
            expect(response.body.validationErrors.invalidId).toEqual("Envelope Não Encontrado");

            await pool.query('ROLLBACK')
        });

        it('WITHDRAW POST returns 202 and envelope with updated budget', async () => {
            const budget = 250.45
            const withdrawBudget = 100.22
            await pool.query('BEGIN')
            const userInfo = await getToken()
            await pool.query('INSERT INTO total_budget (user_id, total_budget) VALUES ($1, $2) RETURNING *', [userInfo.user_id ,1000.00])
            const existingEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id ,'Some title', budget);
            const updatedWithdrawAmount = budget - withdrawBudget
            const updatedEnvelope = { ...existingEnvelope, budget: updatedWithdrawAmount }
            const response = await postEnvelopeTransaction(userInfo.token, existingEnvelope.env_id, withdrawBudget, endpoint)


            expect(response.status).toBe(202);
            expect(response.body.destinationEnvelope.title).toBe(updatedEnvelope.title);
            expect(parseFloat(response.body.destinationEnvelope.budget)).toBe(updatedEnvelope.budget);
            await pool.query('ROLLBACK')
        });       

        it('WITHDRAW POST returns 404 and Envelope Not Found when envelope id is invalid', async () => {

            await pool.query('BEGIN')

            const userInfo = await getToken()
            await pool.query('INSERT INTO total_budget (user_id, total_budget) VALUES ($1, $2) RETURNING *', [userInfo.user_id ,1000.00])
               
            const response = await postEnvelopeTransaction(userInfo.token,-1, 400, endpoint)

            expect(response.status).toBe(404);
            expect(response.body.validationErrors.invalidId).toEqual("Envelope Não Encontrado");
            await pool.query('ROLLBACK')
        });

        it('WITHDRAW POST returns 400 and Envelope with insufficient funds when withdraw amount is larger than envelope funds', async () => {
            const budget = 50.45
            const withdrawBudget = 100.22

            await pool.query('BEGIN')

            const userInfo = await getToken()
            await pool.query('INSERT INTO total_budget (user_id, total_budget) VALUES ($1, $2) RETURNING *', [userInfo.user_id ,1000.00])
               
            const existingEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id,'Some title', budget);
            
            const response = await postEnvelopeTransaction(userInfo.token,existingEnvelope.env_id, withdrawBudget, endpoint)

            expect(response.status).toBe(400);
            expect(response.body.validationErrors.insufficientFunds).toBe("Envelope sem fundos suficientes")
            await pool.query('ROLLBACK')
        });

        it('WITHDRAW POST saves decreased updated envelope budget to database', async () => {
            const budget = 129.55
            const withdrawBudget = 100.22
            const updatedBudget = budget - withdrawBudget

            await pool.query('BEGIN')
            const userInfo = await getToken()

            await pool.query('INSERT INTO total_budget (user_id, total_budget) VALUES ($1, $2) RETURNING *', [userInfo.user_id,1000.00])
            const existingEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id, 'Some title', budget);

            await postEnvelopeTransaction(userInfo.token,existingEnvelope.env_id, withdrawBudget, endpoint)

            const updatedEnvelope = await pool.query('SELECT * FROM envelopes WHERE user_id = ($1) AND env_id = ($2)', [userInfo.user_id, existingEnvelope.env_id])

            expect(updatedEnvelope.rows[0].title).toBe(existingEnvelope.title);
            expect(parseFloat(updatedEnvelope.rows[0].budget)).toBe(parseFloat(updatedBudget.toFixed(2)));
            await pool.query('ROLLBACK')
        });

        it('WITHDRAW POST keeps total budget unchanged when envelope id is invalid', async () => {
            await pool.query('BEGIN')
            const totalBudget = 1000.00
            const userInfo = await getToken()
            await pool.query('INSERT INTO total_budget (user_id, total_budget) VALUES ($1, $2) RETURNING *', [userInfo.user_id ,totalBudget])
               
            const response = await postEnvelopeTransaction(userInfo.token,-1, 400, endpoint)

            const afterPostTotalBudget = await pool.query('SELECT * FROM total_budget where user_id = ($1)', [userInfo.user_id])

            expect(response.status).toBe(404);
            expect(parseFloat(afterPostTotalBudget.rows[0].total_budget)).toBe(totalBudget);
            await pool.query('ROLLBACK')
        })

        it('WITHDRAW POST decreases total budget with envelope budget if total budget is greater than amount to be decreased', async () => {
            const budget = 629.55
            const mockBudget = 1219.77
            const expectedTotal = mockBudget - budget

            await pool.query('BEGIN');
            const userInfo = await getToken()
            const existingEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id, 'Some title', budget);
            const mockTotalBudget = await pool.query('INSERT INTO total_budget (user_id, total_budget) VALUES ($1, $2) RETURNING *', [userInfo.user_id, mockBudget])
            const comparissonEnvelope = { ...existingEnvelope, budget: expectedTotal.toFixed(2) }

            await postEnvelopeTransaction(userInfo.token, existingEnvelope.env_id, budget, endpoint)

            const updatedTotalBudget = await pool.query('SELECT * from total_budget WHERE user_id = ($1) AND id = ($2)', [userInfo.user_id, mockTotalBudget.rows[0].id])

            expect(updatedTotalBudget.rows[0].total_budget).toEqual(comparissonEnvelope.budget)

            await pool.query('ROLLBACK')

        });

        it('WITHDRAW POST returns 400 Total Budget must be greater than withdraw amount if total budget is less than amount to be decreased', async () => {
            const budget = 629.55
            const mockBudget = 219.77            

            await pool.query('BEGIN');
            const userInfo = await getToken()
            const existingEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id, 'Some title', budget);
            const mockTotalBudget = await pool.query('INSERT INTO total_budget (user_id, total_budget) VALUES ($1, $2) RETURNING *', [userInfo.user_id, mockBudget])
            
            const response = await postEnvelopeTransaction(userInfo.token, existingEnvelope.env_id, budget, endpoint)

            await pool.query('SELECT * from total_budget WHERE user_id = ($1) AND id = ($2)', [userInfo.user_id, mockTotalBudget.rows[0].id])

            expect(response.status).toBe(400)
            expect(response.body.validationErrors.insufficientFunds).toEqual("Orçamento Total precisa ser maior que o valor sacado")
            
            await pool.query('ROLLBACK')

        }); 
        
        it.each`
        field    | value    | expected
        ${'budget'} | ${null} | ${"Este campo precisa ser preenchido"}  
        ${'budget'} | ${''} | ${"Este campo precisa ser preenchido"}     
        ${'budget'} | ${'dd'} | ${"Este campo precisa ser numérico"}    
      `('WITHDRAW POST returns $expected when $field is $value', async ({field, value, expected}) => {
        
       
        const userInfo = await getToken()
        const response = await postEnvelopeTransaction(userInfo.token, 1, value, endpoint)
        expect(response.status).toBe(400)
        expect(response.body.validationErrors[field]).toBe(expected)
      });


    }) //describe DEPOSIT POST block


} // transaction function

module.exports = transactionsTests;