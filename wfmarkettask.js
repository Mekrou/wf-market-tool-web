const axios = require('axios')
const credentials = require('./credentials')

let isLoggedIn;
let wfMarketReq;

async function login() {
    if (!isLoggedIn) {
        const requestBody = {
            "auth_type": "header",
            "email": await credentials.readFromCredentials(credentials.CredentialKey.email),
            "password": await credentials.readFromCredentials(credentials.CredentialKey.password)
        }
        console.log("logging in...");
        const res = await axios.post('https://api.warframe.market/v1/auth/signin', requestBody, {
            headers: {
                'Authorization': await credentials.readFromCredentials(credentials.CredentialKey.token),
                'Content-Type': 'application/json',
                'platform': 'pc',
                'language': 'en',
            }
        });
        if (res.status != 200) throw new Error("Could not login!");
        /* update credentials.json and our axios instance to use the most updated token from WFMarket */
        await credentials.updateToken(res.headers.authorization);
        wfMarketReq = axios.create({
            baseURL: 'https://api.warframe.market/v1',
            headers: {
                'Authorization': res.headers.authorization,
                'Content-Type': 'application/json',
                'platform': 'pc',
                'language': 'en',
            }
        });
        console.log("Successfully logged in!")
        isLoggedIn = true
    }
}

async function createOrder() {
    await login();

    const requestBody = {
        "item": "5a2feeb1c2c9e90cbdaa23d2",
        "order_type": "sell",
        "platinum": 12,
        "quantity": 5,
        "visible": true,
    }

    console.log("creating order...")
    const res = await wfMarketReq.post('/profile/orders', requestBody)
    console.log(res.data)
}

module.exports = { login, createOrder }