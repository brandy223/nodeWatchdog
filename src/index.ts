
const Network = require('./utils/Network');
const Database = require('./utils/Database');
const Timer = require('./utils/Timer');
const Services = require('./utils/Services');
const Systemctl = require('./services/BasicServices');
const ping = require('ping');
/**
 * Main function
 */
async function main (): Promise<void> {
    const ip: string = await nodeServerDatabaseInit();

    // GET ALL JOBS
    const jobs = await Database.getAllJobsOfNode(ip);
    if (jobs.length === 0) throw new Error("No jobs found");
    else
        console.log(`Jobs: ${JSON.stringify(jobs)}`);

    // // GET ALL SERVERS IP
    const servers = await Database.getServersOfJobs(jobs);
    if (servers.length === 0) throw new Error("No servers found");
    console.log(`Servers: ${JSON.stringify(servers)}`);

    // const pingWrapper = await Services.pingFunctionsInArray(servers);
    // Timer.executeTimedTask(pingWrapper, [5000], [0]);

    // const test = await Systemctl.isServiceActive({ipAddr: "192.168.10.44", user: "brandan"}, {name: "mysql"});
    // console.log(test);

    // GET ALL SERVICES
    const services = await Database.getServicesOfJobs(jobs);
    console.log(`Services: ${JSON.stringify(services)}`);

    const testWrapper = await Services.systemctlTestFunctionsInArray(
        [{
            server: {
                id: 1,
                user: "brandan",
                ipAddr: "192.168.10.44"
            },
            service: {
                id: 1,
                name: "mysql"
            }
        }]
    );
    const test = await Timer.executeTimedTask(testWrapper, [5000], [0]);
    await sleep(11000);
    Timer.clearAllIntervals(test);
}

main()

async function nodeServerDatabaseInit(): Promise<string> {
    // GET LOCAL IP
    const ip = await Network.getLocalIP();
    if (ip === undefined)  throw new Error("Could not get local IP");
    else
        console.log(`Local IP: ${ip}`);

    // VERIFY NODE EXISTS IN DATABASE
    if (!await Database.isServerInDatabase(ip)) {
        await Database.addServerToDatabase(ip, "Node", null, null);
        console.log(`Added node server to database`);
    }
    else {
        const isServerANode = await Database.isServerANode(ip);
        if(!isServerANode) {
            await Database.updateServer(ip, "Node", null, null);
        }
    }

    return ip;
}

function sleep(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}