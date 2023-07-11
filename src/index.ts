const fetch = require('node-fetch')
const io = require('socket.io-client')

const Network = require('./utils/Network')
const Database = require('./utils/Database')
const Timer = require('./utils/Timer')

/**
 * Main function
 */
async function main (): Promise<void> {
    await nodeServerDatabaseInit();
    const centralServer = await getCentralServer();

    const socket = io(`http://${centralServer.ipAddr}:${centralServer.port}`, {
        reconnection: true,
        // cors: {
        //   credentials: true,
        //   origin: 'http://192.168.10.44',
        //   methods: ['GET', 'POST']
        // },
        withCredentials: true,
        transports: ["polling"],
        allowEIO3: true, // false by default
    });

    socket.on("error", function () {
        console.log("Sorry, there seems to be an issue with the connection!");
    });

    socket.on("connect_error", function (err: Error) {
        console.error("connect failed " + err);
    });

    socket.on('connect', () => {
        console.log(`Connected to central server`);
    });

    // // GET ALL JOBS
    // const jobs = await Database.getAllJobsOfNode(ip);
    // if (jobs.length === 0) throw new Error("No jobs found");
    // else
    //     console.log(`Jobs: ${JSON.stringify(jobs)}`);
    //
    // // GET ALL SERVERS IP
    // const servers = await Database.getServersOfJobs(jobs);
    // if (servers.length === 0) throw new Error("No servers found");
    // console.log(`Servers: ${JSON.stringify(servers)}`);
    //
    // // Ping servers to check if they are alive
    // const aliveServers = await Network.pingServers(servers.map(( server: any ) => server.ipAddr));
    // if (aliveServers.length === 0) throw new Error("No alive servers found");
    // console.log(`Alive servers: ${JSON.stringify(aliveServers)}`);
    //
    // // GET ALL SERVICES OF ALIVE SERVERS
    // const services = await Database.getServicesOfJobs(jobs);
    // if (services.length === 0) throw new Error("No services found");
    // console.log(`Services: ${JSON.stringify(services)}`);
}

main()

async function nodeServerDatabaseInit(): Promise<void> {
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
}

async function getCentralServer(): Promise<any> {
    // GET CENTRAL SERVER IP
    const centralServer = await Database.getServerByType("Central");
    if (centralServer === undefined || centralServer === null) throw new Error("Central server not found");
    const mainServer = centralServer.filter((server: any) => server.priority === 1)
    console.log(`Central server: ${JSON.stringify(mainServer)}`);

    // PING CENTRAL SERVER
    const isCentralServerAlive = await Network.ping(mainServer[0].ipAddr);
    if (isCentralServerAlive) {
        console.log(`Central server is alive`);
        return mainServer[0];
    }

    console.log(`Central server is not alive, trying to connect to backup server`);
    const backupServer = centralServer.filter((server: any) => server.priority === 0)
    const isBackupServerAlive = await Network.pingServers([backupServer[0].ipAddr]);
    if (!isBackupServerAlive) throw new Error("Backup central server is not alive");
    console.log(`Backup server: ${JSON.stringify(backupServer)}`);

    return backupServer[0];
}