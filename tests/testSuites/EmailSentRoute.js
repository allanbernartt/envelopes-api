const request = require('supertest')
const app = require('../../app')
const { apiURL } = require('../../src/utils/utils')

const EmailSentRouteTest = (endpoint) => {
    describe('Email Sent Route', () => {
        it('GET returns 200 OK for route informing an email was sent', async() => {
            const response = await request(app).get(`${apiURL}/users/${endpoint}`).send();
            expect(response.status).toBe(200)
        })
    })
}

module.exports = EmailSentRouteTest