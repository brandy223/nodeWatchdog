
import {Servers} from "@prisma/client";

const Database = require('./Database');
const io= require('socket.io-client');
const theme = require('./ColorScheme').theme;

/**
 * Send JSON data to main server
 * @param {any} data The data to send
 * @returns {Promise<void>}
 * @throws {Error} If the data is null or undefined
 */
export async function sendDataToMainServer (data: any) : Promise<void> {
    if (data === undefined || data === null) throw new Error("Data is null or undefined");
    const centralServer: Servers = await Database.getCurrentCentralServer();

    const socket = io(`http://${centralServer.ipAddr}:${centralServer.port}`, {
        reconnection: true,
        cors: {
            origin: centralServer.ipAddr,
            methods: ['GET', 'POST']
        },
        withCredentials: true,
        transports: ["polling"],
        allowEIO3: true, // false by default
    });

    socket.on("error", function (): void {
        console.error(theme.error("Sorry, there seems to be an issue with the connection!"));
    });

    socket.on("connect_error", function (err: Error): void {
        console.error(theme.error("connection failed: " + err));
    });

    socket.on('connect', (): void => {
        socket.emit('message', data);
        socket.close();
    });
}