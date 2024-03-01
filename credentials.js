const fs = require('fs').promises
const path = require('path')

const filename = 'credentials.json'

/**
 * Enum for valid keys in Credentials.json
 * @readonly
 * @enum {string}
 */
const CredentialKey = {
    email: 'email',
    password: 'password',
    token: 'token'
}

/**
 * 
 * @param {CredentialKey} key 
 * @returns 
 */
async function readFromCredentials(key) {
    try {
        const data = await fs.readFile(path.join(__dirname, filename), 'utf-8')
        const objectPayload = JSON.parse(data)
        return objectPayload[key]
    } catch (error) {
        console.log(error);
    }
}

async function updateToken(newToken) {
    try {
        const data = await fs.readFile(path.join(__dirname, filename), 'utf-8');
        const credentials = JSON.parse(data);
        credentials.token = newToken;
        const updatedJsonData = JSON.stringify(credentials,null,2);
        await fs.writeFile(filename, updatedJsonData);
        console.log(`Updated token to ${newToken.substring(4,11)} in ${filename}`)
    } catch (error) {
        console.log("Could not update token")
        console.log(`  ${error}`)
    }
}

module.exports = { readFromCredentials, CredentialKey, updateToken };