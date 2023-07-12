
const { spawn } = require("node:child_process");

/**
 * Tell state of a service through systemctl
 * @param {any} server Server object that contains the IP address and the user to connect to through SSH
 * @param {any} service The service object
 * @return {Promise<boolean>} True if the service is active, false otherwise
 * @throws {Error} If the server is null or undefined
 * @throws {Error} If the service is null or undefined
 * @throws {Error} If the data from ssh stdout is null or undefined
 */
export async function isServiceActive (server: any, service: any) : Promise<boolean> {
    if (server === undefined || server === null) throw new Error("Server is null or undefined");
    if (service === undefined || service === null) throw new Error("Service is null or undefined");
    let isActive: boolean = false;

    const arg1 = `${server.user}@${server.ipAddr}`;
    const arg2 = `systemctl is-active ${service.name}.service`;
    const conn = spawn("ssh", [arg1, arg2]);
    conn.stdout.on("data", (data: any): void => {
        if (data === undefined || data === null) throw new Error("Data is null or undefined");
        if(data.toString().trim() === "active")
            isActive = true;
    });
    return isActive;
}