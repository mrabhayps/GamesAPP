import nodemailer from 'nodemailer';
import * as secretConfig  from '../secret.config.json';
let config:any=secretConfig;

export class EmailService{
    async SendEmailScaledGameServer(subject,body){
        
        var transport=await nodemailer.createTransport(config['GmailTransport']);
        const message = {
            from: config.mailFrom, // Sender address
            to: config.serverMailAlerts,    // List of recipients
            subject: subject, // Subject line
            html: body
        };
        await transport.sendMail(message, function(err, info) {
            if (err) {
                console.log("Unable to send Server Scaling Email .")
                console.log(err)
            } else {
                console.log("Server Scaling Email Send Successfully.")
                console.log(info);
            }
        });
    }

    async SendServerAlertEmail(subject,body){
        
        //var transport=await nodemailer.createTransport(config.nodeMailerTransport.gameServer);
        
        var transport=await nodemailer.createTransport(config['GmailTransport']);


        const message = {
            from: config.mailFrom, // Sender address
            to: config.serverMailAlerts,    // List of recipients
            subject: "[" + config.ServerAlias+ "]" + subject, // Subject line
            html: body
        };
        await transport.sendMail(message, function(err, info) {
            if (err) {
                console.log("Unable to send Server Alert Email .")
                console.log(err)
            } else {
                console.log("Server Alert Email Send Successfully.")
                console.log(info);
            }
        });
    }
}

export default new EmailService();