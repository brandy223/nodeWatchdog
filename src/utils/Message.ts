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
 * @param {string} ip The IP of the main server
 * @param {string} data The data to send
 * @returns {Promise<void>}
 * @throws {Error} If the IP is null or undefined
 * @throws {Error} If the data is null or undefined
 * @throws {Error} If the IP is not valid
 * @throws {Error} If the IP is not reachable
 */
export async function sendDataToMainServer (ip: string, data: string) : Promise<void> {

}