
import {stringify} from "querystring";

const Database = require('./Database');
const io= require('socket.io-client');
const theme = require('./ColorScheme').theme;

/**
 * Verify if someone is free to receive a message
 * @param {number} id The id of the person
 * @returns {Promise<boolean>} True if the person is free, false otherwise
 * @throws {Error} If the id is null or undefined
 * @throws {Error} If the person is not in the database
 */
export async function isPersonFree (id: number) : Promise<boolean> {
    return false;
}

/**
 * Send a message to someone
 * @param {string} number The number to send the message to
 * @param {string} message The message to send
 * @returns {Promise<void>}
 * @throws {Error} If the number is null or undefined
 * @throws {Error} If the message is null or undefined
 * @throws {Error} If the number is not valid
 * @throws {Error} If the number is not reachable
 */
export async function sendMessage (number: string, message: string) : Promise<void> {

}

/**
 * Email someone
 * @param {string} email The email to send the message to
 * @param {string} message The message to send
 * @returns {Promise<void>}
 * @throws {Error} If the email is null or undefined
 * @throws {Error} If the message is null or undefined
 * @throws {Error} If the email is not valid
 * @throws {Error} If the email is not reachable
 */
export async function sendEmail (email: string, message: string) : Promise<void> {

}

/**
 * Send JSON data to main server
 * @param {any} data The data to send
 * @returns {Promise<void>}
 * @throws {Error} If the data is null or undefined
 */
export async function sendDataToMainServer (data: any) : Promise<void> {
    if (data === undefined || data === null) throw new Error("Data is null or undefined");
    const centralServer = await Database.getCurrentCentralServer();

    const socket = io(`http://${centralServer.ipAddr}:${centralServer.port}`, {
        reconnection: true,
        cors: {
            origin: stringify(centralServer.ipAddr),
            methods: ['GET', 'POST']
        },
        withCredentials: true,
        transports: ["polling"],
        allowEIO3: true, // false by default
    });

    socket.on("error", function () {
        console.error(theme.error("Sorry, there seems to be an issue with the connection!"));
    });

    socket.on("connect_error", function (err: Error) {
        console.error(theme.error("connection failed: " + err));
    });

    socket.on('connect', () => {
        socket.emit('message', data);
        socket.close();
    });
}