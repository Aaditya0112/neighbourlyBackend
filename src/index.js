import { app } from "./app.js";
import dotenv from "dotenv"
import connectDB from "./db/db-conn.js";


dotenv.config({
    path : "./.env"
});


connectDB()
    .then(async () => {
        await app.listen({port : process.env.PORT || 3000 , host : "0.0.0.0"}, () => {
            console.log(`server is running at http://localhost:${process.env.PORT} `);  
        })
    })
    .catch((err) => {
        console.log("mongoDB connection failed", err);
        
    })