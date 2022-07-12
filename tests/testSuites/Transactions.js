const pool = require('../../config/index')
const { transactionsEndpoints} = require('../../src/utils/queryUtils')
const { requestTransactionsLog, getToken, postEnvelopeTransaction, insertAndRetrieveMockEnvelope, postTransferEnvelope } = require('../testUtils/testUtils')



const transactionTests = () => {   

    describe('TRANSACTIONS', () => {
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

        it('TRANSACTIONS GET returns 200 OK from transactions-log route', async () => {
           
            await pool.query('BEGIN')            
            const userInfo = await getToken()            
            const response = await requestTransactionsLog(userInfo.token)
            expect(response.status).toBe(200)
            await pool.query('ROLLBACK')
        });       

        it('TRANSACTIONS GET returns empty array when there is no transactions', async () => {
            await pool.query('BEGIN')
            const userInfo = await getToken()
            const response = await requestTransactionsLog(userInfo.token)
            expect(response.body.data).toEqual([])
            await pool.query('ROLLBACK')
        });

        it('TRANSACTIONS GET returns array with all transactions when there are transactions in db', async () => {
            await pool.query('BEGIN')
            const userInfo = await getToken()
            const existingEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id, 'Some title');
            
            await postEnvelopeTransaction(userInfo.token, existingEnvelope.env_id, 300.15, transactionsEndpoints.depositEndpoint)
            await postEnvelopeTransaction(userInfo.token, existingEnvelope.env_id, 233.15, transactionsEndpoints.depositEndpoint)

            const response = await requestTransactionsLog(userInfo.token)
            expect(response.body.data.length).toBe(1)
            await pool.query('ROLLBACK')
        });

        it('TRANSACTIONS DEPOSIT POST saves transaction_type, user_id, dest_env_id, t_date and amount to db ', async () => {
            const amount = 300.15
            await pool.query('BEGIN')
            const userInfo = await getToken()
            const existingEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id, 'Some title');
            await postEnvelopeTransaction(userInfo.token, existingEnvelope.env_id, amount, transactionsEndpoints.depositEndpoint)


            //const response = await requestTransactionsLog(userInfo.token)
            const logs = await pool.query('SELECT * FROM transactions where user_id = ($1)', [userInfo.user_id])
            expect(logs.rowCount).toBe(1)
            expect(logs.rows[0].transaction_type).toBe(transactionsEndpoints.depositEndpoint)
            expect(logs.rows[0].user_id).toBe(userInfo.user_id)
            expect(logs.rows[0].dest_acc_id).toBe(existingEnvelope.env_id)
            expect(logs.rows[0].t_date).not.toBe(null)
            expect(parseFloat(logs.rows[0].amount)).toBe(amount)
            await pool.query('ROLLBACK')
        });

       it('TRANSACTIONS WITHDRAW POST saves transaction_type, user_id, dest_env_id, t_date and amount to db ', async () => {
            const amount = 300.15
            const withdrawAmount = 200.02
            await pool.query('BEGIN')
            const userInfo = await getToken()
            await pool.query('INSERT INTO total_budget (user_id, total_budget) VALUES ($1, $2) RETURNING *', [userInfo.user_id ,amount])

            const existingEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id, 'Some title', amount);
            await postEnvelopeTransaction(userInfo.token, existingEnvelope.env_id, withdrawAmount, transactionsEndpoints.withdrawEndpoint)


            //const response = await requestTransactionsLog(userInfo.token)
            const logs = await pool.query('SELECT * FROM transactions where user_id = ($1)', [userInfo.user_id])

            expect(logs.rowCount).toBe(1)
            expect(logs.rows[0].transaction_type).toBe(transactionsEndpoints.withdrawEndpoint)
            expect(logs.rows[0].user_id).toBe(userInfo.user_id)
            expect(logs.rows[0].dest_acc_id).toBe(existingEnvelope.env_id)
            expect(logs.rows[0].t_date).not.toBe(null)
            expect(parseFloat(logs.rows[0].amount)).toBe(withdrawAmount)
            await pool.query('ROLLBACK')
        });  

        it('TRANSACTIONS TRANSFER POST saves transaction_type, user_id, source_env_id, dest_env_id, t_date and amount to db ', async () => {
            const envelopeBudget = 231.45
            const amountToTransfer = 230.43
            await pool.query('BEGIN')
            const userInfo = await getToken()           
            
            const sourceEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id,'Some title', envelopeBudget);            
            const destinationEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id,'Second Envelope');
                        

            await postTransferEnvelope(userInfo.token,sourceEnvelope.env_id, amountToTransfer, destinationEnvelope.env_id, transactionsEndpoints.transferEndpoint)
            const logs = await pool.query('SELECT * FROM transactions where user_id = ($1)', [userInfo.user_id])

            expect(logs.rowCount).toBe(1)
            expect(logs.rows[0].transaction_type).toBe(transactionsEndpoints.transferEndpoint)
            expect(logs.rows[0].user_id).toBe(userInfo.user_id)
            expect(logs.rows[0].source_acc_id).toBe(sourceEnvelope.env_id)
            expect(logs.rows[0].dest_acc_id).toBe(destinationEnvelope.env_id)
            expect(logs.rows[0].t_date).not.toBe(null)
            expect(parseFloat(logs.rows[0].amount)).toBe(amountToTransfer)
            
            await pool.query('ROLLBACK') 
            
            
        });  
    })//describe block ALL TRANSACTIONS GET

    


}

module.exports = transactionTests