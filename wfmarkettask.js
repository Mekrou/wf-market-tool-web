const axios = require('axios')
const credentials = require('./credentials')
const path = require('path');
const { setTimeout } = require('timers/promises');
const fs = require('fs').promises

let isLoggedIn;
let wfMarketReq;
const wfStatApi = axios.create({
    baseURL: 'https://api.warframestat.us'
});

/**
 * The name of Warframe Syndicates
 * @enum {string}
 * @readonly
 */
const Syndicate = {
    The_Perrin_Sequence: "the_perrin_sequence",
    New_Loka: "new_loka",
    Steel_Meridian: "steel_meridian",
    Arbiters_of_Hexis: "arbiters_of_hexis",
    Red_Veil: "red_veil",
    Cephalon_Suda: "cephalon_suda"
}

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
//     ***"order_type": "sell",
//     "platinum": 12,
//     "quantity": 5,
//     "visible": true,
// }

/**
 * Post a mod sell order on WFMarket.
 * @param {Object} order 
 * @example postListing({
 *    item: "abating_link",
 *    sellPrice: 20,
 *    quantity: 99
 * })
 */
async function postModListing(order) {
    if (typeof order.item !== 'string' || typeof order.sellPrice !== 'number' || typeof order.quantity !== 'number') {
        throw new Error(`Invalid order object.  ${order.item} is of type ${typeof order.item}${order.sellPrice} is of type ${typeof order.sellPrice}${order.quantity} is of type ${typeof order.quantity}`)
    }

    try {
        const requestBody = {
            item: await getModID(order.item),
            order_type: "sell",
            platinum: order.sellPrice,
            quantity: order.quantity,
            visible: true,
            rank: 0,
        }
        const res = await wfMarketReq.post('/profile/orders', requestBody)
        return res;
    } catch (error) {
        console.log(error)
    }
}

async function getOrderID(item_name) {
    try {
        const augment = await parseJson('augment')
        console.log(augment['New Loka']['AugmentMods'])
    } catch (error) {

    }
}

async function test() {
    const database = await parseJson('database');
    for (let syndicate in database) {
        database[syndicate].AugmentMods = new Object();
        const augmentModNames = await getWarframeAugmentMods(syndicate)
        for (let modName of augmentModNames) {
            database[syndicate].AugmentMods[modName] = await getModID(modName)
        }
    }
    const jsonToWrite = JSON.stringify(database, null, 2);
    await fs.writeFile(path.join(__dirname, 'database.json'), jsonToWrite)
}

async function delay(delay) {
    return setTimeout(delay)
}

/**
 * Using augmentNamesAndIds.json, posts an order on WFMarket for every WF augment mod using its average price
 */
async function generateAugmentListings() {
    const augmentModNames = await getWarframeAugmentMods();
    for (let modName of augmentModNames) {
        await delay(300);
        let listing = {
            item: modName,
            sellPrice: await getPriceForItem(modName),
            quantity: 99,
        }
        await postModListing(listing);
        console.log(`${modName} listing posted!`)
    }

}

async function updateModIds() {
    const augmentModNames = await getWarframeAugmentMods();
    const augmentNamesAndIds = new Array();
    for (let modName of augmentModNames) {
        await delay(500);
        const res = await wfMarketReq.get(`/items/${modName}`);
        const { id } = res.data['payload']['item'];
        console.log(`Setting ${modName} to ${id}`);
        augmentNamesAndIds.push([modName, id])
    }

    const jsonToWrite = JSON.stringify(augmentNamesAndIds, null, 2);
    await fs.writeFile(path.join(__dirname, 'augmentNamesAndIds.json'), jsonToWrite)
}

/**
 * @async Updates every mod in database to have the current id. ID is retrieved from getModId()
 */
async function updateJsonDbModIds() {
    const database = await parseJson('database');
    for (let syndicate in database) {
        for (let mod in database[syndicate]['AugmentMods']) {
            database[syndicate]['AugmentMods'][mod] = await getModID(mod)
        }
    }
    const jsonToWrite = JSON.stringify(database);
    await fs.writeFile(path.join(__dirname, 'database.json'), jsonToWrite)
}

/**
 * Uses warframe stats api to retrieve a list of all warframe augment mod names.
 * @returns A set containing a String of every Warframe Augment Mod, excluding conclave ones.
 */
async function getWarframeAugmentMods(syndicate) {
    const res = await wfStatApi.get('/mods', {
        params: {
            language: 'en',
            only: 'name,isAugment,drops'
        }
    })
    const augmentModNames = new Set();
    // parse only augment mods
    const mods = res.data;
    mods.forEach(mod => {
        if (mod.isAugment) {
            if (mod.drops) {
                mod.drops.forEach(drop => {
                    if (!(drop.location.includes('Conclave'))) {
                        if (syndicate) {
                            if (drop.location.toLowerCase().includes(syndicate.replaceAll('_', ' '))) {
                                augmentModNames.add(mod.name.toLowerCase().replaceAll(' ', '_').replaceAll("'", '').replaceAll("&", "and"))
                            }
                        } else {
                            augmentModNames.add(mod.name.toLowerCase().replaceAll(' ', '_').replaceAll("'", '').replaceAll("&", "and"))
                        }

                    }
                })
            }

        }
    });

    return augmentModNames;
}

/**
 * @async Loops through mod name -> id map to find a mod's id with given name.
 * @param {string} modName The name of the mod to find. All lowercase, with spaces as underscores.
 * @example getModId('creeping_terrify') -> '56b656e0ef0390c7e4006383'
 * @returns the mod ID as a string.
 */
async function getModID(modName) {
    try {
        const nameToIdMap = await parseJson('augmentNamesAndIds');
        let modWithId = undefined;
        for (let el of nameToIdMap) {
            if (el[0] === modName) {
                modWithId = el
            }
        }
        if (modWithId === undefined) {
            throw new Error(`Could not find mod with name of ${modName}`)
        }
        return modWithId[1]
    } catch (error) {
        console.log(error)
    }
}

/**
 * Gets the average price of an item for the last 48 hours rounded up to the nearest integer.
 * @returns Average Price
 */
async function getPriceForItem(itemName) {
    try {
        const res = await wfMarketReq.get(`/items/${itemName}/statistics`)
        const { statistics_live } = res.data.payload;
        let sum = 0;
        for (let obj of statistics_live['48hours']) {
            if (obj.order_type == "sell") {
                sum += obj.avg_price;
            }
        }
        let avg_price = (Math.ceil(sum / statistics_live['48hours'].length))
        return avg_price;
    } catch (err) {
        console.log(err)
    }
}

module.exports = { login, test }