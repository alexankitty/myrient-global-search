export default function debugPrint(string){
    if(process.env.DEBUG == "1"){
        console.log(string)
    }
}