const express= require('express');
const router = express.Router();
const admin = require('../firebase');   
const {PrismaClient}=require('@prisma/client'); 

// middleware for firebase token autheticate
async function verifyToken (req,res,next){
    const token = req.header.authorization?.split('')[1];
    if(!token){
        return res.status(401).json({message:"access denied"});
    }
    try{
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user=decodedToken;
        next();
    }catch(error){
        console.log(error);
        res.status(400).json({message:"invalid token"});
}
}
// google and github provider
router.get('/',(req,res)=>{
    
    res.send("welcome to lmma-cloud");

})
router.post('/auth',verifyToken,async (req,res)=>{
    const {email,name,user_id,provider}=req.body;
    try{
        let user = await Prisma.user.findeOne({
            where:{
                provided_id:user_id
            },
        });
        if(!user){
            user = await Prisma.user.create({
                data:{
                    email,
                    displayname:name || 'anonymous',
                    provided_id:user_id,
                    provider,
                }
            });

        }
        res.status(200).json({message:"user created",user});
    }catch(error){
        console.log(error);
     res.status(500).json({message:"failed to authenticate user"})   
    }
});
module.exports=router;