import io from "socket.io-client";
import {stringify} from "querystring";
import {theme} from "./utils/ColorScheme";

const NodeCache = require("node-cache");
export const cache = new NodeCache({
    stdTTL: 30,
    checkperiod: 60,
    deleteOnExpire: true,
});
const Network = require('./utils/Network');
const Database = require('./utils/Database');
const Timer = require('./utils/Timer');
const Services = require('./utils/Services');

/**
 * Main function
 */
async function main (): Promise<void> {
    const ip: string = await Database.nodeServerDatabaseInit();

    // GET ALL JOBS
    let jobs = await Database.getAllJobsOfNode(ip);
    if (jobs.length === 0) throw new Error("No jobs found");
    console.log(`Jobs: ${JSON.stringify(jobs)}`);

    // GET ALL SERVERS
    let servers = await Database.getServersOfJobs(jobs);
    if (servers.length === 0) throw new Error("No servers found");
    console.log(`Servers: ${JSON.stringify(servers)}`);

    // GET ALL SERVICES
    let services = await Database.getServicesOfJobs(jobs);
    console.log(`Services: ${JSON.stringify(services)}`);

    setInterval(async () => {
        const jobs = await Database.getAllJobsOfNode(ip);
        if (jobs.length === 0) throw new Error("No jobs found");
        cache.set("jobs", jobs, 60*60)
        console.log(`Jobs: ${JSON.stringify(jobs)}`);
    }, 5*60*1000);
    setInterval(async () => {
        const jobs: any[] = cache.get("jobs");
        const servers = await Database.getServersOfJobs(jobs);
        if (servers.length === 0) throw new Error("No servers found");
        cache.set("servers", servers, 60*60)
        console.log(`Servers: ${JSON.stringify(servers)}`);
    }, 5*60*1000);
    setInterval(async () => {
        const jobs: any[] = cache.get("jobs");
        const services = await Database.getServicesOfJobs(jobs);
        cache.set("services", services, 60*60)
        console.log(`Services: ${JSON.stringify(services)}`);
    }, 5*60*1000);

    // PING SERVERS
    // const pingWrapper = await Services.pingFunctionsInArray(servers);
    // await Timer.executeTimedTask(pingWrapper, [5000], [10000]);
    //
    // const serversIps = servers.map((server: any) => server.ipAddr);
    // await Network.pingServersWithInterval(serversIps, 5000);
    //
    // setInterval(() => {
    //     console.log(cache.get("reachableServers"));
    // }, 5000);


    // const testWrapper = await Services.systemctlTestFunctionsInArray(
    //     [{
    //         server: {
    //             id: 1,
    //             user: "brandan",
    //             ipAddr: "192.168.10.44"
    //         },
    //         service: {
    //             id: 1,
    //             name: "mysql"
    //         }
    //     }]
    // );
    // const test = await Timer.executeTimedTask(testWrapper, [5000], [0]);
    // Timer.clearAllIntervals(test);

    // const socket = io(`http://${centralServer.ipAddr}:${centralServer.port}`, {
    //     reconnection: true,
    //     cors: {
    //         origin: stringify(centralServer.ipAddr),
    //         methods: ['GET', 'POST']
    //     },
    //     withCredentials: true,
    //     transports: ["polling"],
    //     allowEIO3: true, // false by default
    // });
    //
    // socket.on("error", function () {
    //     console.error(theme.error("Sorry, there seems to be an issue with the connection!"));
    // });
    //
    // socket.on("connect_error", function (err: Error) {
    //     console.error(theme.error("connection failed: " + err));
    // });
    //
    // socket.on('connect', () => {
    //     socket.emit('message', data);
    //     socket.on("broadcast", function (message: object) {
    //         // console.log(theme.error("Server's message broadcast : " + data));
    //         console.log(theme.bgWarning("Server's message broadcast :"));
    //         console.log(message);
    //         socket.close();
    //     });
    // });

    cache.on("set", (key: string, value: any[]) => {
        switch(key) {
            case "jobs":
                jobs = value;
                console.log("Jobs updated");
                break;
            case "servers":
                servers = value;
                console.log("Servers updated");
                break;
            case "services":
                services = value;
                console.log("Services updated");
                break;
        }
    });

    cache.on("expired", async (key: string) => {
        console.log(`Cache expired: ${key}`);
        const jobs = await Database.getAllJobsOfNode(ip);
        switch (key) {
            case "jobs":
                if (jobs.length === 0) throw new Error("No jobs found");
                cache.set("jobs", jobs, 60*60)
                console.log(`Jobs: ${JSON.stringify(jobs)}`);
                break;
            case "servers":
                const servers = await Database.getServersOfJobs(jobs);
                if (servers.length === 0) throw new Error("No servers found");
                cache.set("servers", servers, 60*60)
                console.log(`Servers: ${JSON.stringify(servers)}`);
                break;
            case "services":
                const services = await Database.getServicesOfJobs(jobs);
                cache.set("services", services, 60*60)
                console.log(`Services: ${JSON.stringify(services)}`);
                break;
        }
    });
}

main();