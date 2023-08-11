
export class DTO<T> {

    constructor (private _dto: T) {

    }

    get dto (): T {
        return this._dto;
    }

    set dto (newDto: T) {
        this._dto = newDto;
    }
}


export class Mapper<T> {

    constructor (data: any) {
        return new DTO<T>(data);
    }

}
