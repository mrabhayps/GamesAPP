export class Utility{
    public getDateTime()
    {
        const date=new Date();
        const hour = date.getHours();
        const minutes = date.getMinutes();
        const seconds = date.getSeconds();
        const milliseconds = date.getMilliseconds();
        const d = date.getDate();
        const month = date.getMonth()+1;
        const year = date.getFullYear();

        return ((year < 10) ? '0' + year: year) +
                '-' +
                ((month < 10) ? '0' + month: month) +
                '-' +
                ((d < 10) ? '0' + d: d) +
                'T' + 
                ((hour < 10) ? '0' + hour: hour) +
                ':' +
                ((minutes < 10) ? '0' + minutes: minutes) +
                ':' +
                ((seconds < 10) ? '0' + seconds: seconds) +
                '.' +
                ('00' + milliseconds).slice(-3);
    }

    public getDate()
    {
        const date=new Date();
        const d = date.getDate();
        const month = date.getMonth()+1;
        const year = date.getFullYear();

        return ((year < 10) ? '0' + year: year) +
                '-' +
                ((month < 10) ? '0' + month: month) +
                '-' +
                ((d < 10) ? '0' + d: d) ;
    }

    public UserActivityTimeFrame(date:Date){
        return new Date(this.addMinute(date,(60-date.getMinutes()))).setSeconds(0);
    }

    public addMinute(dateTime,minute){
        let ms = 60 * minute * 1000;
        let newTime:any = new Date(dateTime).getTime() + ms;
        newTime = new Date(newTime);
        
        let finalTime =
            newTime.getFullYear() +
            '-' +
            (newTime.getMonth() +
            1 )+
            '-' +
            newTime.getDate() +
            ' ' +
            newTime.getHours() +
            ':' +
            newTime.getMinutes() +
            ':' +
            newTime.getSeconds();
        
        return finalTime;
    }
    public convertNeo4jToNodeDateTime(Neo4JDateTime){
        const { year, month, day, hour, minute, second, nanosecond } = Neo4JDateTime;
        return ((year < 10) ? '0' + year: year) +
                '-' +
                ((month < 10) ? '0' + month: month) +
                '-' +
                ((day < 10) ? '0' + day: day) +
                'T' + 
                ((hour < 10) ? '0' + hour: hour) +
                ':' +
                ((minute < 10) ? '0' + minute: minute) +
                ':' +
                ((second < 10) ? '0' + second: second) +
                '.' +
                ('00' + nanosecond);
    }

    public getDateFromDateTime(dateTime){
        let date=new Date(dateTime);
        
        const day = date.getDate();
        const month = date.getMonth()+1;
        const year = date.getFullYear();

        return ((year < 10) ? '0' + year: year) +
                '-' +
                ((month < 10) ? '0' + month: month) +
                '-' +
                ((day < 10) ? '0' + day: day) ;
    }
}

export default new Utility();