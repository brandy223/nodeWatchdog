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
 * @param ip
 * @returns {Promise<boolean>} True if the IP Address is reachable, false otherwise
 * @throws {Error} If the ip is null or undefined
 */
export async function ping (ip: string) : Promise<boolean> {
    if (ip === undefined || ip === null) throw new Error("IP is null or undefined");
    const ping = require('ping');
    const res = await ping.promise.probe(ip);
    return res.alive;
}