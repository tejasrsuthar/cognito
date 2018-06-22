#!/usr/bin/env node
const repl = require('repl')
const context = repl.start('$ ').context
const fetch = require('node-fetch')
const speakeasy = require('speakeasy')
context.speakeasy = speakeasy
context.fetch = fetch
global.fetch = fetch
const AmazonCognitoIdentity = require('amazon-cognito-identity-js')
const AWS = require('aws-sdk')
const nonadmin = new AWS.CognitoIdentityServiceProvider({apiVersion: '2016-04-18', region: 'us-west-2'})
const admin = new AWS.CognitoIdentityServiceProvider({apiVersion: '2016-04-18', region: 'us-west-2'})
context.admin = admin
context.nonadmin = nonadmin
const { CognitoUserPool, CognitoUserAttribute, CognitoUser } = AmazonCognitoIdentity

const poolData = {
    UserPoolId: 'us-west-2_mdKfDt755',
    ClientId: '4b31olm6l63cd3e14bnihj9n5'
}
context.poolData = poolData

const userPool = new CognitoUserPool(poolData)
context.userPool = userPool
context.CognitoUserAttribute = CognitoUserAttribute
context.CognitoUser = CognitoUser

const dataEmail = {
    Name: 'email',
    Value: ''
}

const attributeEmail = new CognitoUserAttribute(dataEmail)
context.attributeEmail = attributeEmail


var authenticationData = {
    Username : 'donotdelete@gmail.com',
    Password : 'Testing123!',
};
var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
var userData = {
    Username : authenticationData.Username,
    Pool : userPool
};
var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
context.user = cognitoUser
const signUp = () => userPool.signUp(authenticationData.Username, authenticationData.Password, [], null, console.log)
context.signUp = signUp

const auth = () => cognitoUser.authenticateUser(authenticationDetails, {
    onSuccess: function (result) {
        console.log('access token + ' + result.getAccessToken().getJwtToken());
        console.log(result)
    },

    onFailure: function(err) {
        console.log('here6')
        console.error(err);
    },

    mfaSetup: function(challengeName, challengeParameters) {
        console.log(challengeName, challengeParameters)
        
        cognitoUser.associateSoftwareToken(this);
    },

    associateSecretCode : function(secretCode) {
        console.log(secretCode)
        console.log('here5')
        setTimeout(() => {
            console.log('x')
            var challengeAnswer = speakeasy.totp({secret: secretCode, encoding: 'base32' })
            console.log(challengeAnswer)
            const verified = speakeasy.totp.verify({ secret: secretCode, encoding: 'base32', token: challengeAnswer })
            console.log(verified)
            cognitoUser.verifySoftwareToken(challengeAnswer, 'My TOTP device', this);
        }, 100);
    },

    selectMFAType : function(challengeName, challengeParameters) {
        console.log('here4')
        var mfaType = prompt('Please select the MFA method.', ''); // valid values for mfaType is "SMS_MFA", "SOFTWARE_TOKEN_MFA" 
        cognitoUser.sendMFASelectionAnswer(mfaType, this);
    },

    totpRequired : function(secretCode) {
        console.log('here3')
        var challengeAnswer = speakeasy.totp({secret: '4RLPTSMJS24V6FV7MOPRMIQVL4LH4BTCB5S2DMS2TAGIGFJBTURQ', encoding: 'base32'})
        cognitoUser.sendMFACode(challengeAnswer, this, 'SOFTWARE_TOKEN_MFA');
    },

    mfaRequired: function(codeDeliveryDetails) {
        console.log('here2')
        var challengeAnswer = speakeasy.totp({secret: '4RLPTSMJS24V6FV7MOPRMIQVL4LH4BTCB5S2DMS2TAGIGFJBTURQ', encoding: 'base32'})
        cognitoUser.sendMFACode(challengeAnswer, this, 'SOFTWARE_TOKEN_MFA');
    },

    newPasswordRequired: function(userattrs, reqattrs) {
        console.log('here')
        cognitoUser.completeNewPasswordChallenge('Testing123!', null, this)
    }
});
const mfacode = () => speakeasy.totp({secret: '4RLPTSMJS24V6FV7MOPRMIQVL4LH4BTCB5S2DMS2TAGIGFJBTURQ', encoding: 'base32'})
context.mfacode = mfacode
context.auth = auth

const mfaverify = token => admin.verifySoftwareToken({ AccessToken: token, UserCode: mfacode() }).promise()
context.mfaverify = mfaverify

context.admin2faauth = () => admin.adminInitiateAuth({ AuthFlow: 'CUSTOM_AUTH', AuthParameters: { USERNAME: 'keagan.mcclelland@gmail.com' }, ...poolData }).promise().then(res => {
    return admin.respondToAuthChallenge({
        ChallengeName: res.ChallengeName, 
        Session: res.Session, 
        ClientId: poolData.ClientId,
        ChallengeResponses: { 
            SOFTWARE_TOKEN_MFA_CODE: mfacode(), 
            USERNAME: res.ChallengeParameters.USERNAME
        }
    }).promise()
})
