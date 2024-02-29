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

async function main() {
    wfMarketReq = axios.create({
        baseURL: 'https://api.warframe.market/v1',
        headers: {
            'Authorization': 'JWT ' + await credentials.readFromCredentials(credentials.CredentialKey.token),
            'Content-Type': 'application/json',
            'platform': 'pc',
            'language': 'en',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
        }
    })


    const responseLogin = await login();

    const responseOrder = await createOrder(responseLogin);
    const order_id = responseOrder.data.payload.order.id;
}

main();