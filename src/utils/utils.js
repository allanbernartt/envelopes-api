exports.apiURL = '/api/1.0'
exports.frontEndDomain = '<app-name>'
exports.userEndpoints = {
    register: 'register',
    login: 'login',
    logout:'logout',
    logoutAllAccounts: 'logout-all',
    accountActivation: 'account-activation',
    resendAccountActivation: 'resend-activation-email',
    passwordResetEmail: 'password-reset',
    emailSent: 'email-sent',
    resetUserPass:'user-password-reset'
}

exports.userRegistrationConfig = {
    emailTokenExpiration: 900000,
    jwtTokenExpiration: "1 day"
}
