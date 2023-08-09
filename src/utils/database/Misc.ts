
import { Servers } from "@prisma/client";

const s = require("./Servers");
const Network = require("../Network");

import { theme } from "../ColorScheme";
import {config} from "../../index";

/**
 * Get the current central server
 * @returns {Promise<Servers>} The central server
 * @throws {Error} If the central server is not found in the database
 */
export async function getCurrentCentralServer(): Promise<Servers | null> {
    // GET CENTRAL SERVER IP
    const centralServer: Servers[] = await s.getServersByType("Central");
    if (centralServer.length === 0) throw new Error("Central server not found in database");
    const mainServer: Servers[] = centralServer.filter((server: Servers) => server.priority === 1);
    console.log(theme.info(`Central server IP: ${mainServer[0].ipAddr}`));

    // PING CENTRAL SERVER
    const isCentralServerAlive: string[] = await Network.ping(mainServer[0].ipAddr);
    if (isCentralServerAlive) {
        console.log(theme.success(`Central server is alive`));
        if (await Network.testConnectionToSocket(mainServer[0].ipAddr, Number(mainServer[0].port))) {
            console.log(theme.success(`Central server port is open`));
            return mainServer[0];
        }
        else {
            console.log(theme.warning(`Central server port is closed, trying to connect to backup server`));
        }
    }
    else console.log(theme.warning(`Central server is not alive, trying to connect to backup server`));

    const backupServer: Servers[] = centralServer.filter((server: Servers) => server.priority === 2)
    if (backupServer.length === 0) {
        console.log(theme.error(`Backup central server not found`));
        await new Promise(resolve => setTimeout(resolve, config.mainServer.connection_retry_interval));
        return getCurrentCentralServer();
    }
    const isBackupServerAlive: string[] = await Network.pingServers([backupServer[0].ipAddr]);
    if (!isBackupServerAlive) {
        console.log(theme.error(`Backup central server is not alive`));
        await new Promise(resolve => setTimeout(resolve, config.mainServer.connection_retry_interval));
        return getCurrentCentralServer();
    }
    console.log(theme.info(`Backup server: ${JSON.stringify(backupServer)}`));

    return backupServer[0];
}

/**
 * Initialize node server in database
 */
export async function nodeServerDatabaseInit(): Promise<string> {
    // GET LOCAL IP
    const ip: string = await Network.getLocalIP();
    console.log(theme.info(`Local IP: ${ip}`));

    // VERIFY NODE EXISTS IN DATABASE
    if (!await s.isServerInDatabase(ip)) {
        await s.addServerToDatabase(ip, "Node", null, null);
        console.log(`Added node server to database`);
    }
    else {
        if(!await s.isServerANode(ip)) {
            await s.updateServer(ip, "Node", null, null);
        }
    }
    return ip;
}