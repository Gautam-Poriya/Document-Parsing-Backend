const admin=require('firebase-admin')
const serviceAccountKey=require('./serviceAccountKey.json')

admin.initializeApp({
    credential:admin.credential.cert(serviceAccountKey),
})

module.exports=admin