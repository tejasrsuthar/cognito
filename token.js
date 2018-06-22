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

// Replace login info here if needed
var authenticationData = {
    Username : 'sam.shirley+bordev@saltlending.com',
    Password : 'Test123!',
    secret: "HD4NO2RPBPLZMA34KOJDPX6YMOOVMWBM6B5SMXSWUC2LS7SHCUTA"
};

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
        console.log("JWT Access Token")
        console.log(result.getAccessToken().getJwtToken());
        process.exit(0)
    },

    onFailure: function(err) {
        console.error(err);
    },

    mfaSetup: function(challengeName, challengeParameters) {
        console.log(challengeName, challengeParameters)
        
        cognitoUser.associateSoftwareToken(this);
    },

    totpRequired : function(secretCode) {
        var challengeAnswer = speakeasy.totp({secret: authenticationData.secret, encoding: 'base32'})
        var session = cognitoUser.sendMFACode(challengeAnswer, this, 'SOFTWARE_TOKEN_MFA');
        
        return session
    }
});

// Run auth function and get token
auth();
