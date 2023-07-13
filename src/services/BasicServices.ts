import { promisify } from "util";

const { spawn } = require("node:child_process");

const theme = require("../utils/ColorScheme").theme;

/**
 * Tell state of a service through systemctl
 * @param {any} server Server object that contains the IP address and the user to connect to through SSH
 * @param {any} service The service object
 * @return {Promise<string[]>} Contains the state of the service and the output of the command on "Active: " line
 * @throws {Error} If the server is null or undefined
 * @throws {Error} If the service is null or undefined
 * @throws {Error} If the data from ssh stdout is null or undefined
 */
export async function isServiceActive(server: any, service: any): Promise<string[]> {
    if (server === undefined || server === null) throw new Error("Server is null or undefined");
    if (service === undefined || service === null) throw new Error("Service is null or undefined");

    return new Promise<string[]>((resolve, reject): void => {
        const arg1 = `${server.user}@${server.ipAddr}`;
        const arg2 = `systemctl status ${service.name}.service`;
        const conn = spawn("ssh", [arg1, arg2]);

        const output: string[] = [];

        conn.stdout.on("data", (data: any): void => {
            const line: string = data.toString().trim().split("\n")[2].split("Active:").map((s: string) => s.trim())[1];
            if (line.includes("active")) output.push("true");
            else if (line.includes("inactive")) output.push("false");
            else output.push("unknown");
            output.push(line);
        });

        conn.stderr.on("data", (err: any): void => {
            reject(new Error(err.toString()));
        });

        conn.on("close", (code: number): void => {
            if (code === 0) {
                resolve(output);
            } else {
                reject(new Error(`Process (from isServiceActive()) exited with code ${code}`));
            }
        });
    });
}