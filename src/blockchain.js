const zenotta = require('@zenotta/zenotta-js');
const logger = require('./logger');
const db = require('./db');


/**
 * Generates a new Zenotta instance, without provided master key
 * 
 * @param {string} computeHost 
 * @param {string} intercomHost 
 * @param {string} passPhrase 
 * @param {*} redisClient 
 * @returns 
 */
async function generateNewZenottaInstance(computeHost, intercomHost, passPhrase, redisClient) {
    console.log('passphrase in generate', passPhrase);
    console.log('passphrase type', typeof passPhrase);
    const blInstance = await createZenottaInstance(computeHost, intercomHost, passPhrase);
    const mKeyResponse = blInstance.client.getMasterKey();

    if (mKeyResponse.status != 'success') {
        console.log(mKeyResponse);
        console.log("Exiting with error...");
        console.log("");

        process.exit(1);
    }

    db.setDb(redisClient, 'mkey', blInstance.client.getMasterKey().content.getMasterKeyResponse);
    return blInstance;
}

/**
 * Creates an instance of the Zenotta handler for blockchain integration
 * 
 * @param {string} computeHost - Hostname of the mempool node to use.
 * @param {string} intercomHost - Hostname of the intercom node to use.
 * @param {string} passPhrase - Passphrase to use to handle instance encryption
 * @param {string} masterKey - Master key to start the instance with. If not provided, a new one will be generated from seed phrase.
 * @returns 
 */
async function createZenottaInstance(computeHost, intercomHost, passPhrase, masterKey) {
    const client = new zenotta.ZenottaInstance();
    let initResult = null;

    if (!masterKey) {
        const seedPhrase = zenotta.generateSeedPhrase();
        console.log('seed phrase', seedPhrase);
        initResult = await client.initFromSeed({
            computeHost,
            intercomHost,
            passPhrase,
        },
            seedPhrase
        );
    } else {
        initResult = await client.initFromMasterKey({
            computeHost,
            intercomHost,
            passPhrase,
        },
            masterKey
        );
    }

    console.log('client', client);
    console.log('initResult', initResult);

    return {
        client,
        initResult
    };
}

/**
 * Generates a new encrypted keypair from the passed client
 * 
 * @param {*} client
 * @returns 
 */
function getNewKeypairEncrypted(client) {
    const keypairResp = client.getNewKeypair([]);

    if (keypairResp && keypairResp.status == 'success') {
        return keypairResp.content.newKeypairResponse;
    }

    logger.logHeaderError('Error Getting New Keypair', keypairResp);
    return null;
}

/**
 * Returns Receipt info from creation call
 * 
 * @param {*} createReceiptResp 
 * @returns 
 */
function handleCreateReceiptResp(createReceiptResp) {
    if (createReceiptResp) {
        return {
            receiptAsset: createReceiptResp.content.createReceiptResponse.asset.asset.Receipt,
            toAddress: createReceiptResp.content.createReceiptResponse.to_address
        }
    }

    return null;
}

module.exports = {
    createZenottaInstance,
    getNewKeypairEncrypted,
    handleCreateReceiptResp,
    generateNewZenottaInstance
}