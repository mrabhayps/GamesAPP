import { HighLevelProducer } from 'kafka-node';
import { GaKafkaClient } from './client';
//  import { promisify } from 'bluebird';
import { StatsDClient } from '../common/statsd.service';

class KafkaProducer {

	private producer: HighLevelProducer;
	private send: any;

	constructor() {
		this.producer = new HighLevelProducer(GaKafkaClient.getInstance().getClient());
		// this.send = promisify(this.producer.send, {context: this.producer});
	}

	public async publish(topic: string, message: string): Promise<void> {
		const payloads = [{ topic, messages: [message]}];
		// console.log(`Sending message to ${topic}: ${message}`);
        const res = await this.send(payloads);
        StatsDClient.getInstance().getClient().counter("nodeapp.kafkaproducer."+topic+".count", 1);
		// console.log("Send result: ", res);
	}
}

export default new KafkaProducer();
