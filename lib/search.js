import MiniSearch from 'minisearch'
import debugPrint from './debugprint.js'

export default class Searcher{
    constructor(fileArr, fields){
        this.distance = parseFloat(process.env.FUZZY_DISTANCE)
        this.minMatch = parseFloat(process.env.MIN_MATCH)
        this.indexing = false
        fields.push('id')
        this.fields = fields
        this.createIndex(fileArr, fields)
    }

    async findAllMatches(query, options){
        try{
            var startTime = process.hrtime();
            debugPrint(options)
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
    
    async createIndex(fileArr){
        if(!this.miniSearch){
            this.miniSearch = new MiniSearch({
                fields: this.fields,
                storeFields: ['filename', 'category', 'type', 'date', 'size', 'region', 'path', 'id'],
            })
            
        }
        else{
            this.miniSearch.removeAll()
        }
        this.indexing = true
        this.miniSearch.addAll(fileArr)
        console.log('File list indexing completed.')
        console.log(`Total terms in index: ${this.miniSearch.termCount}`)
        this.indexing = false
    }
    async updateIndex(fileArr){
        console.log('Performing Index Update.')
        for(let x = 0; x < fileArr.length; x++){
            let searchIndex = this.findIndex(x)
            if(!searchIndex){
                //add if it doesn't exist in the index
                debugPrint(`Adding index ${x}`)
                this.miniSearch.add(fileArr[x])
                continue
            }
            let changed = false
            for(let field in this.fields){
                let fieldName = this.fields[field]
                let searchField = searchIndex[fieldName]
                let fileField = fileArr[x][fieldName]
                debugPrint(`${fieldName}: ${searchField} ${fileField}`)
                if(searchField == fileField){
                    changed = true
                }
            }
            if(changed){
                debugPrint(`Updating Index ${x}`)
                this.miniSearch.replace(fileArr[x])
            }
        }
        let indexSize = this.getIndexSize()
        if(indexSize > fileArr.length){
            debugPrint(`Removing indices ${fileArr.length}-${indexSize}`)
            //clean up indices that are no longer relevant
            for(let x = fileArr.length; x < indexSize; x++){
                this.miniSearch.discard(x)
            }
        }
        console.log(`Completed index update. New Term Count: ${this.miniSearch.termCount}`)
    }
    parseHrtimeToSeconds(hrtime){
        var seconds = (hrtime[0] + (hrtime[1] / 1e9)).toFixed(3);
        return seconds;
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    findIndex(id){
        //this might be a hack
        return this.miniSearch._storedFields.get(id)
    }
    getIndexSize(){
        return this.miniSearch._storedFields.size
    }
}