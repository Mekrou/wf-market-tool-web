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

// const requestBody = {
//     "item": "5a2feeb1c2c9e90cbdaa23d2",
//     "order_type": "sell",
//     "platinum": 12,
//     "quantity": 5,
//     "visible": true,
// }

async function getOrderID(item_name) {

}


/**
 * @async Creates an order on WFMarket
 * @param {Object} options expected to have at minimum item_name & cost properties.
 * @param {string} options.item_name - The name of the item to order.
 * @param {number} options.cost - The amount of plat to put it with.
 * @param {number} [options.quantity=1] - The amount of orders to place (optional, defaults to 1)
 */
async function createOrder({ item_name, cost, quantity = 1}) {
    if (!item_name || !cost) throw new Error("Cannot create order without name and cost")

    console.log(`Creating ${quantity} order(s) for ${item_name} at ${cost}`)
}

module.exports = { login, createOrder }