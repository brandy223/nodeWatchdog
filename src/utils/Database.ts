
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Check if a server exists in the database
 * @param ip
 * @returns {Promise<boolean>} True if the server exists in the database, false otherwise
 * @throws {Error} If the ip is null or undefined
 */
export async function isServerInDatabase (ip: string) : Promise<boolean> {
    if (ip === undefined || ip === null) throw new Error("IP is null or undefined");
    const server = await prisma.servers.findUnique({ where: { ipAddr: ip } });
    return server !== undefined && server !== null;
}

/**
 * Check if a server is a node
 * @param ip
 * @returns {Promise<boolean>} True if the server is a node, false otherwise
 * @throws {Error} If the ip is null or undefined
 * @throws {Error} If the server is not in the database
 */
export async function isServerANode (ip: string) : Promise<boolean> {
    if (ip === undefined || ip === null) throw new Error("IP is null or undefined");
    if (!await isServerInDatabase(ip)) throw new Error("Server is not in database");
    const server = await prisma.servers.findUnique({ where: { ipAddr: ip } });
    return server !== undefined && server !== null && server.type === "NODE";
}

/**
 * Get server by ip
 * @param ip
 * @returns {Promise<*>} The server
 * @throws {Error} If the ip is null or undefined
 */
export async function getServerByIP (ip: string) : Promise<any> {
    if (ip === undefined || ip === null) throw new Error("IP is null or undefined");
    return prisma.servers.findUnique({where: {ipAddr: ip}});
}

/**
 * Add a server to the database
 * @param ip
 * @returns {Promise<void>}
 * @throws {Error} If the ip is null or undefined
 * @throws {Error} If the server is already in the database
 */
export async function addServerToDatabase (ip: string) : Promise<void> {
    if (ip === undefined || ip === null) throw new Error("IP is null or undefined");
    if (await isServerInDatabase(ip)) throw new Error("Server is already in database");
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
 * @returns {Promise<void>}
 * @throws {Error} If the ip is null or undefined
 * @throws {Error} If the type is null or undefined
 * @throws {Error} If the server is not in the database
 */
export async function updateServerType (ip: string, type: string) : Promise<void> {
    if (ip === undefined || ip === null) throw new Error("IP is null or undefined");
    if (type === undefined || type === null) throw new Error("Type is null or undefined");
    if (!await isServerInDatabase(ip)) throw new Error("Server is not in database");
    await prisma.servers.update({
        where: { ipAddr: ip },
        data: { type: type }
    });
}

/**
 * Get the server designated by the job assigned to a node
 * @param job
 * @returns {Promise<*>} A server
 * @throws {Error} If the job is null or undefined
 */
export async function getServerOfJob (job: any) : Promise<any> {
    if (job === undefined || job === null) throw new Error("No jobs specified");

    const server = await prisma.servicesOfServers.findUnique({ where: { jobId: job.id } });
    const s = await prisma.servers.findUnique({ where: { id: server.serverId } });
    if (s === undefined || s === null) throw new Error("Server not found");

    return server;
}

/**
 * Get a service by id
 * @param id
 * @returns {Promise<*>} The job
 * @throws {Error} If the id is null or undefined
 */
export async function getServiceById (id: number) : Promise<any> {
    if (id === undefined || id === null) throw new Error("IP is null or undefined");
    return prisma.services.findUnique({ where: { id: id } });
}

/**
 * Get the service designated by the job assigned to a node
 * @param job
 * @returns {Promise<*>} A service
 * @throws {Error} If the job is null or undefined
 */
export async function getServiceOfJob (job: any) : Promise<any> {
    if (job === undefined || job === null) throw new Error("No job specified");

    const service = await prisma.servicesOfServers.findUnique({ where: { jobId: job.id } });
    const s = await prisma.services.findUnique({ where: { id: service.serviceId } });
    if (s === undefined || s === null) throw new Error("Service not found");

    return service;
}

/**
 * Get all jobs assigned to a node
 * @param ip
 * @returns {Promise<*>} An array of jobs
 * @throws {Error} If the ip is null or undefined
 * @throws {Error} If the server is not in the database
 * @throws {Error} If the jobs are not found
 * @throws {Error} If a job is not found
 */
export async function getAllJobsOfNode (ip: string) : Promise<any> {
    if (ip === undefined || ip === null) throw new Error("IP is null or undefined");
    if (!await isServerInDatabase(ip)) throw new Error("Server is not in database");

    const server = await getServerByIP(ip);
    const jobsId = await prisma.servicesOfServers.findMany({ where: { serverId: server.id, jobId: { not: null } } });
    if (jobsId === undefined || jobsId === null) throw new Error("Server jobs not found");

    const jobs = [];
    for (const job of jobsId) {
        const j = await prisma.jobs.findUnique({ where: { id: job.jobId } });
        if (j === undefined || j === null) throw new Error("Service not found");
        jobs.push(j);
    }
    return jobs;
}