
const Network = require('./Network');
const Message = require('./Message');

/**
 * Make an array that contains ping functions
 * @param servers Array of servers
 * @return {Promise<any[]>} Array of ping functions
 */
export async function pingFunctionsInArray(servers: any[]): Promise<any[]> {
    const pingFunctions: (() => void)[] = [];
    for (const server of servers) {
        const ping = (ip: string): (() => void) => {
            return async () => {
                let status: string = "OK";
                const ping = await Network.ping(ip);
                console.log(`Ping ${ip}: ${ping}`);
                if (!ping) status = "KO";
                const res = await Message.makeServerJSON(server, status);
                await Message.sendDataToMainServer(res);
                console.log(res);
            }
        }
        const pingFunction = ping(server.ipAddr);
        pingFunctions.push(pingFunction);
    }
    return pingFunctions;
}