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

/**
 * Post a mod sell order on WFMarket.
 * @param {Object} order 
 * @example postListing({
 *    item: "abating_link",
 *    sellPrice: 20,
 *    quantity: 99
 * })
 * @returns the id of the order
 * @example '65f47915b0f8090085a17e9d'
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
        return res.data.payload.order.id;
    } catch (error) {
        console.log(error)
    }
}

async function main() {
    // const database = await parseJson('database')
    // for (let mod in database.augment_mods)
    // {
    //     await shouldBeVisible(mod);
    // }

    await toggleOrderVisibility('65f5a492c405f600a9e06b75');
}

/**
 * Grabs the latest augment mod names from WF api and updates database.json to be populated with them and their respective WFMarket ids.
 */
async function updateDatabaseAugmentMods() {
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
 * Looks at every augment in database and post a listing of it on WFMarket
 */
async function generateAugmentListings() {
    const database = await parseJson('database');
    for (let mod in database.augment_mods) {
        const price = await getPriceForItem(mod)
        let listing = {
            item: mod,
            sellPrice: price ? price : 20,
            quantity: 99,
        }
        const id = await postModListing(listing);
        console.log(id)
        database.augment_mods[mod].orderID = id;
        const date = new Date().toJSON();
        database.augment_mods[mod].lastModified = date;
        console.log(`${mod} listing posted!`)
        await delay(300);
    }

    const jsonToWrite = JSON.stringify(database);
    await fs.writeFile(path.join(__dirname, 'database.json'), jsonToWrite)
}

/**
 * Using the stored order ids in database, removes listings from WF Market & their ids from db.
 */
async function deleteAugmentListings() {
    const database = await parseJson('database')
    for (let mod in database.augment_mods) {
        const orderID = database.augment_mods[mod].orderID;
        try {
            const res = await wfMarketReq.delete(`/profile/orders/${orderID}`);
        } catch (error) {
            console.log("Order already deleted, removing from DB.")
        }
        database.augment_mods[mod].orderID = undefined;
        database.augment_mods[mod].lastModified = undefined;
        console.log(`${mod} order successfully removed.`)
        await delay(300);
    }

    const jsonToWrite = JSON.stringify(database);
    await fs.writeFile(path.join(__dirname, 'database.json'), jsonToWrite)
}

/**
 * 
 * @param {string} modName the mod to get the id for in WFMarket format
 * @returns {number} the ID of the mod.
 * @example getModID('abating_link') -> '54e644ffe779897594fa68d2'
 */
async function getModID(modName) {
    console.log(`Grabbing ID for ${modName}`)
    await delay(300);
    const res = await wfMarketReq.get(`/items/${modName}`);
    const { id } = res.data['payload']['item'];
    console.log(`ID for ${modName} is ${id}`)
    return id;
}

/**
 * @async Updates every mod in database to have the current id. ID is retrieved from getModID()
 */
async function updateAugmentModIdsInDB() {
    const database = await parseJson('database');
    const augmentMods = database.augment_mods;
    for (let mod in augmentMods) {
        database.augment_mods[mod].marketID = await getModID(mod)
    }
    const jsonToWrite = JSON.stringify(database);
    await fs.writeFile(path.join(__dirname, 'database.json'), jsonToWrite)
}

/**
 * Uses warframe stats api to retrieve a list of all warframe augment mod names.
 * Updates db.augment_mods to have every mod and its respective syndicates.
 */
async function updateAugmentModsInDB() {
    const res = await wfStatApi.get('/mods', {
        params: {
            language: 'en',
            only: 'name,isAugment,drops'
        }
    })
    const database = await parseJson('database')
    // parse only augment mods
    const mods = res.data;
    mods.forEach(mod => {
        if (mod.isAugment && mod.drops) {
            const modName = mod.name;
            const syndicates = new Array();

            mod.drops.forEach(drop => {
                if (!(drop.location.includes('Conclave'))) {
                    /* There's a bug w/ the augment 'safeguard' and 'safeguard switch' in the api. 
                    Its drop tables are mixed in with the drop tables of the other mod, 
                    so this step simply asserts that the drop location is for the same mod. 
                    It's redundant, but solves this issue. */
                    const type = drop.type.substring(0, drop.type.indexOf('(') - 1)
                    if (type === mod.name)
                        syndicates.push(drop.location.substring(0, drop.location.indexOf(',')).toLowerCase().replaceAll(' ', '_').replaceAll("'", '').replaceAll("&", "and"))
                }
            })

            if (syndicates.length > 0)
                database.augment_mods[modName.toLowerCase().replaceAll(' ', '_').replaceAll("'", '').replaceAll("&", "and")] = { syndicates }
        }
    });

    const jsonToWrite = JSON.stringify(database);
    await fs.writeFile(path.join(__dirname, 'database.json'), jsonToWrite)
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

/**
 * Reads the exhausted syndicates stored in database, which is required to be read beforehand.
 * @returns An Array of the user's currently exhausted syndicates
 * @example
 * [ 'steel_meridian', 'cephalon_suda, arbiters_of_hexis' ]
 */
function getExhaustedSyndicates(database) {
    return new Set(database.exhausted_syndicates);
}

/**
 * Checks whether or not a mod should be toggled invisible based on the availibility of its syndicates.
 * @param {String} mod the mod name 
 */
async function shouldBeVisible(mod) {
    const database = await parseJson('database')
    const syndicates = database.augment_mods[mod].syndicates;
    let shouldBeVisible = false;
    
    // If at least one syndicate is not exhausted for each mod, then it should be visible.
    shouldBeVisible = !(syndicates.every(syndicate => getExhaustedSyndicates(database).has(syndicate)))

    return shouldBeVisible
}

async function toggleOrderVisibility(orderID) {
    console.log(`Toggling visibility of ${orderID}`)
    const res = await wfMarketReq.put(`/profile/orders/${orderID}`, { orderID, visible: 'false'})
    console.log(res.data);
}

module.exports = { login, main }