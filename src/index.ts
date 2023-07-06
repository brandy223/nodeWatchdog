const fetch = require('node-fetch')

const Network = require('./utils/Network')
const Database = require('./utils/Database')

/**
 * Main function
 */
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

    // GET ALL JOBS
    const jobs = await Database.getAllJobsOfNode(ip);
    if (jobs.length === 0) throw new Error("No jobs found");
    else
        console.log(`Jobs: ${JSON.stringify(jobs)}`);

    const services = await Database.getAllServicesOfJobs(jobs);
    if (services.length === 0) throw new Error("No services found");
    else
        console.log(`Services: ${JSON.stringify(services)}`);
}

main()