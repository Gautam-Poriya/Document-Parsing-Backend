const express=require('express');
const authRoute=require('./src/routers/authRoutes.js');
const dotenv=require('dotenv');
const cors=require('cors');
const {PrismaClient}=require('@prisma/client');


dotenv.config();

const prisma = new PrismaClient();
const app=express();

app.use(cors());
app.use(express.json());


app.use('/lamma-cloud',authRoute)
const PORT=process.env.PORT || 5000;
app.listen(PORT,()=>{
    console.log(`server lisening at: http://localhost:${process.env.PORT}`);
});