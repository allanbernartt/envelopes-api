const { userEndpoints } = require('../../src/utils/utils')
const envelopeTest = require('../testSuites/Envelopes')
const userRegistrationTests = require('../testSuites/UserRegistration')
const accountActivationTests = require('../testSuites/AccountActivation')
const userLoginTests = require('../testSuites/UserLogin')
const passwordResetTest = require('../testSuites/PasswordReset')
const emailSentTests = require('../testSuites/EmailSentRoute')
const transactionDepositTests = require('../testSuites/EnvelopesDeposit')
const transactionWithdrawTests = require('../testSuites/EnvelopesWithdraw')
const envelopeTransferTests = require('../testSuites/EnvelopesTransfer')
const transactionsTests = require('../testSuites/Transactions')
const transactionsDisplayTests = require('../testSuites/TransactionsDisplay')
const authActivationTests = require('../testSuites/Auth')

describe('sequentially run tests', () => {
    
   accountActivationTests() //ok
    userLoginTests(userEndpoints.login) //ok
    authActivationTests() //ok
    emailSentTests(userEndpoints.emailSent) //ok
    envelopeTest(); //ok
    transactionDepositTests('deposit'); //ok
    envelopeTransferTests('transfer'); //ok
    transactionWithdrawTests('withdraw'); //ok
   passwordResetTest() //ok
    transactionsTests();  //ok
    transactionsDisplayTests() //ok
    userRegistrationTests(userEndpoints.register) //ok
})








