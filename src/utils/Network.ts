'use strict';

const ip = require("ip");

/**
 * Get the local IP address of the machine
 * @returns {string} The local IP address of the machine
 */
export async function getLocalIP () : Promise<string> {
    return await ip.address();
}

/**
 * Ping an IP Address
 * @param {string} ip
 * @returns {Promise<boolean>} True if the IP Address is reachable, false otherwise
 * @throws {Error} If the ip is null or undefined
 */
export async function ping (ip: string) : Promise<boolean> {
    if (ip === undefined || ip === null) throw new Error("IP is null or undefined");
    const ping = require('ping');
    const res = await ping.promise.probe(ip);
    return res.alive;
}

/**
 * Function to extract ping information from ping output
 * @param {string} pingOutput The output of the ping command
 * @returns {string[]} Array that contains the number of packets sent, received and lost
 */
export function extractPingInfo (pingOutput: string) : string[] {
    const temp: string[] = pingOutput.trim().split("\n");
    return temp[temp.length - 2].split(",").map(part => part.trim());
}

/**
 * Ping all the IP Addresses in the list with an interval of 10 seconds between each ping and a timeout of 5 seconds
 * @param {string[]} ipList The list of IP Addresses to ping
 * @returns {Promise<string[]>} The list of reachable IP Addresses
 * @throws {Error} If the ipList is null or undefined
 */
export async function pingServers (ipList: string[]) : Promise<string[]> {
    if (ipList === undefined || ipList === null) throw new Error("IP List is null or undefined");
    const reachableIPList = [];
    for (const ip of ipList) {
        if (await ping(ip)) reachableIPList.push(ip);
    }
    return reachableIPList;
}