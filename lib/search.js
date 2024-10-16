import Fuse from 'fuse.js'

export default function fuzzySearch(fileArr, query){
    const leniency = parseInt(process.env.FUZZY_LENIENCY)
    const options = {
        findAllMatches: true,
        threshold: leniency,
        //ignoreLocation: true,
        includeScore: true,
        //ignoreFieldNorm: true,
        keys: ['filename']
    }
    const fuse = new Fuse(fileArr, options)
    return fuse.search(query)
}