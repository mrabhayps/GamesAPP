import sdc from 'statsd-client';

class StatsDClient {

	private host = process.env.STATSD_SERVER;
    private port = parseInt(process.env.STATSD_PORT);
    private client = null;
    private static instance: StatsDClient;
    private globalTags = [];

	private constructor() { 

	} 

	public static getInstance(): StatsDClient {
		if (!StatsDClient.instance) {
			StatsDClient.instance = new StatsDClient();
		}
		return StatsDClient.instance;
    }
    
    private isEnabled(): boolean {
        return parseInt(process.env.STATSD_ENABLED) == 1 && this.client != null;
    }

	public connect() {
		try {
			if (parseInt(process.env.STATSD_ENABLED) == 1 && !this.client) {
                // this.globalTags["env"] = process.env.NODE_ENV;
				this.client = new sdc({host: this.host, port: this.port});
			}
			console.log("Successfully connected to StatsD Daemon!");
		} catch(e) {
			console.error("Error connecting to StatsD Daemon: " + e);
		}
	}

	public getClient() {
		if (!this.client) {
			this.connect();
		}
		return StatsDClient.instance;
    }

    private getEnvMetricName(metric: string): string {
		return process.env.NODE_ENV + "." + metric;
	}
    
    public counter(metric: string, delta: number, tags?: any) {
        try {
            console.log("##### Counter inserting: #metric: " + metric + " #delta: " + delta);
            if (this.isEnabled()) {
                console.log("##### Counter inserting: AFFIRMATIVE");
                return this.client.counter(this.getEnvMetricName(metric), delta, this.getTags(tags));
            }
        } catch (error) {
            console.log("Error occured: ", error);
        }
    }

    public increment(metric: string, delta: number, tags?: any) {
        if (this.isEnabled())
            return this.client.increment(this.getEnvMetricName(metric), delta, this.getTags(tags));
    }

    public decrement(metric: string, delta: number, tags?: any) {
        if (this.isEnabled())
            return this.client.decrement(this.getEnvMetricName(metric), delta, this.getTags(tags));
    }

    public gauge(name: string, value: number, tags?: any) {
        if (this.isEnabled())
            return this.client.gauge(this.getEnvMetricName(name), value, this.getTags(tags));
    }

    public gaugeDelta(name: string, delta: number, tags?: any) {
        if (this.isEnabled())
            return this.client.gaugeDelta(this.getEnvMetricName(name), delta, this.getTags(tags));
    }

    public set(name: string, value: number, tags?: any) {
        if (this.isEnabled())
            return this.client.set(this.getEnvMetricName(name), value, this.getTags(tags));
    }

    public timing(name: string, startOrDuration: Date | number, tags?: any) {
        if (this.isEnabled())
            return this.client.timing(this.getEnvMetricName(name), startOrDuration, this.getTags(tags));
    }

    public histogram(name: string, value: number, tags?: any) {
        if (this.isEnabled())
            return this.client.histogram(this.getEnvMetricName(name), value, this.getTags(tags));
    }

    public raw(rawData: string) {
        if (this.isEnabled())
            return this.client.raw(rawData);
    }

	public close() {
		if (this.client)
			this.client.close();
    }
    
    private getTags(tags: []) {
		// for (const key in tags) {
		// 	this.globalTags[key] = tags[key];
		// }
		return this.globalTags;
	}
}

export {
	StatsDClient
}
