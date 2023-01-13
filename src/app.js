import * as dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import Joi from 'joi';
import dayjs from 'dayjs'; 
import 'dayjs/locale/pt-br.js';

const now = dayjs.locale('pt-br')

const schema = Joi.object({
    name: Joi.string().min(1),

    to: Joi.string().min(1),
    text: Joi.string().min(1),
    type: Joi.alternatives().conditional('type', {
        is: 'message',
        then: Joi.string().valid('message'),
        otherwise: Joi.string().valid('private_message')
    }),

    
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

app.post("/messages" , async (req, res) => {
    try {
        const message = req.body;
        const from = req.headers.user;

        if(!message.to || !message.text || !message.type) {
            return res.sendStatus(422);
        }
        if(message.type !== "message" && message.type !== "private_message") {
            return res.sendStatus(422);
        }

        let hour = dayjs().format('HH:mm:ss');
        await db.collection("messages").insertOne({
            from,
            to: message.to,
            text: message.text,
            type: message.type,
            time: hour
        });
        res.sendStatus(201);
    } catch (error) {
        res.status(422).send("deu ruim");
    }
});

app.get("/messages" , async (req, res) => {
    try {
        const limit = req.query.limit;
        const user = req.headers.user;
        const messages = await db.collection("messages").find().toArray();
        const filteredMessages = messages.filter((m) => {
            if(m.type === "message") {
                return true;
            }
            if(m.type === "private_message" && (m.from === user || m.to === user)) {
                return true;
            }
            return false;
        });
        const sortedMessages = filteredMessages.sort((a, b) => a.time - b.time);
        const limitedMessages = sortedMessages.slice(0, limit);
        res.send(limitedMessages);
    } catch (error) {
        res.sendStatus(500);
    }
});


app.get("/participants" , async (req, res) => {
    res.send(await getUsers());
})

setInterval(async () => {
    const users = await getUsers();
    const now = Date.now();
    const inactiveUsers = users.filter((u) => now - u.lastStatus > 10000);
    if(inactiveUsers.length > 0) {
        await db.collection("participants").deleteMany({
            name: { $in: inactiveUsers.map((u) => u.name) }
        });
    }
}, 15000);

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
    }
);
