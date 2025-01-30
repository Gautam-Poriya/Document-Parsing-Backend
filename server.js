const express=require('express')
const jwt=require('jsonwebtoken')
const cors=require('cors')
const admin=require('./firebaseAdmin')
const prismaclient=require('@prisma/client')

const app=express()
const prisma=new prismaclient.PrismaClient()


app.use(cors())
app.use(express.json())

const JWT_SECRET=process.env.JWT_SECRET

app.post('/signin',async(req,res)=>{
    try{
        const {token}=req.body;
        const decodedToken=await admin.auth().verifyIdToken(token)
        const {email,name,picture}=decodedToken

        let user=await prisma.user.findUnique({
            where:{
                email
            }
        })

        if(!user){
            user=await prisma.user.create({
                data:{
                    email,
                    name,
                    picture,
                   
                   
                }
            })
        }

        const jwtToken=jwt.sign({id:user.id,email},JWT_SECRET,{expiresIn:'1d'})
        res.json({token:jwtToken,user})
    }catch(error){
        console.error(error)
        res.status(401).json({error:'Invalid token'})
    }
})

//Protected route example

app.get('/home',async(req,res)=>{
    try{
        const authHeader=req.header.authorization
        if(!authHeader){
            return res.status(401).json({error:'Invalid token'})
        }

        const token=authHeader.split(" ")[1];
        const decoded=jwt.verify(token,JWT_SECRET)
        
        const user=await prisma.user.findUnique({
            where:{
                id:decoded.id
            }
        })
        if(!user){
            return res.status(401).json({error:'user not found'})
        }
        res.json({"message":"welcome",user})
    }catch(error){
        console.log(error)
        res.status(401).json({error:'Invalid token'})
    }
})



//  parsing goes here

app.listen(5000,()=>{
    console.log('Server running on port 5000')
})