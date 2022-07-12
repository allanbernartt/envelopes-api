const express = require('express')
const pool = require('../../config/index')
const { check } = require('express-validator')
const { userEndpoints } = require('../utils/utils')
const {auth} = require('../middleware/auth')
const { 
  getUserRegistration, 
  postUserRegistration, 
  getLogin, 
  postLogin, 
  getAccountActivation, 
  getResendAccountActivation, 
  postResendAccountActivation, 
  getSendPasswordResetEmail, 
  postSendPasswordResetEmail,
  getEmailSent, 
  getPasswordResetToken, 
  postNewPassword,  
  postLogout,
  postLogoutAll
} = require('../controllers/userRegistrationController')
const router = express.Router()

//USER REGISTRATION ROUTES

/**
 * @swagger
 * /api/1.0/users/register:
 *    post:
 *      summary: Creates a new user
 *      produces:
 *        - application/json
 *      tags:
 *        - Auth
 *      requestBody:
 *        description: Data for new user
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                user_name:
 *                  type: string
 *                user_email:
 *                  type: string
 *                password:      
 *                  type: string    
 *                passConfirmation: 
 *                  type: string
 *              example:
 *                user_name: John Doe   
 *                user_email: johndoe@mail.com  
 *                password: secretPass    
 *                passConfirmation: secretPass     
 *      responses:
 *        "201":
 *          description: Returns success message
 *        "400":
 *          description: Request Body Errors
 *        "500":
 *          description: Internal server error
 */
router.post(`/${userEndpoints.register}`, 
check('user_name').trim().notEmpty().withMessage((value, {req})=> {
  return req.t('emptyField')
}).bail()
.isLength({min:3, max: 25}).withMessage((value, {req})=> {
  return req.t('nameError')
}),
check('user_email').trim().notEmpty().withMessage((value, {req})=> {
  return req.t('emptyField')
}).bail()
.isEmail().withMessage((value, {req})=> {
  return req.t('validEmail')
}).bail()
.custom(async (value, {req}) => {
  const userEmail = await pool.query('SELECT user_email FROM users WHERE user_email = ($1)', [value])
  if (userEmail.rowCount > 0) {
    throw new Error(req.t('emailInUse'));
  } 
  return true;
}),
check('password').trim().notEmpty().withMessage((value, {req})=> {
  return req.t('emptyField')
}).bail()
.isLength({min:8, max:25}).withMessage((value, {req})=> {
  return req.t('passwordMinMax')
}),
check('passConfirmation').trim().notEmpty().withMessage((value, {req})=> {
  return req.t('emptyField')
}).bail()
.custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error(req.t('passShouldMatch'));
    }    
    return true;
  }),
postUserRegistration)

/**
 * @swagger
 * /api/1.0/users/login:
 *    post:
 *      summary: User Login
 *      produces:
 *        - application/json
 *      tags:
 *        - Auth
 *      requestBody:
 *        description: Logs User in
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                user_email:
 *                  type: string
 *                password:      
 *                  type: string
 *              example:               
 *                user_email: johndoe@mail.com  
 *                password: secretPass                       
 *      responses:
 *        "200":
 *          description: Returns user id and jwt token
 *        "400":
 *          description: Request Body Errors
 *        "403":
 *          description: Authentication Error or Account not Activated message  
 *        "500":
 *          description: Internal server error
 */
router.post(`/${userEndpoints.login}`, 
check('user_email').trim().notEmpty().withMessage((value, {req})=> {
  return req.t('emptyField')
}).bail()
.isEmail().withMessage((value, {req})=> {
  return req.t('validEmail')
}).bail(),
check('password').trim().notEmpty().withMessage((value, {req})=> {
  return req.t('emptyField')
}).bail()
.isLength({min:8, max:25}).withMessage((value, {req})=> {
  return req.t('passwordMinMax')
}),
postLogin)

//PASSWORD RESET ROUTES

//Allows user to send reset password link to email

/**
 * @swagger
 * /api/1.0/users/password-reset:
 *    post:
 *      summary: Reset Password
 *      produces:
 *        - application/json
 *      tags:
 *        - Auth
 *      requestBody:
 *        description: Allows user to send reset password link to email
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                user_email:
 *                  type: string *                
 *              example:               
 *                user_email: johndoe@mail.com                                        
 *      responses:
 *        "200":
 *          description: Returns success message
 *        "400":
 *          description: Request Body Errors
 *        "404":
 *          description: User not found
 *        "500":
 *          description: Internal server error
 */
router.post(`/${userEndpoints.passwordResetEmail}`, 
check('user_email').trim().notEmpty().withMessage((value, {req})=> {
  return req.t('emptyField')
}).bail()
.isEmail().withMessage((value, {req})=> {
  return req.t('validEmail')
}),
postSendPasswordResetEmail)
//3 - Receives token from email and checks token and token date validity

/**
 * @swagger
 * /api/1.0/users/user-password-reset/{token}:
 *    get:
 *      summary: Reset Password
 *      produces:
 *        - application/json
 *      tags:
 *        - Auth
 *      parameters:
 *        - in: path
 *          name: id
 *          description: Token from email
 *          type: string
 *          required: true
 *          example: 2g5flx8a-3res-9999-1s0z-ns3n91h2kl71
 *      responses:
 *        "200":
 *          description: Returns success message        
 *        "404":
 *          description: Invalid Token
 *        "500":
 *          description: Internal server error
 */
router.get(`/${userEndpoints.resetUserPass}/:token`, getPasswordResetToken)
//4 - Shows user input fields to type in new password and new password confirmation

/**
 * @swagger
 * /api/1.0/users/password-reset/{token}:
 *    post:
 *      summary: Password Reset
 *      produces:
 *        - application/json
 *      tags:
 *        - Auth
 *      requestBody:
 *        description: Post new Password
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                new_password:
 *                  type: string              
 *              example:               
 *                new_password: newSecretPass                                        
 *      responses:
 *        "200":
 *          description: Returns success message
 *        "400":
 *          description: Request Body Errors
 *        "404":
 *          description: User not found or Invalid Token
 *        "500":
 *          description: Internal server error
 */
router.post(`/${userEndpoints.resetUserPass}/:token`, 
check('new_password').trim().notEmpty().withMessage((value, {req})=> {
  return req.t('emptyField')
}).bail()
.isLength({min:8, max:25}).withMessage((value, {req})=> {
  return req.t('passwordMinMax')
}),
check('newPassConfirmation').trim().notEmpty().withMessage((value, {req})=> {
  return req.t('emptyField')
}).bail()
.custom((value, { req }) => {
    if (value !== req.body.new_password) {
     
      throw new Error(req.t('passShouldMatch'));
    }    
    return true;
  }),
postNewPassword)

//USER ACCOUNT ACTIVATION
//1- Redirects here when accesing email link for Account 
/**
 * @swagger
 * /api/1.0/users/account-activation/{token}:
 *    get:
 *      summary: Activate Account
 *      produces:
 *        - application/json
 *      tags:
 *        - Auth
 *      parameters:
 *        - in: path
 *          name: id
 *          description: Token from email
 *          type: string
 *          required: true
 *          example: 2g5flx8a-3res-9999-1s0z-ns3n91h2kl71
 *      responses:
 *        "200":
 *          description: Returns success message        
 *        "400":
 *          description: Invalid Token
 *        "500":
 *          description: Internal server error
 */
router.get(`/${userEndpoints.accountActivation}/:token`, getAccountActivation)

// Shows user input fields to resend email link to user email
/**
 * @swagger
 * /api/1.0/users/resend-activation-email:
 *    post:
 *      summary: Resend Activation Email
 *      produces:
 *        - application/json
 *      tags:
 *        - Auth
 *      requestBody:
 *        description: Email for a new Account Activation Request
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                user_email:
 *                  type: string              
 *              example:               
 *                user_email: johndoe@mail.com                                        
 *      responses:
 *        "200":
 *          description: Returns success message
 *        "400":
 *          description: Request Body Errors
 *        "404":
 *          description: User not found
 *        "500":
 *          description: Internal server error
 */
router.post(`/${userEndpoints.resendAccountActivation}`, 
check('user_email').trim().notEmpty().withMessage((value, {req})=> {
  return req.t('emptyField')
}).bail()
.isEmail().withMessage((value, {req})=> {
  return req.t('validEmail')
}),
postResendAccountActivation)

//USER LOGOUT
/**
 * @swagger
 * /api/1.0/users/logout:
 *    post:
 *      summary: Logs user out
 *      produces:
 *        - application/json
 *      tags:
 *        - Auth                                       
 *      responses:
 *        "200":
 *          description: Returns success message
 *        "403":
 *          description: Authentication Error         
 *        "500":
 *          description: Internal server error
 */
router.post(`/${userEndpoints.logout}`, auth, postLogout)
/**
 * @swagger
 * /api/1.0/users/logout-all:
 *    post:
 *      summary: Logs all devices out
 *      produces:
 *        - application/json
 *      tags:
 *        - Auth                                       
 *      responses:
 *        "200":
 *          description: Returns success message
 *        "403":
 *          description: Authentication Error         
 *        "500":
 *          description: Internal server error
 */
router.post(`/${userEndpoints.logoutAllAccounts}`, auth, postLogoutAll)

//OTHER AVAILABLE ROUTES FOR TEMPLATING

router.get(`/${userEndpoints.register}`, getUserRegistration)
//EMAIL SENT WARNING ROUTE
router.get(`/${userEndpoints.emailSent}`, getEmailSent)

//LOGIN ROUTES
router.get(`/${userEndpoints.login}`, getLogin)

//Shows user input field to type in email to reset password
router.get(`/${userEndpoints.passwordResetEmail}`, getSendPasswordResetEmail) 

//Shows user input field to type in email to resend Activation email
router.get(`/${userEndpoints.resendAccountActivation}`, getResendAccountActivation)
module.exports = router