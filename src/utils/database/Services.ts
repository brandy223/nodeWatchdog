
import { Services, Jobs, ServicesOfServers } from "@prisma/client";

const s = require('./Servers');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(
    {
        // log: ["query", "info", "warn", "error"],
    },
);

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
 * Get services from jobs
 * @param {Jobs[]} jobs[] An array of jobs
 * @returns {Promise<Services[]>} An array of services
 * @throws {Error} If the jobs array is empty
 */
export async function getServicesOfJobs (jobs: Jobs[]) : Promise<Services[]> {
    if (jobs.length === 0) throw new Error("Jobs array is empty");
    const servicesIds: number[] = (await s.getAllServersAndServicesIdsOfJobs(jobs)).map((service: ServicesOfServers) => service.serviceId);
    return getServicesByIds(servicesIds);
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