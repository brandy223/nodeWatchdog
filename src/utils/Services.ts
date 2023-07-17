
const Network = require('./Network');
const Message = require('./Message');
const BasicServices = require('../services/BasicServices');
const Template = require('../templates/DataTemplates');
const theme = require('./ColorScheme').theme;
const cache = require("../index").cache;

/**
 * Make an array that contains ping functions and store each reachable server in cache
 * @param {any[]} servers Array of servers
 * @return {Promise<any[]>} Array of ping functions
 */
export async function pingFunctionsInArray(servers: any[]): Promise<any[]> {
    const pingFunctions: (() => void)[] = [];
    for (const server of servers) {
        const ping = (ip: string): (() => void) => {
            return async () => {
                let status: string = "KO";
                const ping = await Network.ping(ip);
                if (Boolean(ping.shift())) {
                    status = "OK";
                    const pingCache = cache.get("reachableServers");
                    if (pingCache === undefined)
                        cache.set("reachableServers", [ip], 60*60);
                    else {
                        pingCache.push(ip);
                        cache.set("reachableServers", pingCache, 60*60);
                    }
                }
                const res = await makeServerPingJSON(server, status, ping);
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
 * @param {any[]} services Array of services
 * @return {Promise<any[]>} Array of systemctl test functions
 */
export async function systemctlTestFunctionsInArray(services: any[]): Promise<any[]> {
    const systemctlTestFunctions: (() => void)[] = [];
    for (const s of services) {
        const service = (obj: any): (() => void) => {
            return async () => {
                const status = await BasicServices.isServiceActive({
                    user: obj.server.user,
                    ipAddr: obj.server.ipAddr,
                }, {
                    name: obj.service.name,
                });
                const res = await makeServiceTestJSON({
                    id: obj.service.id,
                    name: obj.service.name,
                }, {
                    id: obj.server.id,
                    ipAddr: obj.server.ipAddr,
                }, status);
                await Message.sendDataToMainServer(res);
                console.log(theme.bgInfo("Message to be send to main server : "));
                console.log(res);
            }
        }
        const sysCtlFunction = service(s);
        systemctlTestFunctions.push(sysCtlFunction);
    }
    return systemctlTestFunctions;
}

/**
 * Make a JSON object that contains the id of the server, its IP address and its status
 * @param {any} server The server object
 * @param {string} status The status of the server
 * @param {string[]} pingInfo Information about the ping
 * @returns {any} The JSON object
 * @throws {Error} If the server is null or undefined
 * @throws {Error} If the server does not have an id
 * @throws {Error} If the server does not have an ipAddr
 * @throws {Error} If the pingInfo is empty
 */
export function makeServerPingJSON (server: any, status: string, pingInfo: string[]) : any {
    if (server === undefined || server === null) throw new Error("Server is null or undefined");
    if (server.id === undefined || server.id === null) throw new Error("Server does not have an id");
    if (server.ipAddr === undefined || server.ipAddr === null) throw new Error("Server does not have an ipAddr");
    if (pingInfo.length === 0) throw new Error("Ping info is empty");
    return new Template.PingTemplate(server.id, server.ipAddr, status, pingInfo).toJSON();
}

/**
 * Make a JSON object that contains the id of the service, the server IP hosted on and its status
 * @param {any} service The service object
 * @param {any} server The server object
 * @param {string[]} status The status of the service
 * @returns {any} The JSON object
 * @throws {Error} If the service is null or undefined
 * @throws {Error} If the service does not have an id
 * @throws {Error} If the server is null or undefined
 * @throws {Error} If the server does not have an id
 * @throws {Error} If the server does not have an ipAddr
 */
export function makeServiceTestJSON (service: any, server: any, status: string) : any {
    if (service === undefined || service === null) throw new Error("Service is null or undefined");
    if (service.id === undefined || service.id === null) throw new Error("Service does not have an id");
    if (server === undefined || server === null) throw new Error("Server is null or undefined");
    if (server.id === undefined || server.id === null) throw new Error("Server does not have an id");
    if (server.ipAddr === undefined || server.ipAddr === null) throw new Error("Server does not have an ipAddr");

    return new Template.ServiceTestTemplate(service.id, service.name, server.id, server.ipAddr, status).toJSON();
}