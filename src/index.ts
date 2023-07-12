
const Network = require('./utils/Network')
const Database = require('./utils/Database')
const Timer = require('./utils/Timer')
const Services = require('./utils/Services')

/**
 * Main function
 */
async function main (): Promise<void> {
    const ip: string = await nodeServerDatabaseInit();

    // GET ALL JOBS
    const jobs = await Database.getAllJobsOfNode(ip);
    if (jobs.length === 0) throw new Error("No jobs found");
    else
        console.log(`Jobs: ${JSON.stringify(jobs)}`);

    // // GET ALL SERVERS IP
    const servers = await Database.getServersOfJobs(jobs);
    if (servers.length === 0) throw new Error("No servers found");
    console.log(`Servers: ${JSON.stringify(servers)}`);

    const pingWrapper = await Services.pingFunctionsInArray(servers);
    Timer.executeTimedTask(pingWrapper, [5000, 2000], [0, 0]);
}

main()

async function nodeServerDatabaseInit(): Promise<string> {
    // GET LOCAL IP
    const ip = await Network.getLocalIP();
    if (ip === undefined)  throw new Error("Could not get local IP");
    else
        console.log(`Local IP: ${ip}`);

    // VERIFY NODE EXISTS IN DATABASE
    if (!await Database.isServerInDatabase(ip)) {
        await Database.addServerToDatabase(ip, "Node", null, null);
        console.log(`Added node server to database`);
    }
    else {
        const isServerANode = await Database.isServerANode(ip);
        if(!isServerANode) {
            await Database.updateServer(ip, "Node", null, null);
        }
    }

    return ip;
}