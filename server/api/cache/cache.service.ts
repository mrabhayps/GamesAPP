import cache from './cache.client';

export class CacheService {
    /**
     * Get Cache from data
     * @param cacheKey 
     */
    static async getCacheData(cacheKey: string) {
        let team = await cache.hgetallAsync(cacheKey);
        console.log('Cached Data for Key : ', cacheKey);
        return team;
    }

    /**
     * Set Data in Cache
     * @param cacheKey 
     */
    static async setCacheData(cacheKey: string, cacheData: any, timeout = 90000) {
        try {
            await Promise.all([
                cache.hmsetAsync(cacheKey, cacheData),
                cache.expire(cacheKey, timeout)
            ]);
            return Promise.resolve(cacheData);
        } catch (error) {
            console.log("set Cache: ", error);
        }
        return false
    }

    /**
     * Get Cache from data(Nested JSON Data)
     * @param cacheKey 
     */
    static async getCache(cacheKey: string) {
        let cacheData = await cache.getAsync(cacheKey);
        console.log('Cached Data for Key : ', cacheKey);
        return JSON.parse(cacheData);
    }

    /**
     * Set Data in Cache(Nested JSON Data)
     * @param cacheKey 
     */
    static async setCache(cacheKey: string, cacheData: any, timeout = 90000) {
        try {
            await Promise.all([
                cache.setAsync(cacheKey, JSON.stringify(cacheData)),
                cache.expire(cacheKey, timeout)
            ]);
            return Promise.resolve(cacheData);
        } catch (error) {
            console.log("set Cache: ", error);
        }
        return false
    }

    /**
     * Set Persist Cache(Nested JSON Data)
     * @param cacheKey 
     * @param cacheData
     */
    static async setPersistCache(cacheKey: string, cacheData: any) {
        try {
            await Promise.all([
                cache.setAsync(cacheKey, JSON.stringify(cacheData))
            ]);
            return Promise.resolve(cacheData);
        } catch (error) {
            console.log("set Persist Cache: ", error);
        }
        return false
    }

    /**
     * Delete cache
     * @param cacheKey 
     */
    static async deleteCacheData(cacheKey: string) {
        try {
            let delResult = await cache.delAsync(cacheKey);
        }
        catch (error) {
            console.log("Destroy Session: ", error);
        }
    }

    /**
     * Delete all records from from Cache based on matched key pattern
     * @param keyPattern 
     */
    async deleteCache(keyPattern: string) {
        try {
            let stream = cache.scanStream({ match: keyPattern, count: 100 });
            let pipeline = cache.pipeline();
            let localKeys = [];
            stream.on('data', function (resultKeys) {
                console.log("Data Received", localKeys.length);
                for (let i = 0; i < resultKeys.length; i++) {
                    localKeys.push(resultKeys[i]);
                    pipeline.del(resultKeys[i]);
                }
                if (localKeys.length > 100) {
                    pipeline.exec(() => { console.log("one batch delete complete") });
                    localKeys = [];
                    pipeline = cache.pipeline();
                }
            });
            stream.on('end', function () {
                pipeline.exec(() => { console.log("final batch delete complete") });
            });
            stream.on('error', function (err) {
                console.log("error", err);
            })
            return true;
        } catch (error) {
            console.log('Cache Deletion Error : ', error);
            return false
        }
    }

}