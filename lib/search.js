import MiniSearch from 'minisearch'

export default class Searcher{
    constructor(fileArr, fields){
        this.distance = parseFloat(process.env.FUZZY_DISTANCE)
        this.minMatch = parseFloat(process.env.MIN_MATCH)
        this.createIndex(fileArr, fields)
    }

    async findAllMatches(query, options){
        try{
            var startTime = process.hrtime();
            if(process.env.DEBUG == "1"){
                console.log(options)
            }
            let results = this.miniSearch.search(query, options)
            var elapsed = this.parseHrtimeToSeconds(process.hrtime(startTime));
            return {
                items: results,
                elapsed: elapsed
            }
        }
        catch(err){
            console.error(err)
        }
    }
    
    async createIndex(fileArr, fields){
        if(!this.miniSearch){
            this.miniSearch = new MiniSearch({
                fields: fields,
                storeFields: ['filename', 'category', 'type', 'date', 'size', 'region', 'path'],
            })
            
        }
        else{
            this.miniSearch.removeAll()
        }
        this.miniSearch.addAllAsync(fileArr)
        .then( result => {
            console.log('File list indexing completed.')
            console.log(`Total terms in index: ${this.miniSearch.termCount}`)
        })
    }
    parseHrtimeToSeconds(hrtime){
        var seconds = (hrtime[0] + (hrtime[1] / 1e9)).toFixed(3);
        return seconds;
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}