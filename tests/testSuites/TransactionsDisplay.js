const bcryptjs = require('bcryptjs')
const pool = require('../../config/index')
const { requestTransactionsLog, getToken, postEnvelopeTransaction, insertAndRetrieveMockEnvelope, postTransferEnvelope } = require('../testUtils/testUtils')
const { transactionsEndpoints, transactionQueries, envelopeTransactionsQuery, joinTransactionsQuery } = require('../../src/utils/queryUtils')
const { v4: uuidv4 } = require('uuid')

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

        it('TRANSACTIONS DISPLAY GET returns only transactions from a user_id', async () => {

            await pool.query('BEGIN')

            const hashedPass = await bcryptjs.hash('P4ssword', 12)
            const user_id = uuidv4();
            const user1 = {
                user_id,
                user_name: 'John',
                user_email: 'john@john.com',
                password: hashedPass
            }

            const user_id2 = uuidv4();
            const user2 = {
                user_id: user_id2,
                user_name: 'Paul',
                user_email: 'paul@paul.com',
                password: hashedPass
            }

            //create a mock user registration
            const firstUser = await pool.query('INSERT INTO users (user_id, user_name, user_email, password) VALUES ($1, $2, $3, $4) RETURNING *', [user1.user_id, user1.user_name, user1.user_email, user1.password])
            const secondUser = await pool.query('INSERT INTO users (user_id, user_name, user_email, password) VALUES ($1, $2, $3, $4) RETURNING *', [user2.user_id, user2.user_name, user2.user_email, user2.password])

            await mockTransactions(firstUser.rows[0])
            await mockTransactions(secondUser.rows[0])

            const allTransactions = await pool.query('SELECT * FROM transactions')
            const firstUserTransactions = await joinTransactionsQuery(firstUser.rows[0].user_id)
            const secondUserTransactions = await joinTransactionsQuery(secondUser.rows[0].user_id)

            expect(allTransactions.rowCount).toBe(12)
            expect(firstUserTransactions.length).toBe(6)
            expect(secondUserTransactions.length).toBe(6)
            await pool.query('ROLLBACK')

        });

        it('TRANSACTIONS DISPLAY GET returns correct transaction date', async () => {
            const transactionDate = '2022-5-19'
            const transactionAmount = 467.88
            const envelopeTitle = 'My Envelope'
            await pool.query('BEGIN')

            const userInfo = await getToken()
            const envelope = await insertAndRetrieveMockEnvelope(userInfo.user_id, envelopeTitle);
            await makeCompleteTransaction(userInfo.user_id, envelope.env_id, transactionsEndpoints.depositEndpoint, transactionAmount, transactionDate)

            const transaction = await joinTransactionsQuery(userInfo.user_id)

            expect(transaction.length).toBe(1)

            await pool.query('ROLLBACK')

        });

        it('TRANSACTIONS DISPLAY GET DEPOSIT returns t_date, transaction_type, amount and envelope destination name', async () => {

            const transactionAmount = 467.88
            const envelopeTitle = 'My Envelope'
            await pool.query('BEGIN')

            const userInfo = await getToken()
            const envelope = await insertAndRetrieveMockEnvelope(userInfo.user_id, envelopeTitle);
            await postEnvelopeTransaction(userInfo.token, envelope.env_id, transactionAmount, transactionsEndpoints.depositEndpoint)


            const response = await requestTransactionsLog(userInfo.token)

            expect(response.body.data[0].info[0].transaction_type).toBe(transactionsEndpoints.depositEndpoint)
            expect(parseFloat(response.body.data[0].info[0].amount)).toBe(transactionAmount)
            expect(response.body.data[0].info[0]['ENVELOPE DESTINATION']).toBe(envelopeTitle)

            await pool.query('ROLLBACK')

        });

        it('TRANSACTIONS DISPLAY GET TRANSFER returns t_date, transaction_type, amount and envelope destination name', async () => {

            const sourceAmount = 467.88
            const transferAmount = 100.66
            const sourceTitle = 'Envelope Source'
            const destinationTitle = 'Envelope Destination'
            await pool.query('BEGIN')

            const userInfo = await getToken()
            const envelopeSource = await insertAndRetrieveMockEnvelope(userInfo.user_id, sourceTitle, sourceAmount);
            const envelopeDestination = await insertAndRetrieveMockEnvelope(userInfo.user_id, destinationTitle);
            await postTransferEnvelope(userInfo.token, envelopeSource.env_id, transferAmount, envelopeDestination.env_id, transactionsEndpoints.transferEndpoint)


            const response = await requestTransactionsLog(userInfo.token)

            expect(response.body.data[0].info[0].transaction_type).toBe(transactionsEndpoints.transferEndpoint)
            expect(parseFloat(response.body.data[0].info[0].amount)).toBe(transferAmount)
            expect(response.body.data[0].info[0]['ENVELOPE SOURCE']).toBe(sourceTitle)
            expect(response.body.data[0].info[0]['ENVELOPE DESTINATION']).toBe(destinationTitle)

            await pool.query('ROLLBACK')

        });
      
    })//describe block

}

const getDate = (dateAsString) => {

    const date = new Date(dateAsString)

    const [year, month, day] = [date.getFullYear(), date.getMonth() + 1, date.getUTCDate()];

    return `${year}-${month}-${day}`
}

const makeCompleteTransaction = async (user_id, destination_id, transactionType, amount, dateAsString, source_id) => {


    // mock a deposit
    const envelopeSourceId = source_id ? source_id : null
    await envelopeTransactionsQuery(
        transactionType,
        amount,
        user_id,
        destination_id,
        envelopeSourceId
    );
    // mock a transaction                         
    const transactionDate = getDate(dateAsString)
    await transactionQueries(
        transactionType,
        user_id,
        amount,
        destination_id,
        envelopeSourceId,
        transactionDate
    )
}

const mockTransactions = async (userInfo) => {
    const firstDepositAmount = 456.76
    const firstDepositDate = '2022-3-15'

    const secondDepositAmount = 324.78
    const secondDepositDate = '2022-3-25'

    const firstWithdrawAmount = 100.00
    const firstWithdrawDate = '2022-4-02'

    const secondWithdrawAmount = 100.00
    const secondWithdrawDate = '2022-4-29'

    const firstTransferAmount = 20.21
    const firstTransferDate = '2022-5-09'

    const secondTransferAmount = 15.34
    const secondTransferDate = '2022-5-19'



    /* MAKE A FIRST DEPOSIT */
    const firstEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id, 'First Envelope');
    await makeCompleteTransaction(
        userInfo.user_id,
        firstEnvelope.env_id,
        transactionsEndpoints.depositEndpoint,
        firstDepositAmount,
        firstDepositDate
    )
    /* MAKE A SECOND DEPOSIT */
    const secondEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id, 'Second Envelope');
    await makeCompleteTransaction(
        userInfo.user_id,
        secondEnvelope.env_id,
        transactionsEndpoints.depositEndpoint,
        secondDepositAmount,
        secondDepositDate
    )

    /* MAKE A FIRST WITHDRAW */

    await makeCompleteTransaction(
        userInfo.user_id,
        firstEnvelope.env_id,
        transactionsEndpoints.withdrawEndpoint,
        firstWithdrawAmount,
        firstWithdrawDate
    )

    /* MAKE A SECOND WITHDRAW */

    await makeCompleteTransaction(
        userInfo.user_id,
        secondEnvelope.env_id,
        transactionsEndpoints.withdrawEndpoint,
        secondWithdrawAmount,
        secondWithdrawDate
    )

    /* MAKE A FIRST TRANSFER FROM FIRST TO SECOND ENVELOPE*/

    await makeCompleteTransaction(
        userInfo.user_id,
        secondEnvelope.env_id,
        transactionsEndpoints.transferEndpoint,
        firstTransferAmount,
        firstTransferDate,
        firstEnvelope.env_id
    )

    /* MAKE A SECOND TRANSFER FROM SECOND TO FIRST ENVELOPE*/

    await makeCompleteTransaction(
        userInfo.user_id,
        firstEnvelope.env_id,
        transactionsEndpoints.transferEndpoint,
        secondTransferAmount,
        secondTransferDate,
        secondEnvelope.env_id
    )
}

module.exports = transactionTests