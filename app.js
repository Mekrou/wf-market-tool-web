const axios = require('axios')
const credentials = require('./credentials')

let wfMarketReq;

async function login() {
    const requestBody = {
        "auth_type": "header",
        "email": await credentials.readFromCredentials(credentials.CredentialKey.email),
        "password": await credentials.readFromCredentials(credentials.CredentialKey.password)
    }
    return await wfMarketReq.post('/auth/signin', requestBody);
}

async function main() {
    wfMarketReq = axios.create({
        baseURL: 'https://api.warframe.market/v1',
        headers: {
            'Authorization': 'JWT ' + await credentials.readFromCredentials(credentials.CredentialKey.token),
            'Content-Type': 'application/json',
            'platform': 'pc',
            'language': 'en'
        }
    })


    const response = await login();
    console.log(response.data);
}

main();