const fetch = require('node-fetch')
const io = require('socket.io-client')

const Network = require('./utils/Network')
const Database = require('./utils/Database')
const Timer = require('./utils/Timer')

/**
 * Main function
 */
async function main (): Promise<void> {

    // GET LOCAL IP
    const ip = await Network.getLocalIP();
    if (ip === undefined)  throw new Error("Could not get local IP");
    else
        console.log(`Local IP: ${ip}`);

    // VERIFY NODE EXISTS IN DATABASE
    const isServerInDatabase = await Database.isServerInDatabase(ip);
    if (!isServerInDatabase) {
        await Database.addServerToDatabase(ip, "Node", null);
        console.log(`Added node server to database`);
    }
    else {
        const isServerANode = await Database.isServerANode(ip);
        if(!isServerANode) {
            await Database.updateServerType(ip, "Node");
        }
    }

    // GET CENTRAL SERVER IP
    const centralServer = await Database.getCentralServer();
    if (centralServer === undefined) throw new Error("Central server not found");
    else
        console.log(`Central server: ${JSON.stringify(centralServer)}`);

    // PING CENTRAL SERVER
    const isCentralServerAlive = await Network.pingServer(centralServer.ipAddr);
    if (!isCentralServerAlive) throw new Error("Central server is not alive");
    else
        console.log(`Central server is alive`);

    // CONNECT TO CENTRAL SERVER
    const socket = io(`http://${centralServer.ipAddr}:3000`);
    socket.on('connect', () => {
        console.log(`Connected to central server`);
    });

    // GET ALL JOBS
    const jobs = await Database.getAllJobsOfNode(ip);
    if (jobs.length === 0) throw new Error("No jobs found");
    else
        console.log(`Jobs: ${JSON.stringify(jobs)}`);

    // GET ALL SERVERS IP
    const servers = await Database.getServersOfJobs(jobs);
    if (servers.length === 0) throw new Error("No servers found");
    console.log(`Servers: ${JSON.stringify(servers)}`);

    // Ping servers to check if they are alive
    const aliveServers = await Network.pingServers(servers.map(( server: any ) => server.ipAddr));
    if (aliveServers.length === 0) throw new Error("No alive servers found");
    console.log(`Alive servers: ${JSON.stringify(aliveServers)}`);

    // GET ALL SERVICES OF ALIVE SERVERS
    const services = await Database.getServicesOfJobs(jobs);
    if (services.length === 0) throw new Error("No services found");
    console.log(`Services: ${JSON.stringify(services)}`);
}

main()