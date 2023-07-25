import {Jobs, Servers, ServersOfJobs, Services, ServicesOfServers} from "@prisma/client";

const { PrismaClient } = require('@prisma/client');
const Network = require('./Network');
const theme = require('./ColorScheme').theme;

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
 * Get services by ids
 * @param {number[]} ids Array ids of services
 * @returns {Promise<Services[]>} The services
 * @throws {Error} If the ids array is empty
 */
export async function getServicesById (ids: number[]) : Promise<Services[]> {
    if (ids.length === 0) throw new Error("Ids array is empty");
    return prisma.services.findMany({where: {id: {in: ids}}});
}

/**
 * Get jobs by ids
 * @param {number[]} ids Array ids of jobs
 * @returns {Promise<Jobs[]>} The jobs
 * @throws {Error} If the ids array is empty
 */
export async function getJobsByIds (ids: number[]) : Promise<Jobs[]> {
    if (ids.length === 0) throw new Error("Ids array is empty");
    return prisma.jobs.findMany({where: {id: {in: ids}}});
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
 * Get services from jobs
 * @param {Jobs[]} jobs[] An array of jobs
 * @returns {Promise<Services[]>} An array of services
 * @throws {Error} If the jobs array is empty
 */
export async function getServicesOfJobs (jobs: Jobs[]) : Promise<Services[]> {
    if (jobs.length === 0) throw new Error("Jobs array is empty");
    const servicesIds: number[] = (await getAllServersAndServicesIdsOfJobs(jobs)).map((service: ServicesOfServers) => service.serviceId);
    return getServicesByIds(servicesIds);
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

/**
 * Get a service by id
 * @param {number[]} ids The id of the service
 * @returns {Promise<Services[]>} The job
 */
export async function getServicesByIds (ids: number[]) : Promise<Services[]> {
    if (ids.length === 0) throw new Error("Ids array is empty");
    return prisma.services.findMany({ where: { id: {in: ids} } });
}

/**
 * Get all jobs assigned to a server
 * @param {string} ip The ip of the server
 * @returns {Promise<Jobs[]>} An array of jobs
 * @throws {Error} If the server is not in the database
 * @throws {Error} If the jobs are not found
 * @throws {Error} If a job is not found
 */
export async function getAllJobsOfNode (ip: string) : Promise<Jobs[]> {
    if (!await isServerInDatabase(ip)) throw new Error("Server is not in database");

    const server: Servers = (await getServersByIP([ip]))[0];
    const jobsId: ServersOfJobs[] = await prisma.serversOfJobs.findMany({ where: { serverId: server.id } });
    if (jobsId.length === 0) throw new Error("Server jobs not found");

    return getJobsByIds(jobsId.map((job: ServersOfJobs) => job.jobId));
}

/**
 * Get the current central server
 * @returns {Promise<Servers>} The central server
 * @throws {Error} If the central server is not found
 * @throws {Error} If the central server is not alive
 * @throws {Error} If the backup server is not alive
 */
export async function getCurrentCentralServer(): Promise<Servers> {
    // GET CENTRAL SERVER IP
    const centralServer: Servers[] = await getServersByType("Central");
    if (centralServer.length === 0) throw new Error("Central server not found");
    const mainServer: Servers[] = centralServer.filter((server: Servers) => server.priority === 1)
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

    const backupServer: Servers[] = centralServer.filter((server: Servers) => server.priority === 0)
    if (backupServer.length === 0) throw new Error("Backup central server not found");
    const isBackupServerAlive: string[] = await Network.pingServers([backupServer[0].ipAddr]);
    if (!isBackupServerAlive) throw new Error("Backup central server is not alive");
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
    if (!await isServerInDatabase(ip)) {
        await addServerToDatabase(ip, "Node", null, null);
        console.log(`Added node server to database`);
    }
    else {
        if(!await isServerANode(ip)) {
            await updateServer(ip, "Node", null, null);
        }
    }
    return ip;
}