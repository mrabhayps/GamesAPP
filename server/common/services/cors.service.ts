/* 
    Title  : This File is Basically used to make cors domai request 
    Author : abhay@gamesapp.com (Abhay Pratap Singh)
    Date   : December 06 2019

*/
import {response} from 'express'
import {request} from 'http';

export class CORS{
    async getRequest(host,port,path,params,headers){
        return new Promise((resolve,reject)=>{
            path=path+""+params;
            const req = request(
                {
                host: host,
                path: path,
                method: 'GET',
                port: port,
                headers: headers
                },
                response => {
                    if(response.statusCode==200){
                        const chunks=[];
                        response.on('data',(chunk)=>{
                            chunks.push(chunk);
                        });
        
                        response.on("end",()=>{
                            const data=Buffer.concat(chunks).toString();
                            
                            //console.log("Data : "+data);
                            
                            /*The data would be either json string or Non-JSON sring object
                            therefor convert it to JSON if JSON String in caller Function */
                            
                            resolve(data);
                        });  
                    }
                    else{
                        //console.log("Bad Request : "+response.statusCode);
                        reject(response.statusCode);
                    }
                }
            );
            req.end();
        }) 
    }//End Of GET Request

    async postRequest(host,port,path,params,headers)
    {

    }//End Of POST Request

    async putRequest(host,port,path,params,headers)
    {

    }//End Of PUT Request

    async deleteRequest(host,port,path,params,headers)
    {

    }//End Of DELETE Request


}

export default new CORS();