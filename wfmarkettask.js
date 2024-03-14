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
    getPriceForItem("abundant_mutationaa")
}

async function delay(delay) {
    return setTimeout(delay)
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
 * @returns An array of WF's Augment mods (excluding conclave) names in the format that WF Market uses (all lowercase, spaces as underscores, remove apostrophies)
 * @example 
 * ['abating_link', 'abundant_mutation', ... ]
 */
function transformAugmentModsToWFMarketStyle(augmentModNames) {
    const transformedAugmentModNames = new Array();
    augmentModNames.forEach(modName => {
        const lowerCaseName = modName.toLowerCase();
        transformedAugmentModNames.push(lowerCaseName.replaceAll(' ', '_').replaceAll("'", '').replaceAll("&", "and"));
    })
    return transformedAugmentModNames;
}

/**
 * Uses warframe stats api to retrieve a list of all warframe augment mod names.
 * @returns A set containing a String of every Warframe Augment Mod, excluding conclave ones.
 */
async function getWarframeAugmentMods() {
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
                        augmentModNames.add(mod.name)
                    }
                })
            }

        }
    });

    return transformAugmentModsToWFMarketStyle(augmentModNames);
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
 * @returns {Number} average price
 */
async function getPriceForItem(itemName) {
    try {
        const res = await wfMarketReq.get(`/items/${itemName}/statistics`)
        const {statistics_live} = res.data.payload;
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
 * @async Creates an order on WFMarket
 * @param {Object} options expected to have at minimum item_name & cost properties.
 * @param {string} options.item_name - The name of the item to order.
 * @param {number} options.cost - The amount of plat to put it with.
 * @param {number} [options.quantity=1] - The amount of orders to place (optional, defaults to 1)
 */
async function createOrder({ item_name, cost, quantity = 1 }) {
    if (!item_name || !cost) throw new Error("Cannot create order without name and cost")
    const itemID = await getModID('hi')
    console.log(`Creating ${quantity} order(s) for ${item_name} at ${cost}`)
}

module.exports = { login, createOrder, test }