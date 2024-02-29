const fs = require('fs').promises
const path = require('path')

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
        const data = await fs.readFile(path.join(__dirname, 'credentials.json'), 'utf-8')
        const objectPayload = JSON.parse(data)
        return objectPayload[key]
    } catch (error) {
        console.log(error);
    }
}


module.exports = { readFromCredentials, CredentialKey };