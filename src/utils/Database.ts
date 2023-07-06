
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Check if a server exists in the database
 * @param ip
 * @returns {Promise<boolean>} True if the server exists in the database, false otherwise
 */
export async function isServerInDatabase (ip: string) : Promise<boolean> {
    const server = await prisma.servers.findUnique({ where: { ipAddr: ip } });
    return server !== undefined && server !== null;
}

/**
 * Check if a server is a node
 * @param ip
 * @returns {Promise<boolean>} True if the server is a node, false otherwise
 */
export async function isServerANode (ip: string) : Promise<boolean> {
    const server = await prisma.servers.findUnique({ where: { ipAddr: ip } });
    return server !== undefined && server !== null && server.type === "NODE";
}

/**
 * Add a server to the database
 * @param ip
 */
export async function addServerToDatabase (ip: string) : Promise<void> {
    await prisma.servers.create({
        data: {
            ipAddr: ip,
            type: "NODE"
        }
    });
}

/**
 * Update server's type
 * @param ip
 * @param type
 */
export async function updateServerType (ip: string, type: string) : Promise<void> {
    await prisma.servers.update({
        where: { ipAddr: ip },
        data: { type: type }
    });
}