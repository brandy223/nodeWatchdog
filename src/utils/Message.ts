
import {PingTemplate, ServiceTestTemplate} from "../templates/DataTemplates";
import { centralServer } from "../index";

// DATABASE
const dbMisc = require('./database/Misc');

const io= require('socket.io-client');
const theme = require('./ColorScheme').theme;

/**
 * Send JSON data to main server
 * @param {PingTemplate | ServiceTestTemplate} data The data to send
 * @returns {Promise<void>}
 */
export async function sendDataToMainServer (data: PingTemplate | ServiceTestTemplate) : Promise<void> {
    const socket = io(`http://${centralServer.ipAddr}:${centralServer.port}`, {
        reconnection: false,
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
        socket.disconnect();
        socket.close();
    });
}