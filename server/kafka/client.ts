import { KafkaClient as Client } from 'kafka-node';


class GaKafkaClient {

	private kafkaHost = process.env.KAFKA_HOST;
	private client: Client;
	private static instance: GaKafkaClient;

	private constructor() { 

	} 

	public static getInstance(): GaKafkaClient {
		if (!GaKafkaClient.instance) {
			GaKafkaClient.instance = new GaKafkaClient();
		}

		return GaKafkaClient.instance;
	}

	public connect() {
		try {
			if (!this.client) {
				this.client = new Client({ kafkaHost: this.kafkaHost });
			}
			console.log("Successfully connected to Kafka!");
		} catch(e) {
			throw e;
		}
	}

	public getClient() {
		if (!this.client) {
			this.connect();
		}
		return this.client;
	}
}

export {
	GaKafkaClient
}
