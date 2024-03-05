const axios = require('axios')
const credentials = require('./credentials')
const path = require('path');
const { setTimeout } = require('timers/promises');
const fs = require('fs').promises

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

async function parseJson(filename) {
    try {
        filename = filename + '.json'
        const data = await fs.readFile(path.join(__dirname, filename));
        return JSON.parse(data);
    } catch (error) {
        console.log(error)
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
    try {
        const augment = await parseJson('augment')
        console.log(augment['New Loka']['AugmentMods'])
    } catch (error) {
        
    }
}

async function test() {
    
}

async function delay(delay) {
    return setTimeout(delay)
}

/**
 * @async Loops through each mod name in augments.json & retrieves its respective ID from WFMarket.
 * Updates the name => id map in augmentNamesAndIds.json
 */
async function updateModIds() {
    const augment = await parseJson('augment')
    const augmentNamesAndIds = new Map();
    for (let syndicate in augment) {
        for (let mod of augment[syndicate]['AugmentMods']) {
            const res = await wfMarketReq.get(`/items/${mod.modName}`)
            const { id } = res.data['payload']['item']
            console.log(`Setting ${mod.modName} to ${id}`)
            augmentNamesAndIds.set(mod.modName, id)
            await delay(1000)
        }
    }
    const mapArray = Array.from(augmentNamesAndIds);
    const jsonToWrite = JSON.stringify(mapArray, null, 2);
    await fs.writeFile(path.join(__dirname, 'augmentNamesAndIds.json'), jsonToWrite)
}

async function getModId(modName) {

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
    getOrderID('hi')
    console.log(`Creating ${quantity} order(s) for ${item_name} at ${cost}`)
}

module.exports = { login, createOrder, test}