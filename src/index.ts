
const io= require('socket.io-client');
const NodeCache = require("node-cache");
export const cache = new NodeCache({
    stdTTL: 30,
    checkperiod: 60,
    deleteOnExpire: true,
});
const Network = require('./utils/Network');
const Database = require('./utils/Database');
const Timer = require('./utils/Timer');
const Services = require('./utils/Services');
const theme = require('./utils/ColorScheme').theme;

/**
 * Main function
 */
async function main (): Promise<void> {
    const ip: string = await Database.nodeServerDatabaseInit();
    const centralServer = await Database.getCurrentCentralServer();

    // GET ALL JOBS
    let jobs = await Database.getAllJobsOfNode(ip);
    if (jobs.length === 0) throw new Error("No jobs found");
    console.log(theme.debug(`Jobs: ${JSON.stringify(jobs)}`));
    cache.set("jobs", jobs, 60*60);

    // GET ALL SERVERS
    let servers = await Database.getServersOfJobs(jobs);
    if (servers.length === 0) throw new Error("No servers found");
    console.log(theme.debug(`Servers: ${JSON.stringify(servers)}`));
    cache.set("servers", servers, 60*60);

    // PING SERVERS
    let pingWrapper = await Services.pingFunctionsInArray(servers);
    let pingTasks = await Timer.executeTimedTask(pingWrapper, [5000], [3000]);

    // GET ALL REACHABLE SERVERS
    let serversIps = servers.map((server: any) => server.ipAddr);
    let reachableServersIps = await Network.pingServers(serversIps);
    if (reachableServersIps.length === 0) throw new Error("No reachable servers found");
    console.log(theme.debug(`Reachable servers: ${JSON.stringify(reachableServersIps)}`));

    // GET ALL SERVICES FROM REACHABLE SERVERS
    let toDo = await Database.getAllServersAndServicesIdsOfJobs(jobs);
    let reachableServers = await Database.getServersByIP(reachableServersIps);
    toDo.filter((server: any) => reachableServers.includes(server.id));

    // TEST SERVICES
    let servicesWrapper = await Services.systemctlTestFunctionsInArray(toDo);
    let servicesTasks = await Timer.executeTimedTask(servicesWrapper, [5000], [0]);

    // REFRESH FUNCTIONS
    const jobsInterval = async () => {
        const jobs = await Database.getAllJobsOfNode(ip);
        if (jobs.length === 0) throw new Error("No jobs found");
        cache.set("jobs", jobs, 60*60)
        console.log(theme.debug(`Jobs: ${JSON.stringify(jobs)}`));
    }
    const serversInterval = async () => {
        const jobs: any[] = cache.get("jobs");
        const servers = await Database.getServersOfJobs(jobs);
        if (servers.length === 0) throw new Error("No servers found");
        cache.set("servers", servers, 60*60)
        console.log(theme.debug(`Servers: ${JSON.stringify(servers)}`));
    }
    const mainIntervals: any[] = await Timer.executeTimedTask(
        [jobsInterval, serversInterval],
        // [5*60*1000, 5*60*1000, 5*60*1000],
        [5000, 5000],
        [10000, 10000]
    );

    // MAIN SOCKET FOR CENTRAL SERVER BROADCAST
    const mainSocket = io(`http://${centralServer.ipAddr}:${centralServer.port}`, {
        reconnection: true,
        cors: {
            origin: centralServer.ipAddr,
            methods: ['GET', 'POST']
        },
        withCredentials: true,
        transports: ["polling"],
        allowEIO3: true, // false by default
    });

    mainSocket.on("error", function () {
        console.error(theme.error("Sorry, there seems to be an issue with the connection!"));
    });

    mainSocket.on("connect_error", function (err: Error) {
        console.error(theme.error("connection failed: " + err));
    });

    mainSocket.on('connect', () => {
        mainSocket.emit('main_connection', ip);

        mainSocket.on("main_connection_ack", (message: string) => {
           console.log(theme.bgSuccess("Central Server Main Connection ACK : " + message));
        });

        mainSocket.on("room_broadcast", (message: object) => {
            console.log(theme.bgWarning("Central Server's broadcast :"));
            console.log(message);
        });
    });

    // CACHE EVENTS
    cache.on("set", async (key: string, value: any[]) => {
        switch(key) {
            case "jobs":
                jobs = value;
                // TODO: Need to refresh all values
                console.log("Jobs refreshed");
                break;
            case "servers":
                servers = value;
                console.log("Servers refreshed");
                break;
        }
    });

    cache.on("expired", async (key: string) => {
        console.log(`Cache expired: ${key}`);
        const newJobs = await Database.getAllJobsOfNode(ip);
        switch (key) {
            case "jobs":
                if (newJobs.length === 0) throw new Error("No jobs found");
                cache.set("jobs", newJobs, 60*60)
                console.log(`Jobs: ${JSON.stringify(newJobs)}`);
                break;
            case "servers":
                const newServers = await Database.getServersOfJobs(newJobs);
                if (newServers.length === 0) throw new Error("No servers found");
                cache.set("servers", newServers, 60*60)
                console.log(`Servers: ${JSON.stringify(newServers)}`);
                break;
        }
    });
}

main();