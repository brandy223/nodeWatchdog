
import {Jobs, Servers, ServicesOfServers} from "@prisma/client";
import {clearAllIntervals} from "./utils/Timer";
import {Socket} from "socket.io-client";
import {clearInterval} from "timers";
import {initNodeServerSocket} from "./utils/Network";

// DATABASE
const s = require('./utils/database/Servers');
const j = require('./utils/database/Jobs');
const dbMisc = require('./utils/database/Misc');

const Network = require('./utils/Network');
const Timer = require('./utils/Timer');
const Services = require('./utils/Services');
const compareArrays = require('./utils/utilities/Arrays').compareArrays;
const theme = require('./utils/ColorScheme').theme;

const dotenv = require('dotenv');
dotenv.config();
export const config = require("../config.json").config;

const NodeCache = require("node-cache");
export const cache = new NodeCache({
    stdTTL: config.cache.default_ttl,
    checkperiod: config.cache.check_period,
    deleteOnExpire: config.cache.deleteOnExpire,
});


export let centralServer: Servers;
let mainSocket: Socket;
let centralServerWatchdog: any;

let connectionFlag: boolean = false;
let cacheFlushCounter: number = 0;
let failedConnectionAttempts: number = 0;

let pingWrapper: any[];
let servicesWrapper: any[];
let pingTasks: any[];
let servicesTasks: any[];

/**
 * Main function
 */
async function main (): Promise<void> {
    const ip: string = await dbMisc.nodeServerDatabaseInit();
    centralServer = await dbMisc.getCurrentCentralServer();
    mainSocket = initNodeServerSocket(centralServer.ipAddr, centralServer.port);
    connectionFlag = true;

    // ? Send a message to something else ? (Trigger website for example, like a route)

        //* Watchdog for central server connection
     centralServerWatchdog = mainServerWatchdog(ip);

        //* Add event listeners to main socket
    addEventsToNodeSocket(ip);

        //* CACHE EVENTS
    cache.on("flush", (): void => {
        if (cacheFlushCounter === 1) {
            console.log(theme.bgWarning("Cache has been flushed!"));
        }
    });

    cache.on("del", async (key: string): Promise<void> => {
        if (!connectionFlag) return;
        switch (key) {

            // ? Instead of updating all these values, why not simply watch jobs cache value only to simply update all the values each time ??

            case "jobs":
                clearAllIntervals(pingTasks);
                clearAllIntervals(servicesTasks);
                cache.flushAll();
                cacheFlushCounter++;
                await initCacheValues(ip);
                cacheFlushCounter = 0;
                await updateAllTasks();
                break;
            case "servers":
                clearAllIntervals(pingTasks);
                clearAllIntervals(servicesTasks);
                await updateServersListInCache(cache.get("jobs") ?? []);
                await updateReachableServersListInCache(cache.get("servers") ?? []);
                await updateTodoListInCache(cache.get("reachableServersIps") ?? [], cache.get("jobs") ?? []);
                await updateAllTasks();
                break;
            case "reachableServersIps":
                clearAllIntervals(servicesTasks);
                await updateReachableServersListInCache(cache.get("servers") ?? []);
                await updateTodoListInCache(cache.get("reachableServersIps") ?? [], cache.get("jobs") ?? []);
                servicesWrapper = await Services.systemctlTestFunctionsInArray(cache.get("toDo") ?? []);
                if (servicesWrapper[0] !== -1) servicesTasks = await Timer.executeTimedTask(servicesWrapper, [config.services.check_period]);
                break;
            case "toDo":
                clearAllIntervals(servicesTasks);
                await updateTodoListInCache(cache.get("reachableServersIps") ?? [], cache.get("jobs") ?? []);
                servicesWrapper = await Services.systemctlTestFunctionsInArray(cache.get("toDo") ?? []);
                if (servicesWrapper[0] !== -1) servicesTasks = await Timer.executeTimedTask(servicesWrapper, [config.services.check_period]);
                break;
        }
    });
}

main().then(() => {
    console.log(theme.bgSuccess("Everything is up and running!"));
});

/**
 * Init the values that will be used in the cache
 * @param {string} ip IP of the node server
 * @return {Promise<void>}
 */
async function initCacheValues(ip: string): Promise<void> {
    await updateJobsListInCache(ip);
    await updateServersListInCache(cache.get("jobs") ?? []);
    await updateReachableServersListInCache(cache.get("servers") ?? []);
    await updateTodoListInCache(cache.get("reachableServersIps") ?? [], cache.get("jobs") ?? []);
}

/**
 * Update the jobs list in cache
 * @param {string} ip IP of the server
 * @return {Promise<void>}
 */
async function updateJobsListInCache(ip: string): Promise<void> {
    const jobs: Jobs[] = await j.getAllJobsOfNode(ip);
    if (cache.get("jobs") !== undefined && (await compareArrays(jobs, cache.get("jobs")))) return;
    cache.set("jobs", jobs, config.jobs.cache_duration);
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
 * Update the to-do list in cache
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

/**
 * Update tasks to run
 * @return {Promise<void>}
 */
async function updateAllTasks(): Promise<void> {
    pingWrapper = await Services.pingFunctionsInArray(cache.get("servers") ?? []);
    if (pingWrapper[0] !== -1) pingTasks = await Timer.executeTimedTask(pingWrapper, [config.servers.check_period]);
    servicesWrapper = await Services.systemctlTestFunctionsInArray(cache.get("toDo") ?? []);
    if (servicesWrapper[0] !== -1) servicesTasks = await Timer.executeTimedTask(servicesWrapper, [config.services.check_period]);
}

/**
 * Main server connection watchdog
 * @param {string} localIp IP of the node server
 * @return {NodeJS.Timer} setInterval function of the watchdog
 */
function mainServerWatchdog(localIp: string): NodeJS.Timer {
    return setInterval((): void => {
        if (failedConnectionAttempts < config.mainServer.max_failed_connections_attempts) return;
        mainSocket.close();
        clearAllIntervals(pingTasks);
        clearAllIntervals(servicesTasks);
        connectionFlag = false;
        cache.flushAll();
        cacheFlushCounter++;
        clearInterval(centralServerWatchdog);
        console.log(theme.errorBright("Max failed connection attempts reached, cleared all intervals, retrying..."));
        (dbMisc.getCurrentCentralServer()).then( async (newCentralServer: Servers): Promise<void> => {
            if (centralServer.ipAddr !== newCentralServer.ipAddr) {
                console.log(theme.warningBright("New central server detected: " + newCentralServer.ipAddr));
                centralServer = newCentralServer;
            } else console.log(theme.warningBright("No new central server detected"));

            mainSocket = initNodeServerSocket(centralServer.ipAddr, centralServer.port);
            addEventsToNodeSocket(localIp);

            failedConnectionAttempts = 0;
            connectionFlag = true;
            await initCacheValues(localIp);
            cacheFlushCounter = 0;
            await updateAllTasks();
            centralServerWatchdog = mainServerWatchdog(localIp);
        });
    }, config.mainServer.check_period);
}

/**
 * Init the node server socket to communicate with the central server
 * @param {string} ip IP of the node server
 */
function addEventsToNodeSocket(ip: string): void {
    mainSocket.on('connect', async (): Promise<void> => {
        mainSocket.emit('main_connection', ip);
        await initCacheValues(ip);
        cacheFlushCounter = 0;
        await updateAllTasks();
        failedConnectionAttempts = 0;
    });

    mainSocket.on("main_connection_ack", (message: string): void => {
        console.log(theme.bgSuccess("Central Server Main Connection ACK: " + message));
    });

    mainSocket.on("room_broadcast", (message: any): void => {
        console.log(theme.bgWarning("Central Server's broadcast :"));
        console.log(message);
    });

    mainSocket.on("error", async (): Promise<void> => {
        await Timer.clearAllIntervals(pingTasks);
        await Timer.clearAllIntervals(servicesTasks);
        cache.flushAll();
        cacheFlushCounter++;
        console.error(theme.error("Sorry, there seems to be an issue with the connection!"));
        failedConnectionAttempts++;
    });

    mainSocket.on("connect_error", async (err: Error): Promise<void> => {
        await Timer.clearAllIntervals(pingTasks);
        await Timer.clearAllIntervals(servicesTasks);
        cache.flushAll();
        cacheFlushCounter++;
        console.error(theme.error("connection failed: " + err));
        failedConnectionAttempts++;
    });
}