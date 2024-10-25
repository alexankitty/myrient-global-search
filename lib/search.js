import MiniSearch from 'minisearch'
import debugPrint from './debugprint.js'

export default class Searcher{
    constructor(fields, stringGroups){
        this.distance = parseFloat(process.env.FUZZY_DISTANCE)
        this.minMatch = parseFloat(process.env.MIN_MATCH)
        this.indexing = false
        this.stringGroups = stringGroups
        this.fields = [...fields]
    }

    termProcessor(term){
        term = term.toLowerCase()   
        let stringArray = [term]
        stringArray.push(...Searcher.stringBreakout(term))
        for(let group in searchAlikes.StringAssoc){
            let currentGroup = searchAlikes.StringAssoc[group]
            let leadString = currentGroup[0]
            if(term == leadString){
                for(let index in currentGroup){
                    let currentString = currentGroup[index]
                    stringArray.push(...Searcher.stringBreakout(currentString))
                }
            }
        }
        return [...new Set(stringArray)]
    }   

    static stringBreakout(string){
        let symbolRegex = /-|_|\+|=|\)|\(|\[|{|}|]|;|:|"|'|<|>|\.|,|\/|\?|\||\\|!|@|#|\$|%|\^|&|\*/g
        let array = [string]
        let workingString = ''
        array.push(string.replaceAll(symbolRegex, ''))
        array.push(...string.split(' '))
        workingString = string.replaceAll(symbolRegex, ' ')
        array.push(...workingString.split(' '))
        return [...new Set(array)]
    } 

    async findAllMatches(query, options){
        try{
            var startTime = process.hrtime();
            options.fields.push('hidden')
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
                fields: [...this.fields, 'hidden'],
                storeFields: ['filename', 'category', 'type', 'date', 'size', 'region', 'path', 'id'],
                processTerm: this.termProcessor
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
        let fields = [...this.fields]
        fields.push('id')
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
            for(let field in fields){
                let fieldName = fields[field]
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
            debugPrint(`Removing indices ${fileArr.length}-${indexSize}.`)
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
    getSuggestions(query){
        return this.miniSearch.autoSuggest(query)
    }
}