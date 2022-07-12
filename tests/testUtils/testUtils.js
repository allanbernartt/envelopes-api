const bcryptjs = require('bcryptjs')
const request = require('supertest')
const app = require('../../app')
const { apiURL, userEndpoints, userRegistrationConfig } = require('../../src/utils/utils')
const pool = require('../../config/index')
const { v4: uuidv4 } = require('uuid')

 exports.mockUserFullRegistration = async () => {

    const hashedPass = await bcryptjs.hash('P4ssword', 12)
    const user_id = uuidv4();
    const registeredUser = {
        user_id,
        user_name: 'JohnRegister',
        user_email: 'john@john.com',
        password: hashedPass,
        passConfirmation: 'P4ssword'
    }

   await request(app).post(`${apiURL}/users/${userEndpoints.register}`).send({ ...registeredUser, password: 'P4ssword' })
   
    const user = await pool.query('SELECT * FROM users LIMIT 1')   
    return {
        user: user.rows[0]

    }    
} 

exports.mockUserInvalidTokenDate = async () => {

    const hashedPass = await bcryptjs.hash('P4ssword', 12)
    const registerUser = {
        user_name: 'JohnRegister',
        user_email: 'john@john.com',
        password: hashedPass,
        passConfirmation: 'P4ssword'
    }
    const registerQuery = `INSERT INTO users (user_id, user_name, 
        user_email, 
        password, 
        activation_tk, 
        activation_tk_date) 
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`

    let date = new Date(Date.now() - userRegistrationConfig.emailTokenExpiration)   

    const user = await pool.query(registerQuery, ['040o3-04994-00',registerUser.user_name, registerUser.user_email, hashedPass, 'valid-token', date.toISOString()])
      
    return {
        user: user.rows[0]
    }    
} 

exports.mockUserInvalidPassResetTokenDate = async () => {

    const hashedPass = await bcryptjs.hash('P4ssword', 12)
    const user_id = uuidv4();
    const registerUser = {
        user_id,
        user_name: 'JohnRegister',
        user_email: 'john@john.com',
        password: hashedPass,
        passConfirmation: 'P4ssword'
    }
    const registerQuery = `INSERT INTO users (user_id, user_name, 
        user_email, 
        password, 
        pass_token, 
        pass_tk_date) 
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`

    let date = new Date(Date.now() - userRegistrationConfig.emailTokenExpiration)   

    const user = await pool.query(registerQuery, [registerUser.user_id,registerUser.user_name, registerUser.user_email, hashedPass, 'valid-token', date.toISOString()])
      
    return {
        user: user.rows[0]
    }
    
} 

exports.mockUserPassResetToken = async () => {
    const hashedPass = await bcryptjs.hash('P4ssword', 12)
    const user_id = uuidv4();
    const registerUser = {
        user_id,
        user_name: 'JohnRegister',
        user_email: 'john@john.com',
        password: hashedPass,
        passConfirmation: 'P4ssword'
    }
    const registerQuery = `INSERT INTO users (user_id, user_name, 
        user_email, 
        password, 
        pass_token, 
        pass_tk_date) 
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`

    let date = new Date(Date.now() + userRegistrationConfig.emailTokenExpiration)   

    const user = await pool.query(registerQuery, [registerUser.user_id,registerUser.user_name, registerUser.user_email, hashedPass, 'valid-token', date.toISOString()])
      
    return {
        user: user.rows[0]

    }    
} 


exports.postResendAccounActivation =  (email) => {
    return request(app).post(`${apiURL}/users/${userEndpoints.resendAccountActivation}`).send({ user_email: email })
}

exports.getToken = async () => {
    const hashedPass = await bcryptjs.hash('P4ssword', 12)
    const registeredUser = {
        user_id: '005-977643',
        user_name: 'John',
        user_email: 'john@john.com',
        password: hashedPass
    }

    //create a mock user registration
    const user = await pool.query('INSERT INTO users (user_id, user_name, user_email, password, activated) VALUES ($1, $2, $3, $4, $5) RETURNING *', [registeredUser.user_id, registeredUser.user_name, registeredUser.user_email, registeredUser.password, true])

    //mock login post request
    await request(app).post(`${apiURL}/users/${userEndpoints.login}`).send({ ...registeredUser, password: 'P4ssword' })

    const token = await pool.query('SELECT tokens FROM users WHERE user_id = ($1)', [user.rows[0].user_id])

    return {
        token: token.rows[0].tokens[0],
        user_id: user.rows[0].user_id
    }
}

exports.requestUser = (token, endpoint) => {
    
    return  request(app).get(`${apiURL}/users/${endpoint}`)
    .set('Authorization', 'Bearer ' + token)
    .send()
}

exports.postUser = (token, endpoint) => {
    
    return  request(app).post(`${apiURL}/users/${endpoint}`)
    .set('Authorization', 'Bearer ' + token)
    .send()
}

exports.requestGetEnvelope = (token, id, endpoint) => {
    return  request(app).get(`${apiURL}/transactions/${id}/${endpoint}`)
    .set('Authorization', 'Bearer ' + token)
    .send()
}

exports.postEnvelopeTransaction = (token, id, budget, endpoint) => {
    return request(app).post(`${apiURL}/transactions/${id}/${endpoint}`)
    .set('Authorization', 'Bearer ' + token)
    .send({
        budget
    });
}

exports.postTransferEnvelope = (token, SourceId, budget, destinationId, endpoint) => {
    return request(app).post(`${apiURL}/transactions/${SourceId}/${endpoint}`)
    .set('Authorization', 'Bearer ' + token)
    .send({
        destinationId,
        budget
    });
}

exports.insertAndRetrieveMockEnvelope = async (user_id, title, budget) => {
    let insertMockEnvelope;
    let oldEnvelope;
    const env_id = uuidv4();
    if (!budget) {
        insertMockEnvelope = 'INSERT INTO envelopes (user_id, title, env_id) VALUES ($1, $2, $3) RETURNING *'
                             
        oldEnvelope = await pool.query(insertMockEnvelope, [user_id, title, env_id])
    } else {
        insertMockEnvelope = 'INSERT INTO envelopes (user_id, title, budget, env_id) VALUES ($1, $2, $3, $4) RETURNING env_id, title, budget'
        oldEnvelope = await pool.query(insertMockEnvelope, [user_id, title, budget, env_id])
    }

    const oldEnvelopeCopy = { ...oldEnvelope.rows[0] }

    return oldEnvelopeCopy
}


exports.requestTransactionsLog = (token) => {
    return request(app).get(`${apiURL}/transactions-log`)
        .set('Authorization', 'Bearer ' + token)
        .send()
}