import * as dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import Joi from 'joi';
import dayjs from 'dayjs'; 
import 'dayjs/locale/pt-br.js';

const now = dayjs.locale('pt-br')

const schema = Joi.object({
    name: Joi.string()
});



dotenv.config();
console.log(process.env.PORT);

const app = express();
app.use(express.json());
app.use(cors());
const mongoClient = new MongoClient(process.env.DATABASE_URL);
mongoClient.connect();
const db = mongoClient.db();


async function getUsers() {
    const users = await db.collection("participants").find().toArray();
    return users;
}


app.post("/participants" , async (req, res) => {
    const user = req.body;

    try {
        const value = await schema.validateAsync({name : user.name});
        const users = await getUsers();


        const userExists = users.find((u) => u.name === user.name);
        if(userExists) {
            return res.sendStatus(409);
        }
        
        user.lastStatus = Date.now();
        await db.collection("participants").insertOne(user);
        res.sendStatus(201);
    }
    catch (error) {
        res.status(422).send(error);
    }


    
})



app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
    }
);
