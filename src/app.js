import * as dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import Joi from 'joi';
import dayjs from 'dayjs'; 
import 'dayjs/locale/pt-br.js';

const now = dayjs.locale('pt-br')

const schema = Joi.object({
    name: Joi.string(),

    message: Joi.string()
    
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
    try {
        const user = req.body;
        if(!user.name) { 
            return res.sendStatus(422);
        }
        const users = await getUsers();
        await schema.validateAsync({name : user.name});
        if(user.name === "") {
            return res.sendStatus(422);
        }
        const userExists = users.find((u) => u.name === user.name);
        if(userExists) {
            return res.sendStatus(409);
        }
        user.lastStatus = Date.now();
        let day = dayjs().format('DD/MM/YYYY');
        await db.collection("participants").insertOne(user);
        await db.collection("messages").insertOne({
            from: user.name,
            to: "Todos",
            text: "entra na sala...",
            type: "status",
            time: day
        });

        res.sendStatus(201);
    } catch (error) {
        res.status(422).send(error);
    }
});


app.get("/participants" , async (req, res) => {
    res.send(await getUsers());
})

// setInterval(async () => {
//     const users = await getUsers();
//     const now = Date.now();
//     const inactiveUsers = users.filter((u) => now - u.lastStatus > 10000);
//     if(inactiveUsers.length > 0) {
//         await db.collection("participants").deleteMany({
//             name: { $in: inactiveUsers.map((u) => u.name) }
//         });
//     }
// }, 15000);

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
    }
);
