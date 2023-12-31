'use strict';

import {centralServer, config} from "../index";
import {Socket} from "socket.io-client";

const io= require('socket.io-client');

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
    return new Promise((resolve, reject): void => {
        const socket = require('socket.io-client')(`http://${ip}:${port}`,
            {
                reconnection: false,
                transports: ["polling"],
                allowEIO3: true, // false by default
            });
        socket.on('connect', (): void => {
            socket.emit("test_connection", "OK");
        });
        socket.on("test_connection_ack", async (message: string): Promise<void> => {
            console.log("Test connection ack: " + message);
            socket.disconnect();
            socket.close();
            resolve(true);
        });
        socket.on("error", (error: any): void => {
            console.log("Error: " + error);
            resolve(false);
            socket.disconnect();
            socket.close();
        });
        socket.on('connect_error', (): void => {
            resolve(false);
            socket.disconnect();
            socket.close()
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

/**
 * Init the node server socket to communicate with the central server
 * @param {string} ip The IP Address of the central server
 * @param {number} port The port of the central server
 * @throws {Error} If the port is null
 */
export function initNodeServerSocket (ip: string, port: number | null): Socket {
    if (port === null) throw new Error("Central server port is null");
    return io(`http://${centralServer.ipAddr}:${centralServer.port}`, {
        reconnection: true,
        cors: {
            origin: centralServer.ipAddr,
            methods: ['GET', 'POST']
        },
        withCredentials: true,
        transports: ["polling"],
        allowEIO3: true, // false by default
    });
}