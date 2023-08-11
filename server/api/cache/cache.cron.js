var cache = require('./cache.client');
var Promise = require('bluebird');

module.exports = class CacheService {
    /**
     * Get Cache from data
     * @param cacheKey 
     */
    static async getCacheData(cacheKey) {
        let team = await cache.hgetallAsync(cacheKey);
        console.log('Cached Data for : ', cacheKey);
        return team;       
    }

    /**
     * Set Data in Cache
     * @param cacheKey 
     */
    static async setCacheData(cacheKey, cacheData, timeout=90000) {
        try{
            await Promise.all([
                cache.hmsetAsync(cacheKey, cacheData), 
                cache.expire(cacheKey, timeout)
            ]);
            return Promise.resolve(cacheData);
        }catch(error){
            console.log("set Cache: ", error);
        }
        return false
    }

    /**
     * Get Cache from data(Nested JSON Data)
     * @param cacheKey 
     */
    static async getCache(cacheKey) {
        let cacheData = await cache.getAsync(cacheKey);
        console.log('Cached Data for : ', cacheKey);
        return cacheData;       
    }

    /**
     * Set Data in Cache(Nested JSON Data)
     * @param cacheKey 
     */
    static async setCache(cacheKey, cacheData, timeout=90000) {
        try{
            await Promise.all([
                cache.setAsync(cacheKey, JSON.stringify(cacheData)), 
                cache.expire(cacheKey, timeout)
            ]);
            return Promise.resolve(cacheData);
        }catch(error){
            console.log("set Cache: ", error);
        }
        return false
    }

    /**
     * Delete cache
     * @param cacheKey 
     */
    static async deleteCacheData(cacheKey) {
        try{
            let delResult = await cache.delAsync(cacheKey);
        }
        catch(error){
            console.log("Destroy Session: ", error);
        } 
    }

    /**
     * Delete all records from from Cache based on matched key pattern
     * @param keyPattern 
     */
    async deleteCache(keyPattern){
        try{
            let stream = cache.scanStream({ match: keyPattern, count: 100 });
            let pipeline = cache.pipeline();
            let localKeys = [];
            stream.on('data', function (resultKeys) {
            console.log("Data Received", localKeys.length);
            for (let i = 0; i < resultKeys.length; i++) {
                localKeys.push(resultKeys[i]);
                pipeline.del(resultKeys[i]);
            }
            if(localKeys.length > 100){
                pipeline.exec(()=>{console.log("one batch delete complete")});
                localKeys=[];
                pipeline = cache.pipeline();
            }
            });
            stream.on('end', function(){
                pipeline.exec(()=>{console.log("final batch delete complete")});
            });
            stream.on('error', function(err){
                console.log("error", err);
            })
            return true;
        }catch(error){
            console.log('Cache Deletion Error : ', error);
            return false
        }
    }

}