import neo4j from 'neo4j-driver';
import * as neo4jConfig from './neo4jConfig.json';
class Neo4JDriver{
    private NEO4J_CONFIG:any=neo4jConfig;
    private DRIVER:any;
    constructor(){
        const URL=this.NEO4J_CONFIG.URL;
        const USER=this.NEO4J_CONFIG.USER;
        const PASSWORD=this.NEO4J_CONFIG.PASSWORD;
        try{
            this.DRIVER=neo4j.driver(URL,neo4j.auth.basic(USER,PASSWORD));
            console.log(`Neo4j Connected successfully on ${URL}  with User ${USER} and Password ${PASSWORD}`);
        }
        catch(error){
            console.log(`Failed to connect neo4j ${URL}  with User ${USER} and Password ${PASSWORD}`);
            console.log(error);
        }
    }
    public async getDriver(){
        return this.DRIVER;
    }    
    public closeDriver(){
        this.DRIVER.close();
    }
}

export default new Neo4JDriver();