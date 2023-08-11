import aws from 'aws-sdk';
//import { S3 } from "@aws-sdk/client-s3";
import * as secretConfig  from './secret.config.json';
let config:any=secretConfig;

/*const s3Client = new aws.S3({
    accessKeyId: config.awsS3.awsAccessKeyId,
    secretAccessKey: config.awsS3.awsSecretAccessKey,
    region : config.awsS3.region
});*/


const spacesEndpoint = new aws.Endpoint(config.doS3.EndPoint);

console.log(spacesEndpoint);

const s3Client = new aws.S3({
    endpoint: config.doS3.EndPoint,
    accessKeyId: config.doS3.AccessKeyId,
    secretAccessKey: config.doS3.SecretAccessKey,
    region:config.doS3.region
});


/*const s3Client = new aws.S3({
    endpoint: spacesEndpoint,
    accessKeyId: config.doS3.AccessKeyId,
    secretAccessKey: config.doS3.SecretAccessKey,
    region:"gamesapp-spaces"
    
});*/

    
/*const uploadParams = {
        Bucket: config.awsS3.bucket, 
        ACL: 'public-read',
        Key: '', // pass key
        Body: null, // pass file body
};*/


const uploadParams = {
    Bucket: config.doS3.SpaceName, 
    ACL: 'public-read',
    Key: '', // pass key
    Body: null, // pass file body
};


const s3 = {
    s3Client: s3Client,
    uploadParams: uploadParams
};
 
export default s3;
