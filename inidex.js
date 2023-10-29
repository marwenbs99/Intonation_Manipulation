
const express = require('express')

const multer = require('multer')

const path = require('path')

const cors = require('cors')

const app = express()

const bodyparser = require('body-parser')

app.use(cors())

app.use(bodyparser.urlencoded({extended:false}))

app.use(bodyparser.json())



var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads')
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname) 
    }
  })
  
  var upload = multer({ storage: storage }).single('file');

app.use(express.static('uploads'))



app.post('/file', (req, res) => {
    upload(req, res, (err)=>{
        if(err){
          console.log(err)
          return res.status(500).json({ message: 'Erreur lors de l\'upload du fichier' });
        }
      console.log(req.file.path)
      res.json({ path: req.file.path });
    })
})
app.get('/audio-url/:filename', (req, res) => {
  const audioUrl = `http://localhost:3000/${req.params.filename}`;
  res.json({ audioUrl });
});
app.listen(3000,()=>{
    console.log("port 3000 work  !")
})