
import { Jobs, Servers, ServersOfJobs } from "@prisma/client";

const s = require('./Servers');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(
    {
        // log: ["query", "info", "warn", "error"],
    },
);

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
 * Get all jobs assigned to a server
 * @param {string} ip The ip of the server
 * @returns {Promise<Jobs[]>} An array of jobs
 * @throws {Error} If the server is not in the database
 * @throws {Error} If the jobs are not found
 * @throws {Error} If a job is not found
 */
export async function getAllJobsOfNode (ip: string) : Promise<Jobs[]> {
    if (!await s.isServerInDatabase(ip)) throw new Error("Server is not in database");

    const server: Servers = (await s.getServersByIP([ip]))[0];
    const jobsId: ServersOfJobs[] = await prisma.serversOfJobs.findMany({ where: { serverId: server.id } });
    if (jobsId.length === 0) throw new Error("Server jobs not found");

    return getJobsByIds(jobsId.map((job: ServersOfJobs) => job.jobId));
}