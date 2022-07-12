const request = require('supertest')
const app = require('../../app')
const pool = require('../../config/index')
const { getToken, requestGetEnvelope, postTransferEnvelope, insertAndRetrieveMockEnvelope } = require('../testUtils/testUtils')


const transferTests = (endpoint) => {
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

 it('TRANSFER GET returns 200 OK for transfer route', async () => {

            await pool.query('BEGIN')
            const userInfo = await getToken()
            const existingEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id,'Some title');
            
            await insertAndRetrieveMockEnvelope(userInfo.user_id,'Second Envelope');
            const response = await requestGetEnvelope(userInfo.token, existingEnvelope.env_id, endpoint)
            expect(response.status).toBe(200)
            await pool.query('ROLLBACK')
        });       

  it('TRANSFER GET returns correct source envelope', async () => {

            await pool.query('BEGIN')
            const userInfo = await getToken()
            const existingEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id,'Some title');
            await insertAndRetrieveMockEnvelope(userInfo.user_id,'Second Envelope');
            const response = await requestGetEnvelope(userInfo.token, existingEnvelope.env_id, endpoint)
            
            const compareEnvelope = {
                ...existingEnvelope,
                created_at: existingEnvelope.created_at.toISOString()
            }

            const date = response.body.sourceEnvelope.created_at
            const bodyEnvelope = {
                ...response.body.sourceEnvelope,
                created_at: date.toString()
            }


            expect(bodyEnvelope).toEqual(compareEnvelope);            
            await pool.query('ROLLBACK')
        }); 

        it('TRANSFER GET returns all possible destination envelopes', async () => {

            await pool.query('BEGIN')
            const userInfo = await getToken()
            //mock source envelope
            const existingEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id,'First Envelope');
            //mock first envelope destination
            const destinationEnvelope1 = await insertAndRetrieveMockEnvelope(userInfo.user_id,'Second Envelope');
            //mock first envelope destination
            const destinationEnvelope2 = await insertAndRetrieveMockEnvelope(userInfo.user_id,'Third Envelope');

            //normalize created_at for destinationEnvelope1
            const compareEnvelope1 = {
                ...destinationEnvelope1,
                created_at: destinationEnvelope1.created_at.toISOString()
            }

            //normalize created_at for destinationEnvelope2
            const compareEnvelope2 = {
                ...destinationEnvelope2,
                created_at: destinationEnvelope2.created_at.toISOString()
            }

            //mock array with all destination envelopes
            const destinationEnvelopesComparison = []
            destinationEnvelopesComparison.push(compareEnvelope1)
            destinationEnvelopesComparison.push(compareEnvelope2)

            const response = await requestGetEnvelope(userInfo.token, existingEnvelope.env_id, endpoint)           
            expect(response.body.destinationEnvelopesArray).toEqual(destinationEnvelopesComparison);            
            await pool.query('ROLLBACK')
        });  

        it('TRANSFER GET returns 404 and Envelope Not Found when envelope id is invalid', async () => {

            await pool.query('BEGIN')
            const userInfo = await getToken()            
            const response = await requestGetEnvelope(userInfo.token, -1, endpoint)
            
            expect(response.status).toBe(404);
            expect(response.body.validationErrors.invalidId).toEqual("Envelope Não Encontrado");           
            await pool.query('ROLLBACK')
        });

        
        it('TRANSFER GET returns 400 and There are no other Envelopes to transfer to when there is only one envelope', async () => {

            await pool.query('BEGIN')
            const userInfo = await getToken()
            //mock source envelope
            const existingEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id,'First Envelope');
            //mock first envelope destination
           

            const response = await requestGetEnvelope(userInfo.token, existingEnvelope.env_id, endpoint)
            
            expect(response.status).toBe(400);
            expect(response.body.message).toBe("Não há outros Envelopes para os quais transferir");   
            await pool.query('ROLLBACK')
        }); 

        it('TRANSFER POST return 200 when amount to transfer is less or equal than source envelope budget', async () => {
            const envelopeBudget = 230.45
            const amountToTransfer = 230.43
            await pool.query('BEGIN')
            const userInfo = await getToken()
           
            const existingEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id,'Some title', envelopeBudget);
            
            const destinationEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id,'Second Envelope');
           const response = await postTransferEnvelope(userInfo.token,existingEnvelope.env_id, amountToTransfer, destinationEnvelope.env_id, endpoint)
            expect(response.status).toBe(200)            
            await pool.query('ROLLBACK') 
        });

        it('TRANSFER POST return 404 and Source Envelope not Found when source envelope is not in db', async () => {
            const envelopeBudget = 230.45
            const amountToTransfer = 230.43
            await pool.query('BEGIN')
            const userInfo = await getToken()           
           
            const destinationEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id,'Second Envelope', envelopeBudget);
           const response = await postTransferEnvelope(userInfo.token,-1, amountToTransfer, destinationEnvelope.env_id, endpoint)
            expect(response.status).toBe(404)    
            expect(response.body.validationErrors.source).toBe( "Envelope de origem não encontrado")    
            await pool.query('ROLLBACK') 
        });

        it('TRANSFER POST return 404 and Destination Envelope not Found when destination envelope is not in db', async () => {
            const envelopeBudget = 230.45
            const amountToTransfer = 230.43
            await pool.query('BEGIN')
            const userInfo = await getToken()           
           
            const sourceEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id,'Second Envelope', envelopeBudget);
           const response = await postTransferEnvelope(userInfo.token,sourceEnvelope.env_id, amountToTransfer, -1, endpoint)
            expect(response.status).toBe(404)    
            expect(response.body.validationErrors.source).toBe("Envelope de destino não encontrado")    
            await pool.query('ROLLBACK') 
        });

        it('TRANSFER POST return 400 and Source Envelope with insufficient funds when amount to transfer is greater than source envelope budget', async () => {
            const envelopeBudget = 230.45
            const amountToTransfer = 230.46
            await pool.query('BEGIN')
            const userInfo = await getToken()
           
            const existingEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id,'Some title', envelopeBudget);
            
            const destinationEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id,'Second Envelope');
           const response = await postTransferEnvelope(userInfo.token,existingEnvelope.env_id, amountToTransfer, destinationEnvelope.env_id, endpoint)
            expect(response.status).toBe(400)
            expect(response.body.validationErrors.insufficientFunds).toBe("Envelope não possui fundos suficientes")
            await pool.query('ROLLBACK') 
        });

        it('TRANSFER POST transfer from source envelope to destination envelope', async () => {
            const envelopeBudget = 231.45
            const amountToTransfer = 230.43
            await pool.query('BEGIN')
            const userInfo = await getToken()           
            
            const sourceEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id,'Some title', envelopeBudget);            
            const destinationEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id,'Second Envelope');
            
            const resultExistingEnvelopeBudget = envelopeBudget - amountToTransfer

            const response = await postTransferEnvelope(userInfo.token,sourceEnvelope.env_id, amountToTransfer, destinationEnvelope.env_id, endpoint)

            const sourceResultEnvelope = await pool.query('SELECT * FROM envelopes WHERE user_id = ($1) and env_id = ($2)', [userInfo.user_id, sourceEnvelope.env_id])
            const destinationResultEnvelope = await pool.query('SELECT * FROM envelopes WHERE user_id = ($1) and env_id = ($2)', [userInfo.user_id, destinationEnvelope.env_id])
            
            expect(parseFloat(sourceResultEnvelope.rows[0].budget)).toBe(parseFloat(resultExistingEnvelopeBudget.toFixed(2)))
            expect(parseFloat(destinationResultEnvelope.rows[0].budget)).toBe(amountToTransfer)
            await pool.query('ROLLBACK') 
        });

        it('TRANSFER POST returns 400 and validation Errors for all fields when request is invalid', async () => {
            
            await pool.query('BEGIN')
            const userInfo = await getToken()
           
           const existingEnvelope = await insertAndRetrieveMockEnvelope(userInfo.user_id,'Some title', 100);
            
            await insertAndRetrieveMockEnvelope(userInfo.user_id,'Second Envelope');
           const response = await postTransferEnvelope(userInfo.token,existingEnvelope.env_id, null, null, endpoint)
            expect(response.status).toBe(400)         
            expect(Object.keys(response.body.validationErrors)).toEqual(['budget', 'destinationId'])
            await pool.query('ROLLBACK') 
        });


        it.each`
        field    | value    | expected
        ${'budget'} | ${null} | ${"Este campo precisa ser preenchido"}  
        ${'budget'} | ${''} | ${"Este campo precisa ser preenchido"}  
        ${'budget'} | ${'dd'} | ${"Este campo precisa ser numérico"} 
        ${'destinationId'} | ${null} | ${"Favor selecionar um envelope de destino"}  
        ${'destinationId'} | ${''} | ${"Favor selecionar um envelope de destino"}  
      `('TRANSFER POST returns $expected when $field is $value', async ({field, value, expected}) => {
        
        const body = {
            budget: 100,
            destinationId: 1
        }

        body[field] = value
       
        const userInfo = await getToken()
        const response = await postTransferEnvelope(userInfo.token, 1, body.budget, body.destinationId, endpoint)
        expect(response.status).toBe(400)
        expect(response.body.validationErrors[field]).toBe(expected)
      });  

        

    }) //describe TRANSFER block

   
} // transaction function

module.exports = transferTests;