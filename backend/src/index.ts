import express from "express";
import cors from "cors"
import researchRouter from "./routes/research.routes.js";

const app = express();
app.use(cors());
app.use('/research',researchRouter);
app.listen(8080,()=>{
    console.log("server running on port 8080")
})

