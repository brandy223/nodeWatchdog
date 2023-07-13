
const Network = require('./Network');
const Message = require('./Message');
const BasicServices = require('../services/BasicServices');
const theme = require('./ColorScheme').theme;

/**
 * Make an array that contains ping functions
 * @param {any[]} servers Array of servers
 * @return {Promise<any[]>} Array of ping functions
 */
export async function pingFunctionsInArray(servers: any[]): Promise<any[]> {
    const pingFunctions: (() => void)[] = [];
    for (const server of servers) {
        const ping = (ip: string): (() => void) => {
            return async () => {
                let status: string = "OK";
                const ping = await Network.ping(ip);
                if (!Boolean(ping.shift())) status = "KO";
                const res = await Message.makeServerPingJSON(server, status, ping);
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
                const res = await Message.makeServiceTestJSON({
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