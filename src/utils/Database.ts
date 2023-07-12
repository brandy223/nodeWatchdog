
const { PrismaClient } = require('@prisma/client');
const Network = require('./Network');

const prisma = new PrismaClient(
    {
        // log: ["query", "info", "warn", "error"],
    },
);

/**
 * Check if a server exists in the database
 * @param ip The ip of the server
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
 * @param ip The ip of the server
 * @returns {Promise<boolean>} True if the server is a node, false otherwise
 * @throws {Error} If the ip is null or undefined
 * @throws {Error} If the server is not in the database
 */
export async function isServerANode (ip: string) : Promise<boolean> {
    if (ip === undefined || ip === null) throw new Error("IP is null or undefined");
    const server = await prisma.servers.findUnique({ where: { ipAddr: ip } });
    if (server === undefined || server === null) throw new Error("Server is not in database");
    return server.type === "Node";
}

/**
 * Get server by ip
 * @param ip The ip of the server
 * @returns {Promise<*>} The server
 * @throws {Error} If the ip is null or undefined
 * @throws {Error} If the server is not in the database
 */
export async function getServerByIP (ip: string) : Promise<any> {
    if (ip === undefined || ip === null) throw new Error("IP is null or undefined");
    const server = prisma.servers.findUnique({where: {ipAddr: ip}});
    if (server === undefined || server === null) throw new Error("Server is not in database");
    return server;
}

/**
 * Get Node servers
 * @param type The type of the server (Central or Node)
 * @returns {Promise<*>} Array of node servers
 * @throws {Error} No node servers in the database
 */
export async function getServerByType (type: string) : Promise<any> {
    const nodeServers = await prisma.servers.findMany({where: {type: type}});
    if (nodeServers === undefined || nodeServers === null) throw new Error("No node servers in database");
    return nodeServers;
}

/**
 * Add a server to the database
 * @param ip The ip of the server
 * @param type The type of the server (CENTRAL or NODE)
 * @param port The port of the server (null if it's a node)
 * @param priority The priority of the server (null if it's a node,
 * 1 if it's the central server,0 if it's the backup central server)
 * @returns {Promise<void>}
 * @throws {Error} If the ip is null or undefined
 * @throws {Error} If the type is null or undefined
 * @throws {Error} If the server is already in the database
 */
export async function addServerToDatabase (ip: string, type: string, port: number | null, priority: null) : Promise<void> {
    if (ip === undefined || ip === null) throw new Error("IP is null or undefined");
    if (type === undefined || type === null) throw new Error("Type is null or undefined");
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
 * @param ip The ip of the server
 * @param type The type of the server (CENTRAL or NODE)
 * @param port The port of the server (null if it's a node)
 * @param priority The priority of the server (null if it's a node)
 * @returns {Promise<void>}
 * @throws {Error} If the ip is null or undefined
 * @throws {Error} If the type is null or undefined
 * @throws {Error} If the server is not in the database
 */
export async function updateServer (ip: string, type: string, port: number | null, priority: number | null) : Promise<void> {
    if (ip === undefined || ip === null) throw new Error("IP is null or undefined");
    if (type === undefined || type === null) throw new Error("Type is null or undefined");
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
 * @param jobs[] An array of jobs
 * @returns {Promise<*>} An array of servers
 * @throws {Error} If the jobs are null or undefined
 * @throws {Error} If the server is not in the database
 */
export async function getServersOfJobs (jobs: any[]) : Promise<any> {
    if (jobs === undefined || jobs === null) throw new Error("No jobs specified");
    const servers = [];
    for (const job of jobs) {
        const server = await prisma.servicesOfServers.findUnique({ where: { jobId: job.id } });
        const s = await prisma.servers.findUnique({ where: { id: server.serverId } });
        if (s === undefined || s === null) throw new Error("Server not found");
        servers.push(s);
    }
    return servers;
}

/**
 * Get services from jobs
 * @param jobs[] An array of jobs
 * @returns {Promise<*>} An array of services
 * @throws {Error} If the jobs are null or undefined
 * @throws {Error} If the service is not in the database
 */
export async function getServicesOfJobs (jobs: any[]) : Promise<any> {
    if (jobs === undefined || jobs === null) throw new Error("No jobs specified");
    const services = [];
    for (const job of jobs) {
        const service = await prisma.servicesOfServers.findUnique({ where: { jobId: job.id } });
        const s = await getServiceById(service.serviceId);
        if (s === undefined || s === null) throw new Error("Service not found");
        services.push(s);
    }
    return services;
}

/**
 * Get a service by id
 * @param id The id of the service
 * @returns {Promise<*>} The job
 * @throws {Error} If the id is null or undefined
 */
export async function getServiceById (id: number) : Promise<any> {
    if (id === undefined || id === null) throw new Error("IP is null or undefined");
    return prisma.services.findUnique({ where: { id: id } });
}

/**
 * Get all jobs assigned to a server
 * @param ip The ip of the server
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

/**
 * Get the current central server
 * @returns {Promise<*>} The central server
 * @throws {Error} If the central server is not found
 * @throws {Error} If the central server is not alive
 * @throws {Error} If the backup server is not alive
 */
export async function getCurrentCentralServer(): Promise<any> {
    // GET CENTRAL SERVER IP
    const centralServer = await getServerByType("Central");
    if (centralServer === undefined || centralServer === null) throw new Error("Central server not found");
    const mainServer = centralServer.filter((server: any) => server.priority === 1)
    console.log(`Central server IP: ${mainServer[0].ipAddr}`);

    // PING CENTRAL SERVER
    const isCentralServerAlive = await Network.ping(mainServer[0].ipAddr);
    if (isCentralServerAlive) {
        console.log(`Central server is alive`);
        return mainServer[0];
    }

    console.log(`Central server is not alive, trying to connect to backup server`);
    const backupServer = centralServer.filter((server: any) => server.priority === 0)
    const isBackupServerAlive = await Network.pingServers([backupServer[0].ipAddr]);
    if (!isBackupServerAlive) throw new Error("Backup central server is not alive");
    console.log(`Backup server: ${JSON.stringify(backupServer)}`);

    return backupServer[0];
}