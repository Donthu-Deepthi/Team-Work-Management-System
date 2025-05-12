import mongoose from "mongoose";

const DbCon=async()=>{
    try {
        mongoose.connect(process.env.MONGDB_URL)
        console.log('Mongodb is connected')
    } catch (error) {
        console.log('mongosdb connection error',error)
    }
}
export default DbCon