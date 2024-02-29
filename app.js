const axios = require('axios')
const credentials = require('./credentials')

const wfMarketReq = axios.create({
    baseURL: 'https://api.warframe.market/v1',
    header: {'Authorization': 'JWT ' + credentials.readFromCredentials(credentials.CredentialKey.token) }
})

async function authorize() {
    const res = await wfMarketReq.post('/auth/signin', {...requestBody})
    console.log(res);
}

async function main() {
    const requestBody = {
        "auth_type": "cookie",
        "email": await credentials.readFromCredentials(credentials.CredentialKey.email),
        "password": await credentials.readFromCredentials(credentials.CredentialKey.password)
    }
    console.log(requestBody)
}

main();