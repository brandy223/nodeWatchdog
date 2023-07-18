
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
const compareArrays = require('./utils/Utilities/Arrays').compareArrays;
const theme = require('./utils/ColorScheme').theme;

/**
 * Main function
 */
async function main (): Promise<void> {
    const ip: string = await Database.nodeServerDatabaseInit();
    let centralServer = await Database.getCurrentCentralServer();
    setInterval(() => {
        (Database.getCurrentCentralServer()).then((newCentralServer: any) => {
           if (centralServer !== newCentralServer) {
               console.log(theme.warningBright("New central server detected: " + newCentralServer));
               centralServer = newCentralServer;
           }
        });
    }, Number(process.env.CENTRAL_SERVER_REFRESH_INTERVAL));

    let jobCacheUpdateCount: number = 0;
    let serversCacheUpdateCount: number = 0;
    let reachableServersCacheUpdateCount: number = 0;
    let toDoCacheUpdateCount: number = 0;

    let mainIntervalsCleared: boolean = false;
    let pingIntervalsCleared: boolean = false;
    let servicesIntervalsCleared: boolean = false;

    // GET ALL JOBS
    let jobs = await Database.getAllJobsOfNode(ip);
    if (jobs.length === 0) throw new Error("No jobs found");
    console.log(theme.debug(`Jobs: ${JSON.stringify(jobs)}`));
    cache.set("jobs", jobs, 60*60);
    jobCacheUpdateCount++;
    // Interval to update jobs
    const jobsInterval = async () => {
        await updateJobsListInCache(ip);
        jobCacheUpdateCount++;
    }

    // GET ALL SERVERS
    let servers = await Database.getServersOfJobs(jobs);
    if (servers.length === 0) throw new Error("No servers found");
    console.log(theme.debug(`Servers: ${JSON.stringify(servers)}`));
    cache.set("servers", servers, 60*60);
    serversCacheUpdateCount++;
    // Interval to update servers
    const serversInterval = async () => {
        await updateServersListInCache(servers);
        serversCacheUpdateCount++;
    }

    // GET ALL REACHABLE SERVERS (For services)
    let serversIps = servers.map((server: any) => server.ipAddr);
    let reachableServersIps = await Network.pingServers(serversIps);
    if (reachableServersIps.length === 0) throw new Error("No reachable servers found");
    console.log(theme.debug(`Reachable servers: ${JSON.stringify(reachableServersIps)}`));
    cache.set("reachableServersIps", reachableServersIps, 60*60);
    reachableServersCacheUpdateCount++;
    // Interval to update reachable servers
    const reachableServersInterval = async () => {
        await updateReachableServersListInCache(servers);
        reachableServersCacheUpdateCount++;
    }

    // GET ALL TASKS FROM REACHABLE SERVERS
    let toDo = await Database.getAllServersAndServicesIdsOfJobs(jobs);
    let reachableServers = await Database.getServersByIP(reachableServersIps);
    toDo.filter((server: any) => reachableServers.includes(server.id));
    if (toDo.length === 0) throw new Error("No services can be tested");
    console.log(theme.debug(`Tasks to execute: ${JSON.stringify(toDo)}`));
    cache.set("toDo", toDo, 60*60);
    toDoCacheUpdateCount++;
    // Interval to update the todo list
    const todoInterval = async () => {
        await updateTodoListInCache(reachableServersIps, jobs);
        toDoCacheUpdateCount++;
    }

    // PING SERVERS TO SEND TO CENTRAL SERVER
    let pingWrapper = await Services.pingFunctionsInArray(servers);
    let pingTasks = await Timer.executeTimedTask(pingWrapper, [5000], [3000]);

    // TEST SERVICES
    let servicesWrapper = await Services.systemctlTestFunctionsInArray(toDo);
    let servicesTasks = await Timer.executeTimedTask(servicesWrapper, [5000], [0]);


    let mainIntervals: any[] = await Timer.executeTimedTask(
        [jobsInterval, serversInterval, reachableServersInterval, todoInterval],
        // [5*60*1000, 5*60*1000, 5*60*1000],
        [5000, 5000, 5000, 5000],
        [10000, 10000, 10000, 10000]
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

    mainSocket.on("error", async () => {
        if (!mainIntervalsCleared) {
            await Timer.clearAllIntervals(mainIntervals);
            mainIntervalsCleared = true;
        }
        if (!pingIntervalsCleared) {
            await Timer.clearAllIntervals(pingTasks);
            pingIntervalsCleared = true;
        }
        if (!servicesIntervalsCleared) {
            await Timer.clearAllIntervals(servicesTasks);
            servicesIntervalsCleared = true;
        }
        console.error(theme.error("Sorry, there seems to be an issue with the connection!"));
    });

    mainSocket.on("connect_error", async (err: Error) => {
        if (!mainIntervalsCleared) {
            await Timer.clearAllIntervals(mainIntervals);
            mainIntervalsCleared = true;
        }
        if (!pingIntervalsCleared) {
            await Timer.clearAllIntervals(pingTasks);
            pingIntervalsCleared = true;
        }
        if (!servicesIntervalsCleared) {
            await Timer.clearAllIntervals(servicesTasks);
            servicesIntervalsCleared = true;
        }
        console.error(theme.error("connection failed: " + err));
        mainSocket.disconnect();
    });

    mainSocket.on('connect', async () => {
        if (mainIntervalsCleared) {
            mainIntervals = await Timer.executeTimedTask(
                [jobsInterval, serversInterval, reachableServersInterval, todoInterval],
                // [5*60*1000, 5*60*1000, 5*60*1000],
                [5000, 5000, 5000, 5000],
                [10000, 10000, 10000, 10000]
            );
            mainIntervalsCleared = false;
        }
        if (pingIntervalsCleared) {
            pingTasks = await Timer.executeTimedTask(pingWrapper, [5000], [3000]);
            pingIntervalsCleared = false;
        }
        if (servicesIntervalsCleared) {
            servicesTasks = await Timer.executeTimedTask(servicesWrapper, [5000], [0]);
            servicesIntervalsCleared = false;
        }

        mainSocket.emit('main_connection', ip);

        mainSocket.on("main_connection_ack", (message: string) => {
           console.log(theme.bgSuccess("Central Server Main Connection ACK: " + message));
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
                if (jobCacheUpdateCount === 0) break;
                jobs = value;
                await updateServersListInCache(servers);
                await updateReachableServersListInCache(servers);
                await updateTodoListInCache(reachableServersIps, jobs);
                console.log("Jobs refreshed");
                break;
            case "servers":
                if (serversCacheUpdateCount === 0) break;
                servers = value;
                await updateReachableServersListInCache(servers);
                await updateTodoListInCache(reachableServersIps, jobs);
                console.log("Servers refreshed");
                break;
            case "reachableServersIps":
                if (reachableServersCacheUpdateCount === 0) break;
                reachableServersIps = value;
                await updateTodoListInCache(reachableServersIps, jobs);
                console.log("Reachable servers refreshed");
                break;
            case "toDo":
                if (toDoCacheUpdateCount === 0) break;
                toDo = value;
                console.log("ToDo refreshed");
                break;
        }
    });

    cache.on("expired", async (key: string) => {
        console.log(`Cache expired: ${key}`);
        const newJobs = await Database.getAllJobsOfNode(ip);
        switch (key) {
            case "jobs":
                await updateJobsListInCache(ip);
                await updateServersListInCache(newJobs);
                await updateReachableServersListInCache(servers);
                await updateTodoListInCache(reachableServersIps, newJobs);
                break;
            case "servers":
                await updateServersListInCache(newJobs);
                await updateReachableServersListInCache(servers);
                await updateTodoListInCache(reachableServersIps, newJobs);
                break;
            case "reachableServersIps":
                await updateReachableServersListInCache(servers);
                await updateTodoListInCache(newJobs, jobs);
                break;
            case "toDo":
                await updateTodoListInCache(reachableServersIps, jobs);
                break;
        }
    });
}

main();

/**
 * Update the jobs list in cache
 * @param {string} ip IP of the server
 * @return {Promise<void>}
 * @throws {Error} No jobs found
 */
async function updateJobsListInCache(ip: string): Promise<void> {
    const jobs = await Database.getAllJobsOfNode(ip);
    if (jobs.length === 0) throw new Error("No jobs found");
    if (cache.get("jobs") != undefined && (await compareArrays(jobs, cache.get("jobs")))) return;
    cache.set("jobs", jobs, 60*60)
    console.log(theme.debug(`Jobs: ${JSON.stringify(jobs)}`));
}

/**
 * Update the servers list in cache
 * @param {any[]} jobs List of jobs
 * @return {Promise<void>}
 * @throws {Error} No jobs given
 * @throws {Error} No servers found
 */
async function updateServersListInCache(jobs: any[]): Promise<void> {
    if (jobs.length === 0) throw new Error("No jobs given");
    const servers = await Database.getServersOfJobs(jobs);
    if (servers.length === 0) throw new Error("No servers found");
    if (cache.get("servers") !== undefined && (await compareArrays(servers, cache.get("servers")))) return;
    cache.set("servers", servers, 60*60)
    console.log(theme.debug(`Servers: ${JSON.stringify(servers)}`));
}

/**
 * Update the reachable servers list in cache
 * @param {any[]} servers List of servers to check
 * @return {Promise<void>}
 * @throws {Error} No server given
 * @throws {Error} No servers reachable
 */
async function updateReachableServersListInCache(servers: any[]): Promise<void> {
    if (servers.length === 0) throw new Error("No jobs given");
    const serversIps = servers.map((server: any) => server.ipAddr);
    const reachableServersIps = await Network.pingServers(serversIps);
    if (reachableServersIps.length === 0) throw new Error("No servers reachable");
    if (cache.get("reachableServersIps") !== undefined && (await compareArrays(reachableServersIps, cache.get("reachableServersIps")))) return;
    cache.set("reachableServersIps", reachableServersIps, 60*60)
    console.log(theme.debug(`Reachable servers: ${JSON.stringify(reachableServersIps)}`));
}

/**
 * Update the toDo list in cache
 * @param {string[]} reachableServersIps List of reachable servers
 * @param {any[]} jobs List of jobs
 * @return {Promise<void>}
 * @throws {Error} No reachable servers given
 * @throws {Error} No services can be tested
 */
async function updateTodoListInCache(reachableServersIps: string[], jobs: any[]): Promise<void> {
    if (reachableServersIps.length === 0) throw new Error("No reachable servers given");
    const reachableServers = await Database.getServersByIP(reachableServersIps);
    const toDo = await Database.getAllServersAndServicesIdsOfJobs(jobs);
    toDo.filter((server: any) => reachableServers.includes(server.id));
    if (toDo.length === 0) throw new Error("No services can be tested");
    if (cache.get("toDo") !== undefined && (await compareArrays(toDo, cache.get("toDo")))) return;
    cache.set("toDo", toDo, 60*60);
    console.log(theme.debug(`Tasks to execute: ${JSON.stringify(toDo)}`));
}