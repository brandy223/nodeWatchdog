
import {Jobs, Servers, ServicesOfServers} from "@prisma/client";
import {clearAllIntervals} from "./utils/Timer";

// DATABASE
const s = require('./utils/database/Servers');
const j = require('./utils/database/Jobs');
const dbMisc = require('./utils/database/Misc');

const dotenv = require('dotenv');
dotenv.config();
export const config = require("../config.json").config;

const io= require('socket.io-client');
const NodeCache = require("node-cache");
export const cache = new NodeCache({
    stdTTL: config.cache.default_ttl,
    checkperiod: config.cache.check_period,
    deleteOnExpire: config.cache.deleteOnExpire,
});
const Network = require('./utils/Network');
const Timer = require('./utils/Timer');
const Services = require('./utils/Services');
const compareArrays = require('./utils/utilities/Arrays').compareArrays;
const theme = require('./utils/ColorScheme').theme;

export let centralServer: Servers;

/**
 * Main function
 */
async function main (): Promise<void> {
    const ip: string = await dbMisc.nodeServerDatabaseInit();
    centralServer = await dbMisc.getCurrentCentralServer();

    // TODO: NEED TO SEND SOMETHING WHEN NO CENTRAL SERVER BEFORE CRASH OF NODE APP
    // ? Remove Error throw and stand by ?
    // ? Send a message to something else ? (Trigger website for example, like a route)

    let failedConnectionAttempts: number = 0;

    let pingWrapper: any[];
    let pingTasks: any[]
    let servicesWrapper: any[];
    let servicesTasks: any[];

    // setInterval((): void => {
    //     if (failedConnectionAttempts < config.mainServer.max_failed_connections_attempts) return;
    //     (dbMisc.getCurrentCentralServer()).then((newCentralServer: Servers): void => {
    //         if (centralServer === newCentralServer) {
    //             console.log(theme.warningBright("No new central server detected, retrying..."));
    //             return;
    //         }
    //         console.log(theme.warningBright("New central server detected: " + JSON.stringify(newCentralServer)));
    //         centralServer = newCentralServer;
    //         failedConnectionAttempts = 0;
    //     });
    // }, config.mainServer.check_period);

    await updateJobsListInCache(ip);
    let jobs: Jobs[] = cache.get("jobs");
    await updateServersListInCache(jobs);
    let servers: Servers[] = cache.get("servers");
    await updateReachableServersListInCache(servers);
    let reachableServersIps: string[] = cache.get("reachableServersIps");
    await updateTodoListInCache(reachableServersIps, jobs);
    let toDo: ServicesOfServers[] = cache.get("toDo");

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

    // PING SERVERS TO SEND TO CENTRAL SERVER
    pingWrapper = await Services.pingFunctionsInArray(servers);
    pingTasks = await Timer.executeTimedTask(pingWrapper, [config.servers.check_period]);

    // TEST SERVICES
    servicesWrapper = await Services.systemctlTestFunctionsInArray(toDo)
    servicesTasks = await Timer.executeTimedTask(servicesWrapper, [config.services.check_period]);

    mainSocket.on("error", async (): Promise<void> => {
        await Timer.clearAllIntervals(pingTasks);
        await Timer.clearAllIntervals(servicesTasks);
        console.error(theme.error("Sorry, there seems to be an issue with the connection!"));
        failedConnectionAttempts++;
    });

    mainSocket.on("connect_error", async (err: Error): Promise<void> => {
        await Timer.clearAllIntervals(pingTasks);
        await Timer.clearAllIntervals(servicesTasks);
        console.error(theme.error("connection failed: " + err));
        failedConnectionAttempts++;
    });

    mainSocket.on('connect', async (): Promise<void> => {
        mainSocket.emit('main_connection', ip);
        failedConnectionAttempts = 0;
    });

    mainSocket.on("main_connection_ack", (message: string): void => {
        console.log(theme.bgSuccess("Central Server Main Connection ACK: " + message));
    });

    mainSocket.on("room_broadcast", (message: any): void => {
        console.log(theme.bgWarning("Central Server's broadcast :"));
        console.log(message);
    });

        //* CACHE EVENTS

    cache.on("del", async (key: string): Promise<void> => {
        switch (key) {
            case "jobs":
                await clearAllIntervals(pingTasks);
                await clearAllIntervals(servicesTasks);
                await updateJobsListInCache(ip);
                await updateServersListInCache(cache.get("jobs") ?? []);
                await updateReachableServersListInCache(cache.get("servers") ?? []);
                await updateTodoListInCache(cache.get("reachableServersIps" ?? []), cache.get("jobs") ?? []);
                pingWrapper = await Services.pingFunctionsInArray(cache.get("servers") ?? []);
                if (pingWrapper[0] !== -1) pingTasks = await Timer.executeTimedTask(pingWrapper, [config.servers.check_period]);
                servicesWrapper = await Services.systemctlTestFunctionsInArray(cache.get("toDo") ?? []);
                if (servicesWrapper[0] !== -1) servicesTasks = await Timer.executeTimedTask(servicesWrapper, [config.services.check_period])
                break;
            case "servers":
                await clearAllIntervals(pingTasks);
                await clearAllIntervals(servicesTasks);
                await updateServersListInCache(cache.get("jobs") ?? []);
                await updateReachableServersListInCache(cache.get("servers") ?? []);
                await updateTodoListInCache(cache.get("reachableServersIps" ?? []), cache.get("jobs") ?? []);
                pingWrapper = await Services.pingFunctionsInArray(cache.get("servers") ?? []);
                if (pingWrapper[0] !== -1) pingTasks = await Timer.executeTimedTask(pingWrapper, [config.servers.check_period]);
                servicesWrapper = await Services.systemctlTestFunctionsInArray(cache.get("toDo") ?? []);
                if (servicesWrapper[0] !== -1) servicesTasks = await Timer.executeTimedTask(servicesWrapper, [config.services.check_period])
                break;
            case "reachableServersIps":
                await clearAllIntervals(servicesTasks);
                await updateReachableServersListInCache(cache.get("servers") ?? []);
                await updateTodoListInCache(cache.get("reachableServersIps" ?? []), cache.get("jobs") ?? []);
                servicesWrapper = await Services.systemctlTestFunctionsInArray(cache.get("toDo") ?? []);
                if (servicesWrapper[0] !== -1) servicesTasks = await Timer.executeTimedTask(servicesWrapper, [config.services.check_period])
                break;
            case "toDo":
                await clearAllIntervals(servicesTasks);
                await updateTodoListInCache(cache.get("reachableServersIps" ?? []), cache.get("jobs") ?? []);
                servicesWrapper = await Services.systemctlTestFunctionsInArray(cache.get("toDo") ?? []);
                if (servicesWrapper[0] !== -1) servicesTasks = await Timer.executeTimedTask(servicesWrapper, [config.services.check_period])
                break;
        }
    });
}

main();

/**
 * Update the jobs list in cache
 * @param {string} ip IP of the server
 * @return {Promise<void>}
 */
async function updateJobsListInCache(ip: string): Promise<void> {
    const jobs: Jobs[] = await j.getAllJobsOfNode(ip);
    if (cache.get("jobs") !== undefined && (await compareArrays(jobs, cache.get("jobs")))) return;
    cache.set("jobs", jobs, config.jobs.cache_duration)
    console.log(theme.debug(`Jobs updated in cache`));
}

/**
 * Update the servers list in cache
 * @param {Jobs[]} jobs List of jobs
 * @return {Promise<void>}
 */
async function updateServersListInCache(jobs: Jobs[]): Promise<void> {
    if (jobs.length === 0) return;
    const servers: Servers[] = await s.getServersOfJobs(jobs);
    if (cache.get("servers") !== undefined && (await compareArrays(servers, cache.get("servers")))) return;
    cache.set("servers", servers, config.servers.cache_duration);
    console.log(theme.debug(`Servers updated in cache`));
}

/**
 * Update the reachable servers list in cache
 * @param {Servers[]} servers List of servers to check
 * @return {Promise<void>}
 */
async function updateReachableServersListInCache(servers: Servers[]): Promise<void> {
    if (servers.length === 0) return;
    const serversIps: string[] = servers.map((server: any) => server.ipAddr);
    const reachableServersIps: string[] = await Network.pingServers(serversIps);
    if (cache.get("reachableServersIps") !== undefined && (await compareArrays(reachableServersIps, cache.get("reachableServersIps")))) return;
    cache.set("reachableServersIps", reachableServersIps, config.servers.cache_duration);
    console.log(theme.debug(`Reachable servers updated in cache`));
}

/**
 * Update the toDo list in cache
 * @param {string[]} reachableServersIps List of reachable servers
 * @param {Jobs[]} jobs List of jobs
 * @return {Promise<void>}
 */
async function updateTodoListInCache(reachableServersIps: string[], jobs: Jobs[]): Promise<void> {
    if (reachableServersIps.length === 0 || jobs.length === 0) return;
    const reachableServers: Servers[] = await s.getServersByIP(reachableServersIps);
    const toDo: ServicesOfServers[] = await s.getAllServersAndServicesIdsOfJobs(jobs);
    const filteredToDo: ServicesOfServers[] = toDo.filter(async (server: ServicesOfServers) => reachableServers.includes((await s.getServersByIds([server.serverId])).id));
    if (cache.get("toDo") !== undefined && (await compareArrays(filteredToDo, cache.get("toDo")))) return;
    cache.set("toDo", filteredToDo, config.services.cache_duration);
    console.log(theme.debug(`Todo list updated in cache`));
}