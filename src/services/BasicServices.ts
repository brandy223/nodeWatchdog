import {ChildProcessWithoutNullStreams} from "child_process";
import {Services} from "@prisma/client";

const { spawn } = require("node:child_process");

type Server = {
    ipAddr: string;
    user: string;
}

/**
 * Tell state of a service through systemctl
 * @param {Server} server Server object that contains the IP address and the user to connect to through SSH
 * @param {Services} service The service object
 * @return {Promise<string[]>} Contains the state of the service and the output of the command on "Active: " line
 * @throws {Error} If the data from ssh stdout is null or undefined
 */
export async function isServiceActive(server: Server, service: Services): Promise<string[]> {
    return new Promise<string[]>((resolve, reject): void => {
        const arg1: string = `${server.user}@${server.ipAddr}`;
        const arg2: string = `systemctl status ${service.name}.service`;
        const conn: ChildProcessWithoutNullStreams = spawn("ssh", [arg1, arg2]);

        const output: string[] = [];

        conn.stdout.on("data", (data: any): void => {
            const lines: string[] = data.toString().trim().split("\n");
            const searchedIndex: number = lines.findIndex((line: string): boolean => line.includes("Active: "));
            const line: string = lines[searchedIndex].split("Active:").map((s: string) => s.trim())[1];
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