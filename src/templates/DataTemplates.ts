interface Server {
    id: number;
    ip: string;
}

interface Service {
    id: number;
    name: string;
}

function toJSON(obj: any): any {
    return JSON.parse(JSON.stringify(obj));
}

export class PingTemplate {
    server: Server;
    status: string;
    pingInfo: string[];

    constructor(serverId: number, ip: string, status: string, pingInfo: string[]) {
        this.server = { id: serverId, ip };
        this.status = status;
        this.pingInfo = pingInfo;
    }

    toJSON() {
        return {
            server: toJSON(this.server),
            status: this.status,
            pingInfo: this.pingInfo
        };
    }
}

export class ServiceTestTemplate {
    service: Service;
    server: Server;
    status: string;

    constructor(serviceId: number, serviceName: string, serverId: number, ip: string, status: string) {
        this.service = { id: serviceId, name: serviceName };
        this.server = { id: serverId, ip };
        this.status = status;
    }

    toJSON() {
        return {
            service: toJSON(this.service),
            server: toJSON(this.server),
            status: this.status
        };
    }
}
