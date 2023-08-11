import sequelize from 'sequelize';
import models from '../models/index';
import * as secretConfig  from '../../common/secret.config.json';
const config:any = secretConfig;

export class PreloginService{
    async getPreLoginLeaderboard() {
        try {
            var data = await models.sequelize.query("select id,userName as firstName,image,defaultImage,gender,mobile, winPrize, `rank` "+
                        "from gmsUsers where `rank` is not null and `rank` !=''  ORDER BY `rank` ASC LIMIT 10",
                        { type: sequelize.QueryTypes.SELECT });

            
            return data;
        }
        catch (error) {
            console.log("Error (getPreLoginLeaderboard) : ", error);
            return false;
        }
    }
}
export default new PreloginService();