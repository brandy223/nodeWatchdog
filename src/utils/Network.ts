'use strict';

import {config} from "../index";

/**
 * Get the local IP address of the machine
 * @returns {string} The local IP address of the machine
 */
export async function getLocalIP () : Promise<string> {
    const ip = require("ip");
    return await ip.address();
}

/**
 * Ping an IP Address
 * @param {string} ip
 * @returns {Promise<string[]>} True if the IP Address is reachable, false otherwise + ping info
 */
export async function ping (ip: string) : Promise<string[]> {
    const pingConfig = {
        timeout: config.ping.timeout,
        extra: config.ping.extra,
    }
    const ping = require('ping');
    const res = await ping.promise.probe(ip, pingConfig);
    const output: string[] = extractPingInfo(res.output);
    output.unshift(res.alive.toString());
    return output;
}

/**
 * Test connection with server socket
 * @param {string} ip
 * @param {number} port
 * @returns {Promise<boolean>} True if the connection is established, false otherwise
 */
export function testConnectionToSocket (ip: string, port: number) : Promise<boolean> {
    const socket = require('socket.io-client')(`http://${ip}:${port}`);
    return new Promise((resolve, reject): void => {
        socket.on('connect', (): void => {
            socket.emit("test_connection", "OK");
        });
        socket.on("test_connection_ack", (message: string): void => {
            console.log("Test connection ack: " + message);
            resolve(true);
            socket.disconnect();
        });
        socket.on('connect_error', (): void => {
            resolve(false);
            socket.disconnect();
        });
    });
}

/**
 * Function to extract ping information from ping output
 * @param {string} pingOutput The output of the ping command
 * @returns {string[]} Array that contains the number of packets sent, received and lost
 */
function extractPingInfo (pingOutput: string) : string[] {
    const temp: string[] = pingOutput.trim().split("\n");
    return temp[temp.length - 2].split(",").map((part: string) => part.trim());
}

/**
 * Ping all the IP Addresses in the list
 * @param {string[]} ipList The list of IP Addresses to ping
 * @returns {Promise<string[]>} The list of reachable IP Addresses
 */
export async function pingServers (ipList: string[]) : Promise<string[]> {
    const reachableIPList: string[] = [];
    for (const ip of ipList) {
        if ((await ping(ip))[0]) reachableIPList.push(ip);
    }
    return reachableIPList;
}