
import { Servers, ServicesOfServers, Jobs } from "@prisma/client";

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(
    {
        // log: ["query", "info", "warn", "error"],
    },
);

/**
 * Check if a server exists in the database
 * @param {string} ip The ip of the server
 * @returns {Promise<boolean>} True if the server exists in the database, false otherwise
 */
export async function isServerInDatabase (ip: string) : Promise<boolean> {
    return (await prisma.servers.findUnique({ where: { ipAddr: ip } })) !== null;
}

/**
 * Check if a server is a node
 * @param {string} ip The ip of the server
 * @returns {Promise<boolean>} True if the server is a node, false otherwise
 */
export async function isServerANode (ip: string) : Promise<boolean> {
    return (await getServersByIP([ip]))[0].type === "Node";
}

/**
 * Get servers by ids
 * @param {number[]} ids Array ids of servers
 * @returns {Promise<Servers[]>} The servers
 * @throws {Error} If the ids array is empty
 */
export async function getServersByIds (ids: number[]) : Promise<Servers[]> {
    if (ids.length === 0) throw new Error("Ids array is empty");
    return prisma.servers.findMany({where: {id: {in: ids}}});
}

/**
 * Get servers by ips
 * @param {string[]} ips Array ips of servers
 * @returns {Promise<Servers[]>} The servers
 * @throws {Error} If the ips array is empty
 */
export async function getServersByIP (ips: string[]) : Promise<Servers[]> {
    if (ips.length === 0) throw new Error("IPs array is empty");
    return prisma.servers.findMany({where: {ipAddr: {in: ips}}});
}

/**
 * Get servers by type
 * @param {string} type The type of the server (Central or Node)
 * @returns {Promise<Servers[]>} Array of node servers
 */
export async function getServersByType (type: string) : Promise<Servers[]> {
    return prisma.servers.findMany({where: {type: type}});
}

/**
 * Add a server to the database
 * @param {string} ip The ip of the server
 * @param {string} type The type of the server (CENTRAL or NODE)
 * @param {number | null} port The port of the server (null if it's a node)
 * @param {number | null} priority The priority of the server (null if it's a node,
 * 1 if it's the central server,0 if it's the backup central server)
 * @returns {Promise<void>}
 * @throws {Error} If the server is already in the database
 */
export async function addServerToDatabase (ip: string, type: string, port: number | null, priority: number | null) : Promise<void> {
    if (await isServerInDatabase(ip)) throw new Error("Server is already in database");
    await prisma.servers.create({
        data: {
            ipAddr: ip,
            type: type,
            port: port,
            priority: priority
        }
    });
}

/**
 * Update server's info
 * @param {string} ip The ip of the server
 * @param {string} type The type of the server (CENTRAL or NODE)
 * @param {number | null} port The port of the server (null if it's a node)
 * @param {number | null} priority The priority of the server (null if it's a node)
 * @returns {Promise<void>}
 * @throws {Error} If the server is not in the database
 */
export async function updateServer (ip: string, type: string, port: number | null, priority: number | null) : Promise<void> {
    if (!await isServerInDatabase(ip)) throw new Error("Server is not in database");
    await prisma.servers.update({
        where: { ipAddr: ip },
        data: {
            type: type,
            port: port,
            priority: priority
        }
    });
}

/**
 * Get servers from jobs
 * @param {Jobs[]} jobs An array of jobs
 * @returns {Promise<*>} An array of servers
 * @throws {Error} If the jobs array is empty
 */
export async function getServersOfJobs (jobs: Jobs[]) : Promise<Servers[]> {
    if (jobs.length === 0) throw new Error("Jobs array is empty");
    const jobsIds: number[] = jobs.map((job: Jobs) => job.id);
    const serverIds: number[] = (await prisma.servicesOfServers.findMany({ where: { jobId: {in: jobsIds} } })).map((server: ServicesOfServers) => server.serverId);
    return getServersByIds(serverIds);
}

/**
 * Get all servers and its services from jobs
 * @param {Jobs[]} jobs[] An array of jobs
 * @returns {Promise<ServicesOfServers[]>} An array of servers and its services
 * @throws {Error} If the jobs array is empty
 */
export async function getAllServersAndServicesIdsOfJobs (jobs: Jobs[]) : Promise<ServicesOfServers[]> {
    if (jobs.length === 0) throw new Error("Jobs array is empty");
    return prisma.servicesOfServers.findMany({ where: { jobId: { in: jobs.map((job: Jobs) => job.id) } } });
}