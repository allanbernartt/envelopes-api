const jwt = require('jsonwebtoken')
const pool = require('../../config/index')
require('dotenv').config()

exports.auth = async (req, res, next) => {
   
    if(req.method === 'OPTIONS'){
        return next()
     }
    try {
        const token = req.headers.authorization.split(' ')[1]      
       
        if(token === 'undefined' || token === null) {
            
            throw new Error()
        }

        const decoded = jwt.verify(token, process.env.TOKEN_SECRET)
        
         const user = await pool.query('SELECT * FROM users WHERE user_id = ($1) AND ($2) = ANY(tokens)', [decoded.id, token])
        
        if (user.rowCount === 0) {
            
            throw new Error()
        } 
      
        req.user_id = user.rows[0].user_id
        req.token = token
        next()

    } catch (error) {    
       
        return res.status(403).send({ message: req.t('pleaseAuth') })
    }
}





