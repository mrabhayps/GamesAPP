import sequelize from 'sequelize';
import models from '../models/index';

export class FavouriteGames{
    async get(condition:any){
        try{
            let data=await models.gmsFavouriteGames.findAll({
                attributes:["id","isFavourite"],
                where:condition,
                raw:true
            })
            return data;
        }
        catch(error){
            console.log("Error (Get Favourites Game) : ",error);
            return false;
        }
    }

    async put(updateData){
        try{

            let data=await models.gmsFavouriteGames.update(updateData,{
                where:{
                    id:updateData.id
                }
            });
            return data;
        }
        catch(error){
            console.log("Error (Put Favourites Game) : ",error);
            return false;
        }
    }

    async post(insertData){
        try{
            const insert=await models.gmsFavouriteGames.build(insertData).save();
            return insert;
        }
        catch(error){
            console.log("Error (Post Favourites Game) : ",error);
            return false;
        }
    }
}

export default new FavouriteGames();