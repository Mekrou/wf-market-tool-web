const axios = require('axios')
const credentials = require('./credentials')


let wfMarketReq;

(async function init() {
    wfMarketReq = axios.create({
        baseURL: 'https://api.warframe.market/v1',
        headers: {
            'Authorization': await credentials.readFromCredentials(credentials.CredentialKey.token),
            'Content-Type': 'application/json',
            'platform': 'pc',
            'language': 'en'
        }
    })
})();


async function login() {
    const requestBody = {
        "auth_type": "header",
        "email": await credentials.readFromCredentials(credentials.CredentialKey.email),
        "password": await credentials.readFromCredentials(credentials.CredentialKey.password)
    }
    console.log("logging in...")
    const res = await wfMarketReq.post('/auth/signin', requestBody)
    if (res.status != 200) throw new Error("Could not login!")
    credentials.updateToken(res.headers.authorization)
    return res;
}

async function createOrder(responseLogin) {
    const requestBody = {
        "item": "5a2feeb1c2c9e90cbdaa23d2",
        "order_type": "sell",
        "platinum": 12,
        "quantity": 5,
        "visible": true,
    }

    console.log(responseLogin.headers.authorization)

    return await axios.post('https://api.warframe.market/v1/profile/orders', requestBody, {
        headers: {
            'Authorization': responseLogin.headers.authorization,
        }
    })
}

module.exports = {login, createOrder}