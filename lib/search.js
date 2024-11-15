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

    stringToWordArray(string){
        let symbolRegex = /-|_|\+|=|\)|\(|\[|{|}|]|;|:|"|'|<|>|\.|,|\/|\?|\||\\|!|@|#|\$|%|\^|&|\*/g
        let workingString = string.replaceAll(symbolRegex, ' ')
        let stringArray = workingString.split(' ')
        return stringArray.filter(entry => entry.trim() != '');
    }

    async findAllMatches(query, options){
        try{
            let optionsValue = structuredClone(options)
            var startTime = process.hrtime();
            optionsValue.fields.push('hidden')
            debugPrint(options)
            let results = this.miniSearch.search(query, optionsValue)
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
                storeFields: ['filename', 'category', 'type', 'date', 'size', 'region', 'path', 'id', 'group'],
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
    async getSuggestions(query, options){
        query = query.toLowerCase()
        options.fields = ['filename', 'category'] //reduce field search
        let matches = await this.findAllMatches(query, options)
        let results = matches.items
        let suggestions = []
        for(let result = 0; result < results.length; result++){
            let currentResult = results[result]
            let fileString = String(currentResult.filename).toLowerCase()
            let categoryString = String(currentResult.category).toLowerCase()
            let fileSplit = fileString.split(query)
            let categorySplit = categoryString.split(query)
            if(fileSplit.length > 1){
                let wordSplit = this.stringToWordArray(fileSplit[1])
                let prediction = ''
                let prefixMatch = String(fileSplit[1]).substring(0,1) != ' '
                let prefixSpace = prefixMatch ? '' : ' '
                if(wordSplit.length > 1){
                    prediction = `${prefixSpace}${wordSplit[0]} ${wordSplit[1]}`
                }
                else if (wordSplit.length == 1){
                    prediction = `${prefixSpace}${wordSplit[0]}`
                }
                else {
                    //bad result discard
                    continue
                }
                suggestions.push(`${query}${prediction}`)
                continue
            }
            if(categorySplit.length > 1){
                let wordSplit = this.stringToWordArray(categorySplit[1])
                if(!wordSplit[0]){
                    wordSplit.shift()
                }
                let prediction = ''
                let prefixMatch = String(categorySplit[1]).substring(0,1) != ' '
                let prefixSpace = prefixMatch ? '' : ' '
                if(wordSplit.length > 1){
                    prediction = `${prefixSpace}${wordSplit[0]} ${wordSplit[1]}`
                }
                else if (wordSplit.length == 1){
                    prediction = `${prefixSpace}${wordSplit[0]}`
                }
                else {
                    //bad result discard
                    continue
                }
                suggestions.push(`${query}${prediction}`)
                continue
            }
        }
        let dedupe = [...new Set(suggestions)]
        let dedupeLimit = dedupe.length >= 10 ? 10 : dedupe.length
        let arr = []
        for(let x = 0; x < dedupeLimit; x++){
            arr.push({
                suggestion: dedupe[x]
            })
        }
        return arr
    }
}