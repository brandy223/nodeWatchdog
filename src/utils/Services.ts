import {Jobs, Servers, Services, ServicesOfServers} from "@prisma/client";

const Database = require('./Database');
const Network = require('./Network');
const Message = require('./Message');
const BasicServices = require('../services/BasicServices');
const Template = require('../templates/DataTemplates');
const theme = require('./ColorScheme').theme;
const cache = require("../index").cache;

/**
 * Make an array that contains ping functions and store each reachable server in cache
 * @param {Servers[]} servers Array of servers
 * @return {Promise<any[]>} Array of ping functions
 */
export async function pingFunctionsInArray(servers: Servers[]): Promise<any[]> {
    const pingFunctions: (() => void)[] = [];
    for (const server of servers) {
        const ping = (ip: string): (() => void) => {
            return async (): Promise<void> => {
                let status: string = "KO";
                const ping: string[] = await Network.ping(ip);
                if (Boolean(ping.shift())) {
                    status = "OK";
                    const pingCache = cache.get("reachableServersIps");
                    if (pingCache === undefined)
                        cache.set("reachableServersIps", [ip], 60*60);
                    else {
                        pingCache.push(ip);
                        cache.set("reachableServersIps", pingCache, 60*60);
                    }
                }
                const res: JSON = await makeServerPingJSON(server, status, ping);
                await Message.sendDataToMainServer(res);
                console.log(theme.bgInfo("Message to be send to main server : "));
                console.log(res);
            }
        }
        const pingFunction = ping(server.ipAddr);
        pingFunctions.push(pingFunction);
    }
    return pingFunctions;
}

/**
 * Make an array that contains systemctl test functions for each service
 * @param {ServicesOfServers[]} jobs Array of services
 * @return {Promise<any[]>} Array of systemctl test functions
 */
export async function systemctlTestFunctionsInArray(jobs: ServicesOfServers[]): Promise<any[]> {
    const systemctlTestFunctions: (() => void)[] = [];
    for (const job of jobs) {
        const service = (job: ServicesOfServers): (() => void) => {
            return async (): Promise<void> => {
                const server: Servers[] = await Database.getServersByIds([job.serverId]);
                const service: Services[] = await Database.getServicesById([job.serviceId]);
                const jobObj: Jobs[] = await Database.getJobsByIds([job.jobId as number]);

                // TODO: replace variables below

                const status: string[] = await BasicServices.isServiceActive({
                    user: process.env.SSH_USER,
                    ipAddr: server[0].ipAddr,
                }, {
                    name: service[0].name,
                });
                const res: JSON = await makeServiceTestJSON(service[0], server[0], jobObj[0], status);
                await Message.sendDataToMainServer(res);
                console.log(theme.bgInfo("Message to be send to main server : "));
                console.log(res);
            }
        }
        const sysCtlFunction = service(job);
        systemctlTestFunctions.push(sysCtlFunction);
    }
    return systemctlTestFunctions;
}

/**
 * Make a JSON object that contains the id of the server, its IP address and its status
 * @param {Servers} server The server object
 * @param {string} status The status of the server
 * @param {string[]} pingInfo Information about the ping
 * @returns {JSON} The JSON object
 * @throws {Error} If the pingInfo is empty
 */
export function makeServerPingJSON (server: Servers, status: string, pingInfo: string[]): JSON {
    if (pingInfo.length === 0) throw new Error("Ping info is empty");
    return new Template.PingTemplate(server.id, server.ipAddr, status, pingInfo).toJSON();
}

/**
 * Make a JSON object that contains the id of the service, the server IP hosted on and its status
 * @param {Services} service The service object
 * @param {Servers} server The server object
 * @param {Jobs} job The job object
 * @param {string[]} status The status of the service
 * @returns {JSON} The JSON object
 * @throws {Error} If the status is empty
 */
export function makeServiceTestJSON (service: Services, server: Servers, job: Jobs, status: string[]): JSON {
    if (status.length === 0) throw new Error("Status is empty");
    return new Template.ServiceTestTemplate(service.id, service.name, server.id, server.ipAddr, job.id, status).toJSON();
}