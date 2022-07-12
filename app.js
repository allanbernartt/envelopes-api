const express = require('express')
const path = require('path')
var csrf = require('csurf')
const cookieParser = require('cookie-parser')
const i18next = require('i18next')
const Backend = require('i18next-fs-backend')
const middleware = require('i18next-http-middleware')
const {apiURL} = require('./src/utils/utils')
const userRegistrationRouter = require('./src/routers/userRegistrationRouter')
const docRouter = require('./src/routers/docs')
const envelopeRouter = require('./src/routers/envelopeRoutes')
const transactionsRouter = require('./src/routers/transactionsRoutes')
const transactionsLogRouter = require('./src/routers/transactionsLogRoutes')


i18next.use(Backend).use(middleware.LanguageDetector)
    .init({
        fallbackLng: 'pt',
        backend: {
            loadPath: './src/locales/{{lng}}/translation.json'
        }
    })

const app = express()
app.use(cookieParser())

app.use(middleware.handle(i18next))

app.use(express.json())
app.use(express.urlencoded({extended: true}))


const csrfProtection = csrf({ cookie: true })

app.use(express.static(path.join('public')))

app.use(csrfProtection);

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
    
    next()
})
//uncomment for SPA use
/*  app.use('/getCSRFToken', (req, res)=> {
    
    try {
        res.send({CSRFToken: req.csrfToken()})
    } catch (error) {
        res.send({msg: error.message})
    }
    
})   */
app.use(`${apiURL}/api-docs`, docRouter)
app.use(`${apiURL}/users`, userRegistrationRouter)
app.use(`${apiURL}/envelopes`, envelopeRouter)
app.use(`${apiURL}/transactions`, transactionsRouter)
app.use(`${apiURL}/transactions-log`, transactionsLogRouter)


//uncomment for SPA use
 /* app.use('*', function (req, res) {   
    
    res.sendFile(path.resolve(__dirname, 'public', 'index.html'))
    
  })  */ 
  
module.exports = app