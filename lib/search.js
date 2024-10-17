import MiniSearch from 'minisearch'

export default class Searcher{
    constructor(fileArr){
        this.distance = parseFloat(process.env.FUZZY_DISTANCE)
        this.minMatch = parseFloat(process.env.MIN_MATCH)
        this.createIndex(fileArr)
    }

    findAllMatches(query){
        var startTime = process.hrtime();
        let results = this.miniSearch.search(query, {
            filter: (result) => {
                return result.score >= this.minMatch
            }
        })
        var elapsed = this.parseHrtimeToSeconds(process.hrtime(startTime));
        return {
            items: results,
            elapsed: elapsed
        }
    }
    
    createIndex(fileArr){
        this.miniSearch = new MiniSearch({
            fields: ['name', 'category', 'type'],
            storeFields: ['name', 'category', 'type', 'date', 'size'],
            searchOptions: {
                boost: { name: 2 },
                fuzzy: this.distance,
            },
        })
        this.miniSearch.addAll(fileArr)
    }
    parseHrtimeToSeconds(hrtime){
        var seconds = (hrtime[0] + (hrtime[1] / 1e9)).toFixed(3);
        return seconds;
    }
}