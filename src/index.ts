const fetch = require('node-fetch')

const Network = require('./utils/Network')
const Database = require('./utils/Database')

async function main () {

    // GET LOCAL IP
    const ip = await Network.getLocalIP();
    if (ip === undefined)  throw new Error("Could not get local IP");
    else
        console.log(`Local IP: ${ip}`);

    // VERIFY NODE EXISTS IN DATABASE
    const isServerInDatabase = await Database.isServerInDatabase(ip);
    if (!isServerInDatabase) {
        await Database.addServerToDatabase(ip);
        console.log(`Added node server to database`);
    }
    else {
        const isServerANode = await Database.isServerANode(ip);
        if(!isServerANode) {
            await Database.updateServerType(ip, "NODE");
        }
    }
}

main()